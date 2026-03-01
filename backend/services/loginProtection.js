const IP_WINDOW_MINUTES = 10;
const IP_MAX_ATTEMPTS = 20;
const ACCOUNT_LOCKOUT_MINUTES = 15;
const ACCOUNT_LOCK_THRESHOLD = 5;
const ACCOUNT_WARNING_THRESHOLD = 4;
const FAILED_ATTEMPT_DELAYS_MS = [200, 400, 800, 1200, 1600];

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
    return FAILED_ATTEMPT_DELAYS_MS[0];
  }

  return FAILED_ATTEMPT_DELAYS_MS[Math.min(failedCount - 1, FAILED_ATTEMPT_DELAYS_MS.length - 1)];
};

const enforceIpRateLimit = async (client, { routeScope, ip }) => {
  const nowResult = await client.query('SELECT NOW() AS now');
  const now = nowResult.rows[0].now;

  const existingResult = await client.query(
    `SELECT id, fail_count, first_failed_at
     FROM auth_login_attempts
     WHERE route_scope = $1
       AND ip = $2
       AND email_normalized IS NULL
     FOR UPDATE`,
    [routeScope, ip]
  );

  if (existingResult.rows.length === 0) {
    await client.query(
      `INSERT INTO auth_login_attempts (route_scope, ip, email_normalized, fail_count, first_failed_at, locked_until)
       VALUES ($1, $2, NULL, 1, $3, NULL)`,
      [routeScope, ip, now]
    );
    return { blocked: false };
  }

  const ipAttempt = existingResult.rows[0];
  const windowExpired = new Date(ipAttempt.first_failed_at).getTime() <= now.getTime() - IP_WINDOW_MINUTES * 60 * 1000;

  if (windowExpired) {
    await client.query(
      `UPDATE auth_login_attempts
       SET fail_count = 1,
           first_failed_at = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [ipAttempt.id, now]
    );
    return { blocked: false };
  }

  if (ipAttempt.fail_count >= IP_MAX_ATTEMPTS) {
    return { blocked: true };
  }

  await client.query(
    `UPDATE auth_login_attempts
     SET fail_count = fail_count + 1,
         updated_at = NOW()
     WHERE id = $1`,
    [ipAttempt.id]
  );

  return { blocked: false };
};

const getAccountAttempt = async (client, { routeScope, emailNormalized }) => {
  const result = await client.query(
    `SELECT id, fail_count, first_failed_at, locked_until
     FROM auth_login_attempts
     WHERE route_scope = $1
       AND email_normalized = $2
     FOR UPDATE`,
    [routeScope, emailNormalized]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const attempt = result.rows[0];
  if (attempt.locked_until && new Date(attempt.locked_until) <= new Date()) {
    await client.query(
      `UPDATE auth_login_attempts
       SET fail_count = 0,
           first_failed_at = NULL,
           locked_until = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [attempt.id]
    );

    return {
      ...attempt,
      fail_count: 0,
      first_failed_at: null,
      locked_until: null,
    };
  }

  return attempt;
};

const clearAccountFailedAttempts = async (client, { routeScope, emailNormalized }) => {
  await client.query(
    `DELETE FROM auth_login_attempts
     WHERE route_scope = $1
       AND email_normalized = $2`,
    [routeScope, emailNormalized]
  );
};

const recordFailedPasswordAttempt = async (client, { routeScope, emailNormalized, ip }) => {
  const existingAttempt = await getAccountAttempt(client, { routeScope, emailNormalized });

  if (!existingAttempt) {
    const insertResult = await client.query(
      `INSERT INTO auth_login_attempts (route_scope, email_normalized, ip, fail_count, first_failed_at, locked_until)
       VALUES ($1, $2, $3, 1, NOW(), NULL)
       RETURNING id, fail_count, locked_until`,
      [routeScope, emailNormalized, ip]
    );

    return {
      failCount: insertResult.rows[0].fail_count,
      locked: false,
      warning: false,
    };
  }

  const nextCount = existingAttempt.fail_count + 1;
  const shouldLock = nextCount >= ACCOUNT_LOCK_THRESHOLD;

  const updateResult = await client.query(
    `UPDATE auth_login_attempts
     SET fail_count = $2,
         first_failed_at = COALESCE(first_failed_at, NOW()),
         locked_until = CASE
           WHEN $3 THEN NOW() + INTERVAL '${ACCOUNT_LOCKOUT_MINUTES} minutes'
           ELSE NULL
         END,
         ip = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING fail_count, locked_until`,
    [existingAttempt.id, nextCount, shouldLock, ip]
  );

  return {
    failCount: updateResult.rows[0].fail_count,
    locked: Boolean(updateResult.rows[0].locked_until),
    warning: nextCount === ACCOUNT_WARNING_THRESHOLD,
  };
};

const isAccountLocked = (accountAttempt) =>
  Boolean(accountAttempt?.locked_until && new Date(accountAttempt.locked_until) > new Date());

module.exports = {
  ACCOUNT_LOCKOUT_MINUTES,
  IP_MAX_ATTEMPTS,
  IP_WINDOW_MINUTES,
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
