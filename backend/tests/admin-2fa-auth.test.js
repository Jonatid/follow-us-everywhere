const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'jwt-secret';
process.env.ADMIN_ENROLLMENT_TOKEN_SECRET = 'enroll-secret';
process.env.TOTP_ENCRYPTION_KEY = '12345678901234567890123456789012';

const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const loginProtection = require('../services/loginProtection');
const admin2fa = require('../services/admin2fa');
const adminAuthRoute = require('../routes/admin-auth');

const { adminLoginHandler, adminLogoutHandler } = adminAuthRoute;

const makeReq = (body = {}) => ({
  body,
  headers: {},
  connection: { remoteAddress: '127.0.0.1' },
  ip: '127.0.0.1',
});

const makeRes = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  return response;
};

const baseAdmin = {
  id: 7,
  name: 'Admin',
  email: 'admin@example.com',
  password_hash: 'hashed-password',
  totp_enabled: false,
  totp_secret_encrypted: null,
  backup_codes_hashed: [],
  totp_last_verified_step: null,
};

const securityState = {
  failed: 0,
  cleared: 0,
};

const ipAttempts = new Map();
const emailAttempts = new Map();

loginProtection.enforceIpRateLimit = async () => ({ blocked: false });
loginProtection.getAccountAttempt = async () => null;
loginProtection.isAccountLocked = () => false;
loginProtection.getRequestIp = () => '127.0.0.1';
loginProtection.normalizeEmail = (value) => String(value || '').trim().toLowerCase();
loginProtection.getFailedAttemptDelay = () => 0;
loginProtection.sleep = async () => {};
loginProtection.recordFailedPasswordAttempt = async () => {
  securityState.failed += 1;
  return { failCount: securityState.failed, warning: false, locked: false };
};
loginProtection.clearAccountFailedAttempts = async () => {
  securityState.cleared += 1;
};

bcrypt.compare = async (incoming, stored) => incoming === 'correct-password' && stored === 'hashed-password';

let currentAdmin;
let lastBackupCodesWritten;
pool.query = async (queryText, params = []) => {
  if (queryText.includes('ON CONFLICT (route_scope, ip)')) {
    const key = `${params[0]}:${params[1]}`;
    const nextFailCount = Number(ipAttempts.get(key) || 0) + 1;
    ipAttempts.set(key, nextFailCount);
    return { rows: [{ fail_count: nextFailCount }] };
  }

  if (queryText.includes('FROM auth_login_attempts') && queryText.includes('email_normalized = $2')) {
    const key = `${params[0]}:${params[1]}`;
    const attempt = emailAttempts.get(key);
    return {
      rows: attempt
        ? [{ id: 1, fail_count: attempt.fail_count, first_failed_at: attempt.first_failed_at, locked_until: attempt.locked_until }]
        : [],
    };
  }

  if (queryText.includes('DELETE FROM auth_login_attempts') && queryText.includes('email_normalized = $2')) {
    const key = `${params[0]}:${params[1]}`;
    emailAttempts.delete(key);
    return { rows: [] };
  }

  if (queryText.includes('ON CONFLICT (route_scope, email_normalized)')) {
    const key = `${params[0]}:${params[1]}`;
    const prevFailCount = Number(emailAttempts.get(key)?.fail_count || 0);
    const nextFailCount = prevFailCount + 1;
    const nextAttempt = { fail_count: nextFailCount, first_failed_at: new Date().toISOString(), locked_until: null };
    emailAttempts.set(key, nextAttempt);
    return { rows: [{ fail_count: nextFailCount, locked_until: null }] };
  }

  if (queryText.includes('FROM admins') && queryText.includes('LOWER(email)')) {
    return { rows: currentAdmin ? [currentAdmin] : [] };
  }

  if (queryText.includes('SET totp_secret_encrypted')) {
    currentAdmin.totp_secret_encrypted = params[1];
    return { rows: [] };
  }

  if (queryText.includes('WHERE id = $1') && queryText.includes('FROM admins')) {
    return { rows: currentAdmin ? [currentAdmin] : [] };
  }

  if (queryText.includes('SET totp_enabled = TRUE')) {
    currentAdmin.totp_enabled = true;
    currentAdmin.backup_codes_hashed = JSON.parse(params[1]);
    currentAdmin.totp_last_verified_step = params[2];
    return { rows: [] };
  }

  if (queryText.startsWith('UPDATE admins SET totp_last_verified_step')) {
    currentAdmin.totp_last_verified_step = params[1];
    return { rows: [] };
  }

  if (queryText.includes('SET backup_codes_hashed')) {
    currentAdmin.backup_codes_hashed = JSON.parse(params[1]);
    lastBackupCodesWritten = currentAdmin.backup_codes_hashed;
    return { rows: [] };
  }

  if (queryText.includes('UPDATE admins') && queryText.includes('token_version = token_version + 1')) {
    currentAdmin.token_version = Number(currentAdmin.token_version || 0) + 1;
    return { rows: [] };
  }

  throw new Error(`Unhandled query: ${queryText}`);
};

test.beforeEach(() => {
  ipAttempts.clear();
  emailAttempts.clear();
  securityState.failed = 0;
  securityState.cleared = 0;
  lastBackupCodesWritten = undefined;
});

