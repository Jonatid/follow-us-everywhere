const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.LOCKOUT_MINUTES = '15';
process.env.MAX_FAILED_ATTEMPTS = '5';
process.env.WARN_AT_ATTEMPTS = '4';
process.env.RATE_LIMIT_WINDOW_SECONDS = '600';
process.env.RATE_LIMIT_MAX = '20';

const pool = require('../config/db');
const loginProtection = require('../services/loginProtection');

const state = {
  ip: new Map(),
  account: new Map(),
};

const makeIpKey = (routeScope, ip) => `${routeScope}:${ip}`;
const makeEmailKey = (routeScope, email) => `${routeScope}:${email}`;

const defaultQueryHandler = async (queryText, params = []) => {
  if (queryText.includes('ON CONFLICT (route_scope, ip)')) {
    const [routeScope, ip] = params;
    const key = makeIpKey(routeScope, ip);
    const current = state.ip.get(key) || 0;
    const next = current + 1;
    state.ip.set(key, next);
    return { rows: [{ fail_count: next }] };
  }

  if (queryText.includes('WHERE route_scope = $1') && queryText.includes('AND email_normalized = $2') && queryText.includes('LIMIT 1')) {
    const [routeScope, email] = params;
    const key = makeEmailKey(routeScope, email);
    const account = state.account.get(key);
    if (!account) {
      return { rows: [] };
    }
    return { rows: [{ id: 1, fail_count: account.fail_count, locked_until: account.locked_until }] };
  }

  if (queryText.includes('DELETE FROM auth_login_attempts') && queryText.includes('email_normalized = $2')) {
    const [routeScope, email] = params;
    state.account.delete(makeEmailKey(routeScope, email));
    return { rows: [] };
  }

  if (queryText.includes('ON CONFLICT (route_scope, email_normalized)')) {
    const [routeScope, email] = params;
    const key = makeEmailKey(routeScope, email);
    const current = state.account.get(key) || { fail_count: 0, locked_until: null };
    const next = current.fail_count + 1;
    const locked = next >= 5;
    const account = { fail_count: next, locked_until: locked ? new Date(Date.now() + 15 * 60 * 1000) : null };
    state.account.set(key, account);
    return { rows: [{ fail_count: next, locked_until: account.locked_until }] };
  }

  if (queryText.includes('WHERE id = $1')) {
    return { rows: [] };
  }

  throw new Error(`Unhandled query in test stub: ${queryText}`);
};

pool.query = defaultQueryHandler;
pool.connect = async () => {
  throw new Error('pool.connect not expected for default test path');
};

test('rate limit blocks after configured threshold', async () => {
  state.ip.clear();
  for (let i = 0; i < 20; i += 1) {
    const result = await loginProtection.enforceIpRateLimit({ routeScope: 'business', ip: '127.0.0.1' });
    assert.equal(result.blocked, false);
  }

  const blocked = await loginProtection.enforceIpRateLimit({ routeScope: 'business', ip: '127.0.0.1' });
  assert.equal(blocked.blocked, true);
});

test('warning on 4th, lockout on 5th, and clear on success for all scopes', async () => {
  for (const scope of ['business', 'customer', 'admin']) {
    const emailNormalized = `${scope}@example.com`;
    state.account.delete(makeEmailKey(scope, emailNormalized));

    for (let i = 1; i <= 3; i += 1) {
      const attempt = await loginProtection.recordFailedPasswordAttempt({ routeScope: scope, emailNormalized });
      assert.equal(attempt.failCount, i);
      assert.equal(attempt.warning, false);
      assert.equal(attempt.locked, false);
    }

    const warning = await loginProtection.recordFailedPasswordAttempt({ routeScope: scope, emailNormalized });
    assert.equal(warning.warning, true);
    assert.equal(warning.locked, false);

    const locked = await loginProtection.recordFailedPasswordAttempt({ routeScope: scope, emailNormalized });
    assert.equal(locked.locked, true);

    const account = await loginProtection.getAccountAttempt({ routeScope: scope, emailNormalized });
    assert.equal(loginProtection.isAccountLocked(account), true);

    await loginProtection.clearAccountFailedAttempts({ routeScope: scope, emailNormalized });
    const reset = await loginProtection.getAccountAttempt({ routeScope: scope, emailNormalized });
    assert.equal(reset, null);
  }
});

test('fallback path keeps per-ip counting when ON CONFLICT target is missing', async () => {
  const txIpState = new Map();

  pool.query = async (queryText) => {
    if (queryText.includes('ON CONFLICT (route_scope, ip)')) {
      const err = new Error('there is no unique or exclusion constraint matching the ON CONFLICT specification');
      err.code = '42P10';
      throw err;
    }
    throw new Error(`Unexpected top-level query: ${queryText}`);
  };

  pool.connect = async () => ({
    query: async (queryText, params = []) => {
      if (queryText === 'BEGIN' || queryText === 'COMMIT' || queryText === 'ROLLBACK') {
        return { rows: [] };
      }

      if (queryText.includes('pg_advisory_xact_lock')) {
        return { rows: [] };
      }

      if (queryText.includes('AND ip = $2') && queryText.includes('FOR UPDATE')) {
        const key = makeIpKey(params[0], params[1]);
        const current = txIpState.get(key);
        if (!current) {
          return { rows: [] };
        }
        return { rows: [{ id: key, fail_count: current.fail_count }] };
      }

      if (queryText.includes('VALUES ($1, $2, NULL, 1, NOW(), NULL)')) {
        const key = makeIpKey(params[0], params[1]);
        txIpState.set(key, { fail_count: 1 });
        return { rows: [] };
      }

      if (queryText.includes('UPDATE auth_login_attempts') && queryText.includes('RETURNING fail_count')) {
        const key = params[0];
        const current = txIpState.get(key);
        current.fail_count += 1;
        txIpState.set(key, current);
        return { rows: [{ fail_count: current.fail_count }] };
      }

      throw new Error(`Unexpected tx query: ${queryText}`);
    },
    release: () => {},
  });

  for (let i = 0; i < 20; i += 1) {
    const result = await loginProtection.enforceIpRateLimit({ routeScope: 'admin', ip: '10.0.0.1' });
    assert.equal(result.blocked, false);
  }

  const blocked = await loginProtection.enforceIpRateLimit({ routeScope: 'admin', ip: '10.0.0.1' });
  assert.equal(blocked.blocked, true);

  pool.query = defaultQueryHandler;
  pool.connect = async () => {
    throw new Error('pool.connect not expected for default test path');
  };
});

