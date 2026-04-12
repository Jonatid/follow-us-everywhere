const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ZERNIO_API_KEY = process.env.ZERNIO_API_KEY || 'test-zernio-key';

const db = require('../config/db');
const zernioService = require('../services/zernioService');

let queryStub;

const installStub = () => {
  db.query = async (...args) => queryStub(...args);
};

test.beforeEach(() => {
  queryStub = async () => ({ rows: [] });
  installStub();
});

test('connectAccount persists account to zernio tables', async () => {
  const calls = [];
  queryStub = async (sql, params) => {
    calls.push({ sql, params });

    if (sql.includes('INSERT INTO zernio_profiles')) {
      return { rows: [{ id: 42 }] };
    }

    if (sql.includes('INSERT INTO zernio_accounts')) {
      return {
        rows: [{
          id: 7,
          business_id: 99,
          platform: 'facebook',
          account_handle: 'fuse101',
          status: 'connected',
          connected_at: new Date('2026-04-12T00:00:00.000Z'),
          created_at: new Date('2026-04-12T00:00:00.000Z'),
          updated_at: new Date('2026-04-12T00:00:00.000Z'),
        }],
      };
    }

    throw new Error(`Unhandled query: ${sql}`);
  };

  const result = await zernioService.connectAccount({
    businessId: 99,
    platform: 'Facebook',
    accountHandle: 'fuse101',
  });

  assert.equal(result.businessId, 99);
  assert.equal(result.platform, 'facebook');
  assert.equal(result.accountHandle, 'fuse101');
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /INSERT INTO zernio_profiles/);
  assert.match(calls[1].sql, /INSERT INTO zernio_accounts/);
});

test('createPost persists scheduled post and returns normalized payload', async () => {
  queryStub = async (sql, params) => {
    if (sql.includes('INSERT INTO scheduled_posts')) {
      const platforms = JSON.parse(params[4]);
      return {
        rows: [{
          id: 13,
          business_id: 99,
          provider_post_id: 'zernio-123',
          content: params[3],
          platforms,
          status: 'queued',
          created_at: new Date('2026-04-12T00:00:00.000Z'),
          scheduled_for: new Date('2026-04-12T01:00:00.000Z'),
        }],
      };
    }

    throw new Error(`Unhandled query: ${sql}`);
  };

  const post = await zernioService.createPost({
    businessId: 99,
    content: 'Hello social!',
    platforms: ['Facebook', 'Instagram', 'Facebook'],
  });

  assert.equal(post.businessId, 99);
  assert.deepEqual(post.platforms, ['facebook', 'instagram']);
  assert.equal(post.status, 'queued');
});

test('migration defines zernio model tables', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const migrationPath = path.join(__dirname, '..', 'migrations', '20261102_create_zernio_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS zernio_profiles/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS zernio_accounts/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS scheduled_posts/i);
});
