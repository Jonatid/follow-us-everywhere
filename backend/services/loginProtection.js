const pool = require('../config/db');

const ACCOUNT_LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES || 15);
const ACCOUNT_LOCK_THRESHOLD = Number(process.env.MAX_FAILED_ATTEMPTS || 5);
const ACCOUNT_WARNING_THRESHOLD = Number(process.env.WARN_AT_ATTEMPTS || 4);
const RATE_LIMIT_WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 600);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const BASE_BACKOFF_MS = 200;
const MAX_BACKOFF_MS = 2500;

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const sleep = async (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getFailedAttemptDelay = (failedCount) => {
  if (!failedCount || failedCount < 1) {
    return BASE_BACKOFF_MS;
  }

  return Math.min(BASE_BACKOFF_MS * 2 ** (failedCount - 1), MAX_BACKOFF_MS);
};

const isMissingConflictTargetError = (err) => err?.code === '42P10';

const runInTransaction = async (work) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const advisoryLockKey = ({ prefix, routeScope, identifier }) => `${prefix}:${routeScope}:${identifier}`;

const enforceIpRateLimit = async ({ routeScope, ip }) => {
  try {
    const result = await pool.query(
      `INSERT INTO auth_login_attempts (route_scope, ip, email_normalized, fail_count, first_failed_at, locked_until)
       VALUES ($1, $2, NULL, 1, NOW(), NULL)
       ON CONFLICT (route_scope, ip)
       DO UPDATE SET
         fail_count = CASE
           WHEN auth_login_attempts.first_failed_at <= NOW() - ($3::int * INTERVAL '1 second')
             THEN 1
           ELSE auth_login_attempts.fail_count + 1
         END,
         first_failed_at = CASE
           WHEN auth_login_attempts.first_failed_at <= NOW() - ($3::int * INTERVAL '1 second')
             THEN NOW()
           ELSE auth_login_attempts.first_failed_at
         END,
         updated_at = NOW()
       RETURNING fail_count`,
      [routeScope, ip, RATE_LIMIT_WINDOW_SECONDS]
    );

    return { blocked: result.rows[0].fail_count > RATE_LIMIT_MAX };
  } catch (err) {
    if (!isMissingConflictTargetError(err)) {
      throw err;
    }

    return runInTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        advisoryLockKey({ prefix: 'ip', routeScope, identifier: ip }),
      ]);

      const existing = await client.query(
        `SELECT id, fail_count, first_failed_at
         FROM auth_login_attempts
         WHERE route_scope = $1
           AND ip = $2
           AND email_normalized IS NULL
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         LIMIT 1
         FOR UPDATE`,
        [routeScope, ip]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO auth_login_attempts (route_scope, ip, email_normalized, fail_count, first_failed_at, locked_until)
           VALUES ($1, $2, NULL, 1, NOW(), NULL)`,
          [routeScope, ip]
        );
        return { blocked: false };
      }

      const update = await client.query(
        `UPDATE auth_login_attempts
         SET fail_count = CASE
               WHEN first_failed_at <= NOW() - ($2::int * INTERVAL '1 second') THEN 1
               ELSE fail_count + 1
             END,
             first_failed_at = CASE
               WHEN first_failed_at <= NOW() - ($2::int * INTERVAL '1 second') THEN NOW()
               ELSE first_failed_at
             END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING fail_count`,
        [existing.rows[0].id, RATE_LIMIT_WINDOW_SECONDS]
      );

      return { blocked: update.rows[0].fail_count > RATE_LIMIT_MAX };
    });
  }
};

const getAccountAttempt = async ({ routeScope, emailNormalized }) => {
  const result = await pool.query(
    `SELECT id, fail_count, first_failed_at, locked_until
     FROM auth_login_attempts
     WHERE route_scope = $1
       AND email_normalized = $2
     ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [routeScope, emailNormalized]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const attempt = result.rows[0];
  if (attempt.locked_until && new Date(attempt.locked_until) <= new Date()) {
    await pool.query(
      `DELETE FROM auth_login_attempts
       WHERE route_scope = $1
         AND email_normalized = $2`,
      [routeScope, emailNormalized]
    );

    return { fail_count: 0, locked_until: null };
  }

  return attempt;
};

const clearAccountFailedAttempts = async ({ routeScope, emailNormalized }) => {
  await pool.query(
    `DELETE FROM auth_login_attempts
     WHERE route_scope = $1
       AND email_normalized = $2`,
    [routeScope, emailNormalized]
  );
};

const recordFailedPasswordAttempt = async ({ routeScope, emailNormalized, ip = null }) => {
  try {
    const result = await pool.query(
      `INSERT INTO auth_login_attempts (route_scope, email_normalized, ip, fail_count, first_failed_at, locked_until)
       VALUES ($1, $2, $3, 1, NOW(), NULL)
       ON CONFLICT (route_scope, email_normalized)
       DO UPDATE SET
         fail_count = auth_login_attempts.fail_count + 1,
         locked_until = CASE
           WHEN auth_login_attempts.fail_count + 1 >= $4
             THEN NOW() + ($5::int * INTERVAL '1 minute')
           ELSE NULL
         END,
         ip = EXCLUDED.ip,
         updated_at = NOW()
       RETURNING fail_count, locked_until`,
      [routeScope, emailNormalized, ip, ACCOUNT_LOCK_THRESHOLD, ACCOUNT_LOCKOUT_MINUTES]
    );

    const failCount = Number(result.rows[0].fail_count);

    return {
      failCount,
      locked: Boolean(result.rows[0].locked_until),
      warning: failCount === ACCOUNT_WARNING_THRESHOLD,
    };
  } catch (err) {
    if (!isMissingConflictTargetError(err)) {
      throw err;
    }

    return runInTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        advisoryLockKey({ prefix: 'email', routeScope, identifier: emailNormalized }),
      ]);

      const existing = await client.query(
        `SELECT id, fail_count
         FROM auth_login_attempts
         WHERE route_scope = $1
           AND email_normalized = $2
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         LIMIT 1
         FOR UPDATE`,
        [routeScope, emailNormalized]
      );

      let result;
      if (existing.rows.length === 0) {
        result = await client.query(
          `INSERT INTO auth_login_attempts (route_scope, email_normalized, ip, fail_count, first_failed_at, locked_until)
           VALUES ($1, $2, $3, 1, NOW(), NULL)
           RETURNING fail_count, locked_until`,
          [routeScope, emailNormalized, ip]
        );
      } else {
        result = await client.query(
          `UPDATE auth_login_attempts
           SET fail_count = fail_count + 1,
               locked_until = CASE
                 WHEN fail_count + 1 >= $2
                   THEN NOW() + ($3::int * INTERVAL '1 minute')
                 ELSE NULL
               END,
               ip = $4,
               updated_at = NOW()
           WHERE id = $1
           RETURNING fail_count, locked_until`,
          [existing.rows[0].id, ACCOUNT_LOCK_THRESHOLD, ACCOUNT_LOCKOUT_MINUTES, ip]
        );
      }

      const failCount = Number(result.rows[0].fail_count);
      return {
        failCount,
        locked: Boolean(result.rows[0].locked_until),
        warning: failCount === ACCOUNT_WARNING_THRESHOLD,
      };
    });
  }
};

const isAccountLocked = (accountAttempt) =>
  Boolean(accountAttempt?.locked_until && new Date(accountAttempt.locked_until) > new Date());

module.exports = {
  ACCOUNT_LOCKOUT_MINUTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SECONDS,
  clearAccountFailedAttempts,
  enforceIpRateLimit,
  getAccountAttempt,
  getFailedAttemptDelay,
  getRequestIp,
  isAccountLocked,
  normalizeEmail,
  recordFailedPasswordAttempt,
  sleep,
};
