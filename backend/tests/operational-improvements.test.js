const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'jwt-secret';
process.env.ADMIN_ENROLLMENT_TOKEN_SECRET = 'enroll-secret';
process.env.TOTP_ENCRYPTION_KEY = '12345678901234567890123456789012';

const db = require('../config/db');
const { resetAdminTwoFactor } = require('../services/admin2faRecovery');
const { cleanupOldScans, getRetentionDays, DEFAULT_RETENTION_DAYS } = require('../services/qrAnalytics');

test('resetAdminTwoFactor clears 2FA state and invalidates sessions', async () => {
  const queries = [];
  const fakeDb = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [{ id: 7, email: 'admin@example.com', tokenVersion: 4 }] };
    },
  };

  const result = await resetAdminTwoFactor({ db: fakeDb, email: ' Admin@Example.com ', resetBy: 'test-runner' });

  assert.equal(result.reset, true);
  assert.equal(result.admin.email, 'admin@example.com');
  assert.equal(result.resetBy, 'test-runner');
  assert.match(queries[0].sql, /totp_enabled = FALSE/);
  assert.match(queries[0].sql, /backup_codes_hashed = '\[\]'::jsonb/);
  assert.match(queries[0].sql, /token_version = token_version \+ 1/);
  assert.deepEqual(queries[0].params, ['admin@example.com']);
});

test('resetAdminTwoFactor reports missing admin without throwing', async () => {
  const fakeDb = {
    async query() {
      return { rows: [] };
    },
  };

  const result = await resetAdminTwoFactor({ db: fakeDb, email: 'missing@example.com' });

  assert.equal(result.reset, false);
  assert.equal(result.email, 'missing@example.com');
});

test('cleanupOldScans deletes rows older than configured retention window', async () => {
  const originalQuery = db.query;
  const queries = [];
  db.query = async (sql, params) => {
    queries.push({ sql, params });
    return { rowCount: 12, rows: [] };
  };

  try {
    const result = await cleanupOldScans({ retentionDays: 90 });

    assert.equal(result.deletedCount, 12);
    assert.equal(result.retentionDays, 90);
    assert.match(queries[0].sql, /DELETE FROM qr_scans/);
    assert.match(queries[0].sql, /scanned_at < NOW\(\) - \(\$1::int \* INTERVAL '1 day'\)/);
    assert.deepEqual(queries[0].params, [90]);
  } finally {
    db.query = originalQuery;
  }
});

test('getRetentionDays defaults and validates positive integer env value', () => {
  const original = process.env.QR_ANALYTICS_RETENTION_DAYS;
  try {
    delete process.env.QR_ANALYTICS_RETENTION_DAYS;
    assert.equal(getRetentionDays(), DEFAULT_RETENTION_DAYS);

    process.env.QR_ANALYTICS_RETENTION_DAYS = '45';
    assert.equal(getRetentionDays(), 45);

    process.env.QR_ANALYTICS_RETENTION_DAYS = '0';
    assert.equal(getRetentionDays(), DEFAULT_RETENTION_DAYS);
  } finally {
    if (original === undefined) {
      delete process.env.QR_ANALYTICS_RETENTION_DAYS;
    } else {
      process.env.QR_ANALYTICS_RETENTION_DAYS = original;
    }
  }
});
