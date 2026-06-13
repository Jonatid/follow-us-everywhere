const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const installModule = (modulePath, exports) => {
  require.cache[modulePath] = { id: modulePath, filename: modulePath, loaded: true, exports };
};

const request = async (app, method, path, body) => {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    const parsedBody = await response.json().catch(() => null);
    return { status: response.status, body: parsedBody, headers: response.headers };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const freshApp = ({ routePath, mountPath, dbMock, emailMock, authMock, loginProtectionMock }) => {
  const dbPath = require.resolve('../config/db');
  const emailPath = require.resolve('../utils/email');
  const adminAuthPath = require.resolve('../middleware/admin-auth');
  const loginProtectionPath = require.resolve('../services/loginProtection');
  delete require.cache[routePath];
  delete require.cache[dbPath];
  delete require.cache[emailPath];
  delete require.cache[adminAuthPath];
  delete require.cache[loginProtectionPath];
  if (dbMock) installModule(dbPath, dbMock);
  if (emailMock) installModule(emailPath, emailMock);
  if (authMock) installModule(adminAuthPath, authMock);
  if (loginProtectionMock) installModule(loginProtectionPath, loginProtectionMock);

  const app = express();
  app.use(express.json());
  app.use(mountPath, require(routePath));
  return app;
};

test('support contact sends support email and reports mailer failures', async () => {
  const routePath = require.resolve('../routes/support');
  const sent = [];
  const app = freshApp({
    routePath,
    mountPath: '/support',
    emailMock: { sendEmail: async (message) => sent.push(message) },
  });

  const success = await request(app, 'POST', '/support/contact', {
    name: 'Ava', email: 'ava@example.com', business: 'Ava Co', reason: 'Upload help', message: 'Need help',
  });
  assert.equal(success.status, 200);
  assert.equal(success.body.message, 'Support request sent successfully');
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Upload help/);

  const failingApp = freshApp({
    routePath,
    mountPath: '/support',
    emailMock: { sendEmail: async () => { throw new Error('smtp down'); } },
  });
  const failure = await request(failingApp, 'POST', '/support/contact', {
    name: 'Ava', email: 'ava@example.com', business: 'Ava Co', reason: 'Upload help', message: 'Need help',
  });
  assert.equal(failure.status, 500);
  assert.equal(failure.body.message, 'Failed to send support request');
});

