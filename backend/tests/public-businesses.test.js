const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function createDbMock() {
  const state = {
    countSqls: [],
    listSqls: [],
    countParams: [],
    listParams: [],
  };

  return {
    state,
    async query(sql, params = []) {
      if (sql.includes('FROM information_schema.columns')) {
        return {
          rows: [
            { column_name: 'verification_status' },
            { column_name: 'community_support_text' }
          ]
        };
      }

      if (sql.includes('FROM information_schema.tables')) {
        return {
          rows: [
            { table_name: 'business_badges' },
            { table_name: 'badges' }
          ]
        };
      }

      if (sql.includes('COUNT(DISTINCT b.id)')) {
        state.countSqls.push(sql);
        state.countParams.push(params);
        return { rows: [{ total: '3' }] };
      }

      if (sql.includes('FROM businesses b')) {
        state.listSqls.push(sql);
        state.listParams.push(params);
        return {
          rows: [
            {
              id: 1,
              name: 'Acme Co',
              slug: 'acme-co',
              tagline: 'Hello',
              verification_status: 'active',
              community_support_text: null,
              badges: []
            },
            {
              id: 2,
              name: 'Beta Co',
              slug: 'beta-co',
              tagline: 'World',
              verification_status: 'active',
              community_support_text: null,
              badges: []
            },
            {
              id: 3,
              name: 'Gamma Co',
              slug: 'gamma-co',
              tagline: '',
              verification_status: 'active',
              community_support_text: null,
              badges: []
            }
          ]
        };
      }

      throw new Error(`Unexpected SQL in test mock: ${sql}`);
    }
  };
}

async function createServer() {
  const dbPath = require.resolve('../config/db');
  const publicPath = require.resolve('../routes/public');

  const dbMock = createDbMock();

  delete require.cache[publicPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: dbMock
  };

  const publicRoutes = require('../routes/public');
  const app = express();
  app.use('/api/public', publicRoutes);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  return {
    dbState: dbMock.state,
    async get(path) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      const body = await response.json();
      return { response, body };
    },
    close() {
      return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  };
}

test('GET /api/public/businesses default query returns active discoverable businesses', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses?page=1&limit=10');
    assert.equal(response.status, 200);
    assert.equal(body.totalCount, 3);
    assert.ok(Array.isArray(body.businesses));
    assert.equal(body.businesses.length, 3);

    const whereSql = server.dbState.countSqls[0];
    assert.match(whereSql, /COALESCE\(b\.verification_status, 'active'\) = 'active'/);
  } finally {
    await server.close();
  }
});

test('GET /api/public/businesses with text query applies safe search', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses?query=test&page=1&limit=10');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.businesses));

    const whereSql = server.dbState.countSqls[0];
    assert.match(whereSql, /b\.name ILIKE \$1 OR COALESCE\(b\.tagline, ''\) ILIKE \$1/);
    assert.equal(server.dbState.countParams[0][0], '%test%');
  } finally {
    await server.close();
  }
});

test('GET /api/public/businesses keeps records when no badge/communitySupport data exists', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses?page=1&limit=10');
    assert.equal(response.status, 200);
    assert.equal(body.businesses.length, 3);
    assert.equal(body.businesses.every((business) => business.community_support_text === null), true);
  } finally {
    await server.close();
  }
});
