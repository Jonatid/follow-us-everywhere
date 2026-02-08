const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function createDbMock() {
  return {
    async query(sql, params = []) {
      if (sql.includes('FROM information_schema.columns')) {
        return {
          rows: [
            { column_name: 'verification_status' },
            { column_name: 'disabled_at' },
            { column_name: 'suspended_at' },
            { column_name: 'is_approved' },
            { column_name: 'is_verified' },
            { column_name: 'is_public' },
            { column_name: 'is_published' },
            { column_name: 'is_active' },
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
        return { rows: [{ total: '1' }] };
      }

      if (sql.includes('FROM businesses b')) {
        return {
          rows: [
            {
              id: 1,
              name: 'Acme Co',
              slug: 'acme-co',
              tagline: 'Hello',
              verification_status: 'approved',
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

  delete require.cache[publicPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: createDbMock()
  };

  const publicRoutes = require('../routes/public');
  const app = express();
  app.use('/api/public', publicRoutes);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  return {
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

test('GET /api/public/businesses returns 200 and businesses array when query is omitted', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.businesses));
    assert.equal(body.businesses.length, 1);
  } finally {
    await server.close();
  }
});

test('GET /api/public/businesses?page=1&limit=10 returns 200', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses?page=1&limit=10');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.businesses));
  } finally {
    await server.close();
  }
});

test('GET /api/public/businesses?query=a&page=1&limit=10 returns 200', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses?query=a&page=1&limit=10');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.businesses));
  } finally {
    await server.close();
  }
});
