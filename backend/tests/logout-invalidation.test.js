const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { authenticateCustomerToken } = require('../middleware/customer-auth');
const { authenticateAdminToken } = require('../middleware/admin-auth');
const { businessLogoutHandler } = require('../routes/auth');
const { customerLogoutHandler } = require('../routes/customers-auth');
const { adminLogoutHandler } = require('../routes/admin-auth');

const SESSION_EXPIRED_RESPONSE = { message: 'Session expired. Please sign in again.' };

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const runMiddleware = (middleware, req) =>
  new Promise((resolve) => {
    const res = makeRes();
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
      resolve({ res, nextCalled });
    });

    setTimeout(() => resolve({ res, nextCalled }), 20);
  });

const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

const versions = {
  business: 0,
  customer: 0,
  admin: 0,
};

const db = {
  businesses: { 11: versions.business },
  customers: { 22: versions.customer },
  admins: { 33: versions.admin },
};

pool.query = async (queryText, params = []) => {
  if (queryText.includes('SELECT id, token_version FROM businesses')) {
    const id = params[0];
    return { rows: db.businesses[id] === undefined ? [] : [{ id, token_version: db.businesses[id] }] };
  }

  if (queryText.includes('SELECT id, token_version FROM customers')) {
    const id = params[0];
    return { rows: db.customers[id] === undefined ? [] : [{ id, token_version: db.customers[id] }] };
  }

  if (queryText.includes('SELECT id, token_version FROM admins')) {
    const id = params[0];
    return { rows: db.admins[id] === undefined ? [] : [{ id, token_version: db.admins[id] }] };
  }

  if (queryText.includes('UPDATE businesses') && queryText.includes('token_version = token_version + 1')) {
    const id = params[0];
    db.businesses[id] = (db.businesses[id] ?? 0) + 1;
    return { rows: [] };
  }

  if (queryText.includes('UPDATE customers') && queryText.includes('token_version = token_version + 1')) {
    const id = params[0];
    db.customers[id] = (db.customers[id] ?? 0) + 1;
    return { rows: [] };
  }

  if (queryText.includes('UPDATE admins') && queryText.includes('token_version = token_version + 1')) {
    const id = params[0];
    db.admins[id] = (db.admins[id] ?? 0) + 1;
    return { rows: [] };
  }

  throw new Error(`Unhandled query: ${queryText}`);
};

test.beforeEach(() => {
  db.businesses[11] = 0;
  db.customers[22] = 0;
  db.admins[33] = 0;
});

test('A/B/E: token works before logout and is rejected after business logout', async () => {
  const token = signToken({ businessId: 11, tokenVersion: 0 });
  const reqBefore = { headers: { authorization: `Bearer ${token}` } };
  const beforeResult = await runMiddleware(authenticateToken, reqBefore);
  assert.equal(beforeResult.nextCalled, true);

  const logoutRes = makeRes();
  await businessLogoutHandler({ businessId: 11 }, logoutRes);
  assert.equal(logoutRes.statusCode, 200);
  assert.deepEqual(logoutRes.body, { message: 'Logged out successfully.' });

  const reqAfter = { headers: { authorization: `Bearer ${token}` } };
  const afterResult = await runMiddleware(authenticateToken, reqAfter);
  assert.equal(afterResult.nextCalled, false);
  assert.equal(afterResult.res.statusCode, 403);
  assert.deepEqual(afterResult.res.body, SESSION_EXPIRED_RESPONSE);
});

test('C: customer logout invalidates the existing customer token', async () => {
  const token = signToken({ customerId: 22, tokenVersion: 0 });

  const beforeResult = await runMiddleware(authenticateCustomerToken, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(beforeResult.nextCalled, true);

  const logoutRes = makeRes();
  await customerLogoutHandler({ customerId: 22 }, logoutRes);
  assert.equal(logoutRes.statusCode, 200);

  const afterResult = await runMiddleware(authenticateCustomerToken, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(afterResult.nextCalled, false);
  assert.equal(afterResult.res.statusCode, 403);
  assert.deepEqual(afterResult.res.body, SESSION_EXPIRED_RESPONSE);
});

test('D: admin logout invalidates the existing admin token', async () => {
  const token = signToken({ adminId: 33, tokenVersion: 0 });

  const beforeResult = await runMiddleware(authenticateAdminToken, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(beforeResult.nextCalled, true);

  const logoutRes = makeRes();
  await adminLogoutHandler({ adminId: 33 }, logoutRes);
  assert.equal(logoutRes.statusCode, 200);

  const afterResult = await runMiddleware(authenticateAdminToken, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(afterResult.nextCalled, false);
  assert.equal(afterResult.res.statusCode, 403);
  assert.deepEqual(afterResult.res.body, SESSION_EXPIRED_RESPONSE);
});
