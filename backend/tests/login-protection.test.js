const test = require('node:test');
const assert = require('node:assert/strict');

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

pool.query = async (queryText, params) => {
  if (queryText.includes('ON CONFLICT (route_scope, ip)')) {
    const [routeScope, ip] = params;
    const key = `${routeScope}:${ip}`;
    const current = state.ip.get(key) || 0;
    const next = current + 1;
    state.ip.set(key, next);
    return { rows: [{ fail_count: next }] };
  }

  if (queryText.includes('WHERE route_scope = $1') && queryText.includes('AND email_normalized = $2') && queryText.includes('SELECT id')) {
    const [routeScope, email] = params;
    const key = `${routeScope}:${email}`;
    const account = state.account.get(key);
    if (!account) {
      return { rows: [] };
    }
    return { rows: [{ id: 1, fail_count: account.fail_count, locked_until: account.locked_until }] };
  }

  if (queryText.includes('DELETE FROM auth_login_attempts') && queryText.includes('email_normalized = $2')) {
    const [routeScope, email] = params;
    state.account.delete(`${routeScope}:${email}`);
    return { rows: [] };
  }

  if (queryText.includes('ON CONFLICT (route_scope, email_normalized)')) {
    const [routeScope, email] = params;
    const key = `${routeScope}:${email}`;
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
    state.account.delete(`${scope}:${emailNormalized}`);

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
