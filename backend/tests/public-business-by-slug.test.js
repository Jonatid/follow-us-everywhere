const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function createDbMock() {
  return {
    async query(sql, params = []) {
      if (sql.includes('FROM information_schema.columns') && sql.includes("table_name = 'businesses'") && sql.includes("column_name = 'username'")) {
        return { rows: [] };
      }

      if (sql.includes('FROM businesses') && sql.includes('LOWER(slug) = LOWER($1)')) {
        if (String(params[0]).toLowerCase() === 'acme-co') {
          return {
            rows: [{
              id: 42,
              name: 'Acme Co',
              slug: 'acme-co',
              tagline: 'Hello',
              logo: 'AC',
              logo_url: null,
              verification_status: 'active',
              disabled_at: null,
              community_support_text: null,
              community_support_links: null,
              mission_statement: null,
              vision_statement: null,
              philanthropic_goals: null,
            }]
          };
        }

        return { rows: [] };
      }

      if (sql.includes('FROM information_schema.columns') && sql.includes("table_name = 'social_links'")) {
        return { rows: [{ '?column?': 1 }] };
      }

      if (sql.includes('FROM social_links')) {
        return { rows: [{ id: 1, platform: 'Instagram', url: 'https://instagram.com/acme', icon: '📷', display_order: 0, is_active: true }] };
      }

      if (sql.includes('FROM business_badges bb')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test mock: ${sql}`);
    }
  };
}

async function createServer() {
  const dbPath = require.resolve('../config/db');
  const publicPath = require.resolve('../routes/public');
  const profileUtilPath = require.resolve('../utils/publicBusinessProfile');

  const dbMock = createDbMock();

  delete require.cache[publicPath];
  delete require.cache[profileUtilPath];
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

test('GET /api/public/businesses/slug/:slug returns profile payload', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses/slug/Acme-Co');
    assert.equal(response.status, 200);
    assert.equal(body.slug, 'acme-co');
    assert.ok(Array.isArray(body.socials));
  } finally {
    await server.close();
  }
});

test('GET /api/public/businesses/slug/:slug returns 404 for unknown business', async () => {
  const server = await createServer();
  try {
    const { response } = await server.get('/api/public/businesses/slug/unknown');
    assert.equal(response.status, 404);
  } finally {
    await server.close();
  }
});