test('public social endpoints hide disabled businesses and links for suspended businesses', async () => {
  const routePath = require.resolve('../routes/socials');
  const links = [{ id: 1, platform: 'Instagram', url: 'https://instagram.com/acme', icon: '📷', display_order: 0, is_active: true }];
  const dbMock = {
    async connect() { return { query: dbMock.query, release: () => {} }; },
    async query(sql, params = []) {
      if (sql.includes('WHERE id = $1')) {
        if (Number(params[0]) === 1) return { rows: [{ id: 1, verification_status: 'active' }] };
        if (Number(params[0]) === 2) return { rows: [{ id: 2, verification_status: 'suspended' }] };
        return { rows: [] };
      }
      if (sql.includes('WHERE slug = $1')) return { rows: [{ id: 3, verification_status: 'disabled' }] };
      if (sql.includes('FROM social_links')) return { rows: links };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const app = freshApp({ routePath, mountPath: '/socials', dbMock });

  const active = await request(app, 'GET', '/socials/business/1');
  assert.equal(active.status, 200);
  assert.deepEqual(active.body, links);

  const suspended = await request(app, 'GET', '/socials/business/2');
  assert.equal(suspended.status, 200);
  assert.deepEqual(suspended.body, []);

  const disabled = await request(app, 'GET', '/socials/disabled-slug');
  assert.equal(disabled.status, 404);
  assert.equal(disabled.body.error, 'Business not found');
});

test('customer signup/login success and forgot-password throttle keep generic responses', async () => {
  const routePath = require.resolve('../routes/customers-auth');
  const passwordHash = await bcrypt.hash('Correct#Password123', 4);
  const queries = [];
  const sentResets = [];
  const dbMock = {
    async connect() { return { query: dbMock.query, release: () => {} }; },
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('SELECT 1 FROM customers')) return { rows: [] };
      if (sql.includes('INSERT INTO customers')) return { rows: [{ id: 8, email: params[0], first_name: params[2], last_name: params[3], token_version: 0 }] };
      if (sql.includes('password_hash') && sql.includes('FROM customers')) return { rows: [{ id: 8, email: params[0], first_name: 'Ava', last_name: 'Ng', password_hash: passwordHash, token_version: 0 }] };
      if (sql.includes('SELECT id, email, first_name FROM customers')) return { rows: [{ id: 8, email: 'ava@example.com', first_name: 'Ava' }] };
      if (sql.includes('UPDATE customer_password_resets') || sql.includes('INSERT INTO customer_password_resets')) return { rows: [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  let forgotCalls = 0;
  const loginProtectionMock = {
    ACCOUNT_LOCKOUT_MINUTES: 15,
    normalizeEmail: (value) => String(value || '').trim().toLowerCase(),
    getRequestIp: () => '127.0.0.1',
    enforceIpRateLimit: async () => ({ blocked: false }),
    getAccountAttempt: async () => null,
    isAccountLocked: () => false,
    recordFailedPasswordAttempt: async () => ({ failCount: 1, locked: false, warning: false }),
    getFailedAttemptDelay: () => 0,
    sleep: async () => {},
    clearAccountFailedAttempts: async () => {},
    enforceForgotPasswordRateLimit: async () => ({ blocked: forgotCalls++ > 0 }),
  };
  const app = freshApp({
    routePath,
    mountPath: '/customers/auth',
    dbMock,
    loginProtectionMock,
    emailMock: { sendCustomerPasswordResetEmail: async (payload) => sentResets.push(payload) },
  });

  const signup = await request(app, 'POST', '/customers/auth/signup', { email: 'ava@example.com', password: 'Correct#Password123', first_name: 'Ava', last_name: 'Ng' });
  assert.equal(signup.status, 200);
  assert.ok(signup.body.token);

  const login = await request(app, 'POST', '/customers/auth/login', { email: 'ava@example.com', password: 'Correct#Password123' });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);

  const firstForgot = await request(app, 'POST', '/customers/auth/forgot-password', { email: 'ava@example.com' });
  const throttledForgot = await request(app, 'POST', '/customers/auth/forgot-password', { email: 'ava@example.com' });
  assert.equal(firstForgot.status, 200);
  assert.equal(throttledForgot.status, 200);
  assert.equal(firstForgot.body.message, 'If an account exists for that email, we sent a reset link.');
  assert.equal(throttledForgot.body.message, firstForgot.body.message);
  assert.equal(sentResets.length, 1);
  assert.equal(queries.filter((q) => q.sql.includes('INSERT INTO customer_password_resets')).length, 1);
});

test('admin business CRUD, block, suspend, and pagination flow uses expected status updates', async () => {
  const routePath = require.resolve('../routes/admin');
  const queries = [];
  const dbMock = {
    async connect() { return { query: dbMock.query, release: () => {} }; },
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('COUNT(*)::int AS total FROM businesses')) return { rows: [{ total: 2 }] };
      if (sql.includes('FROM businesses') && sql.includes('ORDER BY created_at DESC') && sql.includes('LIMIT')) return { rows: [{ id: 10, name: 'Acme', slug: 'acme', email: 'a@example.com', verification_status: 'active' }] };
      if (sql.includes('WHERE id = $1') && sql.includes('tagline')) return { rows: [{ id: 10, name: 'Acme', slug: 'acme', tagline: '', logo: 'AC', email: 'a@example.com', verification_status: 'active' }] };
      if (sql.includes("SET verification_status = 'suspended'")) return { rows: [{ id: 10, name: 'Acme', slug: 'acme', email: 'a@example.com', verificationStatus: 'suspended' }] };
      if (sql.includes('UPDATE businesses') && sql.includes('policy_violation_code')) return { rows: [{ id: 10, name: 'Acme', slug: 'acme', email: 'a@example.com', verificationStatus: params[0], policyViolationCode: params[1] }] };
      if (sql.includes('DELETE FROM businesses')) return { rows: [{ id: 10, name: 'Acme' }] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const app = freshApp({
    routePath,
    mountPath: '/admin',
    dbMock,
    authMock: { authenticateAdminToken: (req, _res, next) => { req.adminId = 99; next(); } },
  });

  assert.equal((await request(app, 'GET', '/admin/businesses?limit=1&offset=1')).body.hasMore, false);
  assert.equal((await request(app, 'GET', '/admin/businesses/10')).body.name, 'Acme');
  assert.equal((await request(app, 'PUT', '/admin/businesses/10/block')).body.verification_status, 'suspended');
  const suspend = await request(app, 'PATCH', '/admin/reviews/businesses/10', { verification_status: 'suspended', policy_violation_code: 'POLICY', nudge_message: 'Fix profile' });
  assert.equal(suspend.body.verificationStatus, 'suspended');
  assert.equal((await request(app, 'DELETE', '/admin/businesses/10')).body.businessId, 10);
  assert.ok(queries.some((q) => q.sql.includes('suspended_at = CURRENT_TIMESTAMP')));
});

test('badge request submission and admin review award verified badge', async () => {
  const routePath = require.resolve('../routes/badges');
  const queries = [];
  const dbMock = {
    async connect() { return { query: dbMock.query, release: () => {} }; },
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
      if (sql.includes('SELECT id, name, slug, description, category FROM badges')) return { rows: [{ id: 4, name: 'Mentor', slug: 'mentor', category: 'Impact' }] };
      if (sql.includes('FROM business_documents') && sql.includes('WHERE id = $1 AND business_id = $2')) return { rows: [{ id: 11, businessId: 7, status: 'Pending' }] };
      if (sql.includes('SELECT id FROM business_badges')) return { rows: [] };
      if (sql.includes('FROM badge_requests') && sql.includes("status = 'Pending'")) return { rows: [] };
      if (sql.includes('INSERT INTO badge_requests')) return { rows: [{ id: 12, businessId: params[0], badgeId: params[1], status: 'Pending', linkedDocumentId: params[3] }] };
      if (sql.includes('SELECT id, business_id AS "businessId"') && sql.includes('FROM badge_requests')) return { rows: [{ id: 12, businessId: 7, badgeId: 4, status: 'Pending', evidenceUrl: 'https://example.com/proof', businessNotes: 'Mentoring' }] };
      if (sql.includes('UPDATE badge_requests')) return { rows: [{ id: 12, businessId: 7, badgeId: 4, status: params[0], reviewedByAdminId: params[1], adminNotes: params[2] }] };
      if (sql.includes('INSERT INTO business_badges')) return { rows: [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const routeModulePath = require.resolve('../routes/badges');
  const dbPath = require.resolve('../config/db');
  const authPath = require.resolve('../middleware/auth');
  const adminAuthPath = require.resolve('../middleware/admin-auth');
  delete require.cache[routeModulePath];
  delete require.cache[dbPath];
  delete require.cache[authPath];
  delete require.cache[adminAuthPath];
  installModule(dbPath, dbMock);
  installModule(authPath, { authenticateToken: (req, _res, next) => { req.businessId = 7; next(); } });
  installModule(adminAuthPath, { authenticateAdminToken: (req, _res, next) => { req.adminId = 99; next(); } });
  const app = express();
  app.use(express.json());
  app.use('/api', require(routePath));

  const submit = await request(app, 'POST', '/api/business/badges/request', {
    badge_id: 4,
    business_notes: 'Mentoring',
    linked_document_id: 11,
    evidence_url: 'https://example.com/proof',
    evidence_explanation: 'Shows program impact',
  });
  assert.equal(submit.status, 201);
  assert.equal(submit.body.status, 'Pending');

  const review = await request(app, 'PATCH', '/api/admin/badge-requests/12/review', { status: 'Approved', admin_notes: 'Verified proof' });
  assert.equal(review.status, 200);
  assert.equal(review.body.status, 'Approved');
  assert.ok(queries.some((q) => q.sql.includes('INSERT INTO business_badges')));
});
