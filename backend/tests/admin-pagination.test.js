const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function createDbMock() {
  const state = { queries: [] };
  return {
    state,
    async query(sql, params = []) {
      state.queries.push({ sql, params });
      if (sql.includes('COUNT(*)::int AS total') && sql.includes('FROM businesses') && !sql.includes('JOIN')) {
        return { rows: [{ total: 30 }] };
      }
      if (sql.includes('FROM businesses') && sql.includes('ORDER BY created_at DESC')) {
        return { rows: [{ id: 1, name: 'Acme', slug: 'acme', email: 'a@example.com', verification_status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-02' }] };
      }
      if (sql.includes('COUNT(*)::int AS total') && sql.includes('FROM business_documents')) {
        return { rows: [{ total: 12 }] };
      }
      if (sql.includes('FROM business_documents bd') && sql.includes('ORDER BY bd.submitted_at DESC')) {
        return { rows: [{ id: 10, businessId: 5, businessName: 'Acme', status: 'Pending' }] };
      }
      if (sql.includes('COUNT(*)::int AS total') && sql.includes('FROM badge_requests')) {
        return { rows: [{ total: 9 }] };
      }
      if (sql.includes('FROM badge_requests br') && sql.includes('ORDER BY br.submitted_at DESC')) {
        return { rows: [{ id: 20, businessId: 5, badgeName: 'Helper', status: 'Pending' }] };
      }
      throw new Error(`Unexpected SQL in admin pagination mock: ${sql}`);
    }
  };
}

async function createServer() {
  const dbPath = require.resolve('../config/db');
  const adminAuthPath = require.resolve('../middleware/admin-auth');
  const adminPath = require.resolve('../routes/admin');
  const badgesPath = require.resolve('../routes/badges');

  const dbMock = createDbMock();
  delete require.cache[adminPath];
  delete require.cache[badgesPath];
  delete require.cache[dbPath];
  delete require.cache[adminAuthPath];

  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: dbMock };
  require.cache[adminAuthPath] = {
    id: adminAuthPath,
    filename: adminAuthPath,
    loaded: true,
    exports: { authenticateAdminToken: (req, _res, next) => { req.adminId = 1; next(); } }
  };

  const app = express();
  app.use(express.json());
  app.use('/api', require('../routes/badges'));
  app.use('/api/admin', require('../routes/admin'));

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return {
    dbState: dbMock.state,
    async get(path) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { headers: { authorization: 'Bearer test' } });
      const body = await response.json();
      return { response, body };
    },
    close() { return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))); }
  };
}

test('admin businesses returns default pagination metadata', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/admin/businesses');
    assert.equal(response.status, 200);
    assert.equal(body.total, 30);
    assert.equal(body.limit, 25);
    assert.equal(body.offset, 0);
    assert.equal(body.hasMore, true);
    assert.ok(Array.isArray(body.businesses));
    assert.deepEqual(server.dbState.queries.find((q) => q.sql.includes('ORDER BY created_at DESC')).params, [25, 0]);
  } finally { await server.close(); }
});

test('admin documents applies explicit pagination', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/admin/documents?limit=5&offset=10');
    assert.equal(response.status, 200);
    assert.equal(body.limit, 5);
    assert.equal(body.offset, 10);
    assert.equal(body.hasMore, false);
    assert.ok(Array.isArray(body.documents));
    assert.deepEqual(server.dbState.queries.find((q) => q.sql.includes('ORDER BY bd.submitted_at DESC')).params, [5, 10]);
  } finally { await server.close(); }
});

test('admin pagination rejects invalid params', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/admin/businesses?limit=abc&offset=-1');
    assert.equal(response.status, 400);
    assert.match(body.message, /limit/);
  } finally { await server.close(); }
});

test('admin badge request filters combine with pagination', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/admin/badge-requests?status=Pending&business_id=5&limit=3&offset=6');
    assert.equal(response.status, 200);
    assert.equal(body.total, 9);
    assert.equal(body.limit, 3);
    assert.equal(body.offset, 6);
    assert.ok(Array.isArray(body.badgeRequests));
    const listQuery = server.dbState.queries.find((q) => q.sql.includes('ORDER BY br.submitted_at DESC'));
    assert.match(listQuery.sql, /br\.status = \$1/);
    assert.match(listQuery.sql, /br\.business_id = \$2/);
    assert.deepEqual(listQuery.params, ['Pending', 5, 3, 6]);
  } finally { await server.close(); }
});
