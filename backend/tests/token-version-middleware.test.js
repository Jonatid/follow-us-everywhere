const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { authenticateCustomerToken } = require('../middleware/customer-auth');
const { authenticateAdminToken } = require('../middleware/admin-auth');
const { authenticatePrivilegedUser } = require('../middleware/privileged-auth');

const makeRes = () => ({
  statusCode: null,
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

const runMiddleware = (middleware, req) => new Promise((resolve) => {
  const res = makeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
    resolve({ res, nextCalled });
  });
  setTimeout(() => resolve({ res, nextCalled }), 20);
});

const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

let queryStub;

test.beforeEach(() => {
  queryStub = async (queryText, params = []) => {
    if (queryText.includes('FROM businesses')) {
      return { rows: [{ id: params[0], token_version: 0 }] };
    }

    if (queryText.includes('FROM customers')) {
      return { rows: [{ id: params[0], token_version: 0 }] };
    }

    if (queryText.includes('FROM admins')) {
      return { rows: [{ id: params[0], token_version: 0 }] };
    }

    throw new Error(`Unhandled query: ${queryText}`);
  };

  pool.query = async (...args) => queryStub(...args);
});

test('A: valid token with matching DB token_version is accepted', async () => {
  const token = signToken({ businessId: 12, tokenVersion: 0 });
  const req = { headers: { authorization: `Bearer ${token}` } };

  const { res, nextCalled } = await runMiddleware(authenticateToken, req);

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.equal(req.businessId, 12);
});

test('B: valid token with mismatched DB token_version is rejected', async () => {
  queryStub = async (queryText, params = []) => {
    if (queryText.includes('FROM businesses')) {
      return { rows: [{ id: params[0], token_version: 9 }] };
    }
    throw new Error(`Unhandled query: ${queryText}`);
  };

  const token = signToken({ businessId: 12, tokenVersion: 0 });
  const req = { headers: { authorization: `Bearer ${token}` } };

  const { res, nextCalled } = await runMiddleware(authenticateToken, req);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { message: 'Session expired. Please sign in again.' });
});

test('C: token missing tokenVersion is rejected', async () => {
  const token = signToken({ businessId: 55 });
  const req = { headers: { authorization: `Bearer ${token}` } };

  const { res, nextCalled } = await runMiddleware(authenticateToken, req);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { message: 'Session expired. Please sign in again.' });
});

test('D: business/customer/admin middleware all enforce version checks', async () => {
  const businessReq = { headers: { authorization: `Bearer ${signToken({ businessId: 1, tokenVersion: 0 })}` } };
  const customerReq = { headers: { authorization: `Bearer ${signToken({ customerId: 2, tokenVersion: 0 })}` } };
  const adminReq = { headers: { authorization: `Bearer ${signToken({ adminId: 3, tokenVersion: 0 })}` } };

  const businessResult = await runMiddleware(authenticateToken, businessReq);
  const customerResult = await runMiddleware(authenticateCustomerToken, customerReq);
  const adminResult = await runMiddleware(authenticateAdminToken, adminReq);

  assert.equal(businessResult.nextCalled, true);
  assert.equal(customerResult.nextCalled, true);
  assert.equal(adminResult.nextCalled, true);

  queryStub = async (queryText, params = []) => {
    if (queryText.includes('FROM businesses')) return { rows: [{ id: params[0], token_version: 1 }] };
    if (queryText.includes('FROM customers')) return { rows: [{ id: params[0], token_version: 1 }] };
    if (queryText.includes('FROM admins')) return { rows: [{ id: params[0], token_version: 1 }] };
    throw new Error(`Unhandled query: ${queryText}`);
  };

  const businessReject = await runMiddleware(authenticateToken, businessReq);
  const customerReject = await runMiddleware(authenticateCustomerToken, customerReq);
  const adminReject = await runMiddleware(authenticateAdminToken, adminReq);

  assert.equal(businessReject.res.statusCode, 403);
  assert.equal(customerReject.res.statusCode, 403);
  assert.equal(adminReject.res.statusCode, 403);
});

test('E: privileged middleware accepts valid business/admin tokens and rejects missing tokenVersion', async () => {
  const businessReq = { headers: { authorization: `Bearer ${signToken({ businessId: 44, tokenVersion: 0 })}` } };
  const adminReq = { headers: { authorization: `Bearer ${signToken({ adminId: 99, tokenVersion: 0 })}` } };

  const businessResult = await runMiddleware(authenticatePrivilegedUser, businessReq);
  const adminResult = await runMiddleware(authenticatePrivilegedUser, adminReq);

  assert.equal(businessResult.nextCalled, true);
  assert.equal(adminResult.nextCalled, true);
  assert.deepEqual(businessReq.auth, { role: 'business', id: '44' });
  assert.deepEqual(adminReq.auth, { role: 'admin', id: '99' });

  const oldTokenReq = { headers: { authorization: `Bearer ${signToken({ businessId: 44 })}` } };
  const oldTokenResult = await runMiddleware(authenticatePrivilegedUser, oldTokenReq);
  assert.equal(oldTokenResult.nextCalled, false);
  assert.equal(oldTokenResult.res.statusCode, 403);
  assert.deepEqual(oldTokenResult.res.body, { message: 'Session expired. Please sign in again.' });
});