test('not enrolled admin receives requires2faEnrollment payload', async () => {
  currentAdmin = { ...baseAdmin };
  const req = makeReq({ email: currentAdmin.email, password: 'correct-password' });
  const res = makeRes();

  await adminLoginHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.requires2faEnrollment, true);
  assert.match(res.payload.enrollment.otpauthUri, /^otpauth:\/\//);
  assert.ok(res.payload.enrollment.enrollmentToken);
});

test('enrollment finalize enables totp and stores hashed backup codes', async () => {
  currentAdmin = { ...baseAdmin };
  const secret = admin2fa.generateTotpSecret();
  currentAdmin.totp_secret_encrypted = admin2fa.encryptSecret(secret);

  const code = admin2fa.createHotp(secret, Math.floor(Date.now() / 1000 / 30));
  const enrollmentToken = admin2fa.createEnrollmentToken({ adminId: currentAdmin.id });
  const req = makeReq({ enrollmentToken, totpCode: code });
  const res = makeRes();

  await adminLoginHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(currentAdmin.totp_enabled, true);
  assert.equal(Array.isArray(currentAdmin.backup_codes_hashed), true);
  assert.equal(currentAdmin.backup_codes_hashed.length, 10);
  assert.ok(currentAdmin.backup_codes_hashed[0].digest);
  assert.ok(res.payload.token);
  assert.equal(res.payload.backupCodes.length, 10);
});

test('enrolled admin without code gets requires2fa response', async () => {
  currentAdmin = {
    ...baseAdmin,
    totp_enabled: true,
    totp_secret_encrypted: admin2fa.encryptSecret(admin2fa.generateTotpSecret()),
  };
  const req = makeReq({ email: currentAdmin.email, password: 'correct-password' });
  const res = makeRes();

  await adminLoginHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.requires2fa, true);
});

test('enrolled admin with valid totp receives jwt', async () => {
  const secret = admin2fa.generateTotpSecret();
  currentAdmin = {
    ...baseAdmin,
    totp_enabled: true,
    totp_secret_encrypted: admin2fa.encryptSecret(secret),
    totp_last_verified_step: null,
  };
  const code = admin2fa.createHotp(secret, Math.floor(Date.now() / 1000 / 30));
  const req = makeReq({ email: currentAdmin.email, password: 'correct-password', totpCode: code });
  const res = makeRes();

  await adminLoginHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.payload.token);
  const tokenPayload = jwt.verify(res.payload.token, process.env.JWT_SECRET);
  assert.equal(tokenPayload.adminId, currentAdmin.id);
  assert.equal(tokenPayload.tokenVersion, Number(currentAdmin.token_version || 0));
});

test('backup code success issues jwt and marks code used; reuse is rejected', async () => {
  const secret = admin2fa.generateTotpSecret();
  const { plainCodes, hashedCodes } = admin2fa.makeBackupCodes();
  currentAdmin = {
    ...baseAdmin,
    totp_enabled: true,
    totp_secret_encrypted: admin2fa.encryptSecret(secret),
    backup_codes_hashed: hashedCodes,
  };

  const firstReq = makeReq({ email: currentAdmin.email, password: 'correct-password', backupCode: plainCodes[0] });
  const firstRes = makeRes();
  await adminLoginHandler(firstReq, firstRes);

  assert.equal(firstRes.statusCode, 200);
  assert.ok(firstRes.payload.token);
  assert.ok(lastBackupCodesWritten[0].usedAt);

  const secondReq = makeReq({ email: currentAdmin.email, password: 'correct-password', backupCode: plainCodes[0] });
  const secondRes = makeRes();
  await adminLoginHandler(secondReq, secondRes);

  assert.equal(secondRes.statusCode, 400);
  assert.equal(secondRes.payload.message, 'Invalid verification code');
});

test('admin can login with 2FA again after logout and gets a fresh token version', async () => {
  const secret = admin2fa.generateTotpSecret();
  currentAdmin = {
    ...baseAdmin,
    token_version: 0,
    totp_enabled: true,
    totp_secret_encrypted: admin2fa.encryptSecret(secret),
    totp_last_verified_step: null,
  };

  const firstCode = admin2fa.createHotp(secret, Math.floor(Date.now() / 1000 / 30));
  const firstLoginReq = makeReq({ email: currentAdmin.email, password: 'correct-password', totpCode: firstCode });
  const firstLoginRes = makeRes();
  await adminLoginHandler(firstLoginReq, firstLoginRes);

  assert.equal(firstLoginRes.statusCode, 200);
  const firstTokenPayload = jwt.verify(firstLoginRes.payload.token, process.env.JWT_SECRET);
  assert.equal(firstTokenPayload.tokenVersion, 0);

  const logoutRes = makeRes();
  await adminLogoutHandler({ adminId: currentAdmin.id }, logoutRes);
  assert.equal(logoutRes.statusCode, 200);

  const secondCode = admin2fa.createHotp(secret, Math.floor(Date.now() / 1000 / 30) + 1);
  const secondLoginReq = makeReq({ email: currentAdmin.email, password: 'correct-password', totpCode: secondCode });
  const secondLoginRes = makeRes();
  await adminLoginHandler(secondLoginReq, secondLoginRes);

  assert.equal(secondLoginRes.statusCode, 200);
  const secondTokenPayload = jwt.verify(secondLoginRes.payload.token, process.env.JWT_SECRET);
  assert.equal(secondTokenPayload.tokenVersion, 1);
});