test('fallback path keeps per-email lockout counting when ON CONFLICT target is missing', async () => {
  const txAccountState = new Map();

  pool.query = async (queryText) => {
    if (queryText.includes('ON CONFLICT (route_scope, email_normalized)')) {
      const err = new Error('there is no unique or exclusion constraint matching the ON CONFLICT specification');
      err.code = '42P10';
      throw err;
    }
    throw new Error(`Unexpected top-level query: ${queryText}`);
  };

  pool.connect = async () => ({
    query: async (queryText, params = []) => {
      if (queryText === 'BEGIN' || queryText === 'COMMIT' || queryText === 'ROLLBACK') {
        return { rows: [] };
      }

      if (queryText.includes('pg_advisory_xact_lock')) {
        return { rows: [] };
      }

      if (queryText.includes('AND email_normalized = $2') && queryText.includes('FOR UPDATE')) {
        const key = makeEmailKey(params[0], params[1]);
        const current = txAccountState.get(key);
        if (!current) {
          return { rows: [] };
        }
        return { rows: [{ id: key, fail_count: current.fail_count }] };
      }

      if (queryText.includes('VALUES ($1, $2, NULL, 1, NOW(), NULL)') && queryText.includes('RETURNING fail_count, locked_until')) {
        const key = makeEmailKey(params[0], params[1]);
        txAccountState.set(key, { fail_count: 1, locked_until: null });
        return { rows: [{ fail_count: 1, locked_until: null }] };
      }

      if (queryText.includes('UPDATE auth_login_attempts') && queryText.includes('RETURNING fail_count, locked_until')) {
        const key = params[0];
        const current = txAccountState.get(key);
        current.fail_count += 1;
        current.locked_until = current.fail_count >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        txAccountState.set(key, current);
        return { rows: [{ fail_count: current.fail_count, locked_until: current.locked_until }] };
      }

      throw new Error(`Unexpected tx query: ${queryText}`);
    },
    release: () => {},
  });

  const email = 'fallback@example.com';
  for (let i = 1; i <= 4; i += 1) {
    const attempt = await loginProtection.recordFailedPasswordAttempt({ routeScope: 'business', emailNormalized: email, ip: '8.8.8.8' });
    assert.equal(attempt.failCount, i);
  }

  const lockedAttempt = await loginProtection.recordFailedPasswordAttempt({ routeScope: 'business', emailNormalized: email, ip: '8.8.8.8' });
  assert.equal(lockedAttempt.locked, true);

  pool.query = defaultQueryHandler;
  pool.connect = async () => {
    throw new Error('pool.connect not expected for default test path');
  };
});

test('migration includes duplicate cleanup and unique index creation for conflict targets', async () => {
  const migrationPath = path.join(__dirname, '..', 'migrations', '20261016_fix_auth_login_attempts_uniques.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migrationSql, /PARTITION BY\s+route_scope,\s*ip/i);
  assert.match(migrationSql, /PARTITION BY\s+route_scope,\s*email_normalized/i);
  assert.match(migrationSql, /DELETE FROM auth_login_attempts a[\s\S]*r\.row_rank > 1/i);

  assert.match(migrationSql, /FROM pg_indexes[\s\S]*indexname = 'auth_login_attempts_scope_ip_uq'/i);
  assert.match(migrationSql, /FROM pg_constraint[\s\S]*\(route_scope, ip\)/i);
  assert.match(migrationSql, /CREATE UNIQUE INDEX auth_login_attempts_scope_ip_uq[\s\S]*\(route_scope, ip\)/i);

  assert.match(migrationSql, /FROM pg_indexes[\s\S]*indexname = 'auth_login_attempts_scope_email_uq'/i);
  assert.match(migrationSql, /FROM pg_constraint[\s\S]*\(route_scope, email_normalized\)/i);
  assert.match(migrationSql, /CREATE UNIQUE INDEX auth_login_attempts_scope_email_uq[\s\S]*\(route_scope, email_normalized\)/i);
});

test('follow-up migration drops legacy non-partial unique constraints/indexes', async () => {
  const migrationPath = path.join(__dirname, '..', 'migrations', '20261017_drop_legacy_auth_login_attempts_uniques.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migrationSql, /DROP CONSTRAINT/i);
  assert.match(migrationSql, /UNIQUE \(route_scope, ip\)/i);
  assert.match(migrationSql, /UNIQUE \(route_scope, email_normalized\)/i);

  assert.match(migrationSql, /DROP INDEX IF EXISTS/i);
  assert.match(migrationSql, /route_scope, ip/i);
  assert.match(migrationSql, /route_scope, email_normalized/i);
});
