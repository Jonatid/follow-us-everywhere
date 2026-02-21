const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function createDbMock() {
  return {
    async query(sql, params = []) {
      if (sql.includes('FROM information_schema.columns') && sql.includes("table_name = 'businesses'") && sql.includes("column_name = 'username'")) {
        return { rows: [{ '?column?': 1 }] };
      }

      if (sql.includes('FROM information_schema.columns') && sql.includes("table_name = 'businesses'") && sql.includes("column_name IN")) {
        return {
          rows: [
            { column_name: 'logo_url' },
            { column_name: 'verification_status' },
            { column_name: 'disabled_at' },
            { column_name: 'community_support_text' },
            { column_name: 'community_support_links' },
            { column_name: 'mission_statement' },
            { column_name: 'vision_statement' },
            { column_name: 'philanthropic_goals' },
          ]
        };
      }

      if (sql.includes('FROM information_schema.tables') && sql.includes("table_name IN ('business_badges', 'badges')")) {
        return { rows: [{ table_name: 'business_badges' }, { table_name: 'badges' }] };
      }

      if (sql.includes('FROM businesses') && sql.includes('WHERE LOWER(slug) = LOWER($1)')) {
        const key = String(params[0]).toLowerCase();
        if (key === 'acme-co') {
          return {
            rows: [{
              id: 42,
              name: 'Acme Co',
              slug: 'acme-co',
              username: 'acmeuser',
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

      if (sql.includes('FROM businesses') && sql.includes("WHERE LOWER(COALESCE(username, '')) = LOWER($1)")) {
        const key = String(params[0]).toLowerCase();
        if (key === 'acmeuser') {
          return {
            rows: [{
              id: 42,
              name: 'Acme Co',
              slug: 'acme-co',
              username: 'acmeuser',
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

test('GET /api/public/businesses/by-slug/:key returns profile payload by slug', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses/by-slug/Acme-Co');
    assert.equal(response.status, 200);
    assert.equal(body.slug, 'acme-co');
    assert.ok(Array.isArray(body.socials));
  } finally {
    await server.close();
  }
});

test('GET /api/public/businesses/by-slug/:key returns profile payload by username', async () => {
  const server = await createServer();
  try {
    const { response, body } = await server.get('/api/public/businesses/by-slug/AcmeUser');
    assert.equal(response.status, 200);
    assert.equal(body.slug, 'acme-co');
  } finally {
    await server.close();
  }
});


test('GET /api/public/businesses/by-slug/:key prefers direct slug match when username collides', async () => {
  const dbPath = require.resolve('../config/db');
  const publicPath = require.resolve('../routes/public');
  const profileUtilPath = require.resolve('../utils/publicBusinessProfile');

  const collisionDbMock = {
    async query(sql, params = []) {
      if (sql.includes('FROM information_schema.columns') && sql.includes("table_name = 'businesses'") && sql.includes("column_name = 'username'")) {
        return { rows: [{ '?column?': 1 }] };
      }

      if (sql.includes('FROM information_schema.columns') && sql.includes("table_name = 'businesses'") && sql.includes("column_name IN")) {
        return {
          rows: [
            { column_name: 'logo_url' },
            { column_name: 'verification_status' },
            { column_name: 'disabled_at' },
            { column_name: 'community_support_text' },
            { column_name: 'community_support_links' },
            { column_name: 'mission_statement' },
            { column_name: 'vision_statement' },
            { column_name: 'philanthropic_goals' },
          ]
        };
      }

      if (sql.includes('FROM information_schema.tables') && sql.includes("table_name IN ('business_badges', 'badges')")) {
        return { rows: [{ table_name: 'business_badges' }, { table_name: 'badges' }] };
      }

      if (sql.includes('FROM businesses') && sql.includes('ORDER BY CASE')) {
        return {
          rows: [{
            id: 100,
            name: 'Slug Winner',
            slug: 'shared-key',
            tagline: 'Direct slug',
            logo: 'SW',
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

      if (sql.includes('FROM information_schema.columns') && sql.includes("table_name = 'social_links'")) {
        return { rows: [{ '?column?': 1 }] };
      }

      if (sql.includes('FROM social_links')) {
        return { rows: [] };
      }

      if (sql.includes('FROM business_badges bb')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in collision test mock: ${sql}`);
    }
  };

  delete require.cache[publicPath];
  delete require.cache[profileUtilPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: collisionDbMock
  };

  const publicRoutes = require('../routes/public');
  const app = express();
  app.use('/api/public', publicRoutes);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/public/businesses/by-slug/shared-key`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.name, 'Slug Winner');
    assert.equal(body.slug, 'shared-key');
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('GET /api/public/businesses/by-slug/:key returns 404 for unknown business', async () => {
  const server = await createServer();
  try {
    const { response } = await server.get('/api/public/businesses/by-slug/unknown');
    assert.equal(response.status, 404);
  } finally {
    await server.close();
  }
});
