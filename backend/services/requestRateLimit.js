const pool = require('../config/db');
const { getRequestIp } = require('./loginProtection');
const { requestLogger } = require('../config/logger');

const WINDOW_SECONDS = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS || 600);
const UPLOAD_MAX = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 30);
const DOWNLOAD_MAX = Number(process.env.DOWNLOAD_RATE_LIMIT_MAX || 60);

const isMissingConflictTargetError = (err) => err?.code === '42P10';

const advisoryLockKey = ({ prefix, scope, identifier }) => `${prefix}:${scope}:${identifier}`;

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

const upsertIpCounter = async ({ scope, ip, windowSeconds }) => {
  try {
    const result = await pool.query(
      `INSERT INTO auth_login_attempts (route_scope, ip, email_normalized, fail_count, first_failed_at, locked_until)
       VALUES ($1, $2, NULL, 1, NOW(), NULL)
       ON CONFLICT (route_scope, ip)
       DO UPDATE SET
         fail_count = CASE
           WHEN auth_login_attempts.first_failed_at <= NOW() - ($3::int * INTERVAL '1 second') THEN 1
           ELSE auth_login_attempts.fail_count + 1
         END,
         first_failed_at = CASE
           WHEN auth_login_attempts.first_failed_at <= NOW() - ($3::int * INTERVAL '1 second') THEN NOW()
           ELSE auth_login_attempts.first_failed_at
         END,
         updated_at = NOW()
       RETURNING fail_count`,
      [scope, ip, windowSeconds]
    );

    return Number(result.rows[0].fail_count);
  } catch (err) {
    if (!isMissingConflictTargetError(err)) {
      throw err;
    }

    return runInTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        advisoryLockKey({ prefix: 'upload-ip', scope, identifier: ip }),
      ]);

      const existing = await client.query(
        `SELECT id
         FROM auth_login_attempts
         WHERE route_scope = $1 AND ip = $2 AND email_normalized IS NULL
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         LIMIT 1
         FOR UPDATE`,
        [scope, ip]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO auth_login_attempts (route_scope, ip, email_normalized, fail_count, first_failed_at, locked_until)
           VALUES ($1, $2, NULL, 1, NOW(), NULL)`,
          [scope, ip]
        );
        return 1;
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
        [existing.rows[0].id, windowSeconds]
      );

      return Number(update.rows[0].fail_count);
    });
  }
};

const upsertSubjectCounter = async ({ scope, subject, windowSeconds }) => {
  try {
    const result = await pool.query(
      `INSERT INTO auth_login_attempts (route_scope, email_normalized, ip, fail_count, first_failed_at, locked_until)
       VALUES ($1, $2, NULL, 1, NOW(), NULL)
       ON CONFLICT (route_scope, email_normalized)
       DO UPDATE SET
         fail_count = CASE
           WHEN auth_login_attempts.first_failed_at <= NOW() - ($3::int * INTERVAL '1 second') THEN 1
           ELSE auth_login_attempts.fail_count + 1
         END,
         first_failed_at = CASE
           WHEN auth_login_attempts.first_failed_at <= NOW() - ($3::int * INTERVAL '1 second') THEN NOW()
           ELSE auth_login_attempts.first_failed_at
         END,
         updated_at = NOW()
       RETURNING fail_count`,
      [scope, subject, windowSeconds]
    );

    return Number(result.rows[0].fail_count);
  } catch (err) {
    if (!isMissingConflictTargetError(err)) {
      throw err;
    }

    return runInTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        advisoryLockKey({ prefix: 'upload-subject', scope, identifier: subject }),
      ]);

      const existing = await client.query(
        `SELECT id
         FROM auth_login_attempts
         WHERE route_scope = $1 AND email_normalized = $2
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         LIMIT 1
         FOR UPDATE`,
        [scope, subject]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO auth_login_attempts (route_scope, email_normalized, ip, fail_count, first_failed_at, locked_until)
           VALUES ($1, $2, NULL, 1, NOW(), NULL)`,
          [scope, subject]
        );
        return 1;
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
        [existing.rows[0].id, windowSeconds]
      );

      return Number(update.rows[0].fail_count);
    });
  }
};

const enforceEndpointRateLimit = ({ routeScope, maxAttempts }) => async (req, res, next) => {
  try {
    const ip = getRequestIp(req);
    const subject = req.auth ? `${req.auth.role}:${req.auth.id}` : 'anonymous';

    const [ipCount, subjectCount] = await Promise.all([
      upsertIpCounter({ scope: `${routeScope}:ip`, ip, windowSeconds: WINDOW_SECONDS }),
      upsertSubjectCounter({ scope: `${routeScope}:subject`, subject, windowSeconds: WINDOW_SECONDS }),
    ]);

    if (ipCount > maxAttempts || subjectCount > maxAttempts) {
      requestLogger(req).warn({ routeScope, ipCount, subjectCount, maxAttempts }, 'Rate limit triggered');
      return res.status(429).json({ message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
    }

    return next();
  } catch (error) {
    requestLogger(req).error({ err: error, routeScope }, 'Endpoint rate limit error');
    return res.status(500).json({ message: 'Unable to process request', code: 'RATE_LIMIT_ERROR' });
  }
};

const uploadRateLimit = enforceEndpointRateLimit({ routeScope: 'asset-upload', maxAttempts: UPLOAD_MAX });
const downloadRateLimit = enforceEndpointRateLimit({ routeScope: 'asset-download', maxAttempts: DOWNLOAD_MAX });

module.exports = {
  downloadRateLimit,
  uploadRateLimit,
};
