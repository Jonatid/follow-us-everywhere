require('dotenv').config({ path: `${__dirname}/../.env` });

const db = require('../config/db');

const API_KEY_ENV_NAME = 'ZERNIO_API_KEY';
const DEFAULT_PROVIDER = 'zernio';

const toIso = (value) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

class ZernioService {
  getApiKey() {
    return (process.env[API_KEY_ENV_NAME] || '').trim();
  }

  ensureConfigured() {
    if (!this.getApiKey()) {
      const error = new Error(`Missing ${API_KEY_ENV_NAME}. Set it in backend/.env to enable Zernio features.`);
      error.status = 503;
      throw error;
    }
  }

  normalizeInput(value) {
    return String(value || '').trim();
  }

  async connectAccount({ businessId, platform, accountHandle }) {
    this.ensureConfigured();

    const normalizedPlatform = this.normalizeInput(platform).toLowerCase();
    const normalizedHandle = this.normalizeInput(accountHandle);

    if (!normalizedPlatform || !normalizedHandle) {
      const error = new Error('platform and accountHandle are required.');
      error.status = 400;
      throw error;
    }

    const profileResult = await db.query(
      `INSERT INTO zernio_profiles (business_id, provider, status)
       VALUES ($1, $2, 'connected')
       ON CONFLICT (business_id, provider)
       DO UPDATE SET status = EXCLUDED.status,
                     updated_at = NOW()
       RETURNING id`,
      [businessId, DEFAULT_PROVIDER]
    );

    const profileId = profileResult.rows[0].id;
    const connectionResult = await db.query(
      `INSERT INTO zernio_accounts (
          profile_id,
          business_id,
          platform,
          account_handle,
          status,
          connected_at,
          last_synced_at
        )
       VALUES ($1, $2, $3, $4, 'connected', NOW(), NOW())
       ON CONFLICT (business_id, platform, account_handle)
       DO UPDATE SET
         profile_id = EXCLUDED.profile_id,
         status = 'connected',
         last_synced_at = NOW(),
         updated_at = NOW()
       RETURNING id, business_id, platform, account_handle, status, connected_at, created_at, updated_at`,
      [profileId, businessId, normalizedPlatform, normalizedHandle]
    );

    const row = connectionResult.rows[0];
    return {
      id: row.id,
      businessId: row.business_id,
      platform: row.platform,
      accountHandle: row.account_handle,
      status: row.status,
      connectedAt: toIso(row.connected_at),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    };
  }

  async createPost({ businessId, content, platforms = [] }) {
    this.ensureConfigured();

    const normalizedContent = this.normalizeInput(content);
    if (!normalizedContent) {
      const error = new Error('content is required.');
      error.status = 400;
      throw error;
    }

    const requestedPlatforms = [...new Set(
      (Array.isArray(platforms) ? platforms : [])
        .map((platform) => this.normalizeInput(platform).toLowerCase())
        .filter(Boolean)
    )];

    let targetPlatforms = requestedPlatforms;
    if (targetPlatforms.length === 0) {
      const accountsResult = await db.query(
        `SELECT DISTINCT platform
         FROM zernio_accounts
         WHERE business_id = $1
           AND status = 'connected'`,
        [businessId]
      );
      targetPlatforms = accountsResult.rows.map((row) => row.platform);
    }

    if (targetPlatforms.length === 0) {
      const error = new Error('Connect at least one social account before creating posts.');
      error.status = 400;
      throw error;
    }

    const postId = `zernio-${Date.now()}`;
    const postResult = await db.query(
      `INSERT INTO scheduled_posts (
         business_id,
         provider,
         provider_post_id,
         content,
         platforms,
         status,
         scheduled_for
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, 'queued', NOW())
       RETURNING id, business_id, provider_post_id, content, platforms, status, created_at, scheduled_for`,
      [businessId, DEFAULT_PROVIDER, postId, normalizedContent, JSON.stringify(targetPlatforms)]
    );

    const row = postResult.rows[0];
    return {
      id: row.provider_post_id || String(row.id),
      businessId: row.business_id,
      content: row.content,
      platforms: row.platforms || [],
      status: row.status,
      createdAt: toIso(row.created_at),
      scheduledFor: toIso(row.scheduled_for),
    };
  }

  async getPostHistory({ businessId }) {
    this.ensureConfigured();

    const result = await db.query(
      `SELECT provider_post_id, id, business_id, content, platforms, status, created_at, scheduled_for
       FROM scheduled_posts
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [businessId]
    );

    return result.rows.map((row) => ({
      id: row.provider_post_id || String(row.id),
      businessId: row.business_id,
      content: row.content,
      platforms: row.platforms || [],
      status: row.status,
      createdAt: toIso(row.created_at),
      scheduledFor: toIso(row.scheduled_for),
    }));
  }
}

module.exports = new ZernioService();
