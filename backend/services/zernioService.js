// ─────────────────────────────────────────────────────────────────────────────
// FUSE101 · backend/services/zernioService.js
// CORRECTED VERSION — calls the real Zernio API instead of a made-up endpoint.
// Keeps your existing PostgreSQL structure (business_id-based, raw SQL via db.query).
// Requires: npm install @zernio/node  (already installed)
// Requires: ZERNIO_API_KEY in backend/.env  (already set)
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config({ path: `${__dirname}/../.env` });

const db = require('../config/db');
const Zernio = require('@zernio/node');

const API_KEY_ENV_NAME = 'ZERNIO_API_KEY';
const DEFAULT_PROVIDER = 'zernio';
const SUPPORTED_PLATFORMS = new Set(['instagram', 'facebook', 'x', 'tiktok', 'linkedin', 'youtube']);

const zernio = new Zernio(process.env[API_KEY_ENV_NAME]);

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

  // ── PROFILES ────────────────────────────────────────────────────────────
  // Every FUSE101 business needs exactly ONE Zernio profile.
  // This creates it the first time, and reuses it after that.
  async ensureZernioProfile(businessId) {
    this.ensureConfigured();

    const existing = await db.query(
      `SELECT zernio_profile_id FROM zernio_profiles WHERE business_id = $1`,
      [businessId]
    );

    if (existing.rows[0]?.zernio_profile_id) {
      return existing.rows[0].zernio_profile_id;
    }

    // Not created yet — ask Zernio for a real profile
    const { profile } = await zernio.profiles.createProfile({
      name: `fuse101_business_${businessId}`,
      description: 'FUSE101 Social Hub profile',
    });

    await db.query(
      `INSERT INTO zernio_profiles (business_id, provider, status, zernio_profile_id)
       VALUES ($1, $2, 'connected', $3)
       ON CONFLICT (business_id, provider)
       DO UPDATE SET zernio_profile_id = EXCLUDED.zernio_profile_id,
                     status = 'connected',
                     updated_at = NOW()`,
      [businessId, DEFAULT_PROVIDER, profile._id]
    );

    return profile._id;
  }

  // ── CONNECT A PLATFORM (real OAuth, via Zernio) ────────────────────────
  async buildConnectUrl({ businessId, platform }) {
    this.ensureConfigured();

    const normalizedPlatform = this.normalizeInput(platform).toLowerCase();
    if (!normalizedPlatform) {
      const error = new Error('platform is required.');
      error.status = 400;
      throw error;
    }
    if (!SUPPORTED_PLATFORMS.has(normalizedPlatform)) {
      const error = new Error(`Unsupported platform: ${platform}`);
      error.status = 400;
      throw error;
    }

    const zernioProfileId = await this.ensureZernioProfile(businessId);

    const { authUrl } = await zernio.connect.getConnectUrl({
      platform: normalizedPlatform,
      profileId: zernioProfileId,
    });

    // Frontend (SocialHub.jsx) reads response.data.oauthUrl — keep this key name.
    return {
      platform: normalizedPlatform,
      oauthUrl: authUrl,
    };
  }

  // ── SYNC ACCOUNTS (call this after the user completes OAuth) ──────────
  // Zernio now knows the account is connected. This pulls the real
  // account list from Zernio and saves it into our own database.
  async syncConnectedAccounts({ businessId }) {
    this.ensureConfigured();

    const zernioProfileId = await this.ensureZernioProfile(businessId);
    const { accounts } = await zernio.accounts.listAccounts({ profileId: zernioProfileId });

    for (const account of accounts) {
      await db.query(
        `INSERT INTO zernio_accounts (
            business_id, platform, account_handle, zernio_account_id,
            status, connected_at, last_synced_at
          )
         VALUES ($1, $2, $3, $4, 'connected', NOW(), NOW())
         ON CONFLICT (business_id, platform, account_handle)
         DO UPDATE SET
           zernio_account_id = EXCLUDED.zernio_account_id,
           status = 'connected',
           last_synced_at = NOW(),
           updated_at = NOW()`,
        [businessId, account.platform, account.displayName || account.platform, account._id]
      );
    }

    return this.getConnectedAccounts({ businessId });
  }

  // ── CREATE A REAL POST (actually publishes via Zernio) ────────────────
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

    // Look up the REAL Zernio account IDs for the requested platforms
    const accountsResult = await db.query(
      `SELECT platform, zernio_account_id
       FROM zernio_accounts
       WHERE business_id = $1
         AND status = 'connected'
         ${requestedPlatforms.length ? 'AND platform = ANY($2::text[])' : ''}`,
      requestedPlatforms.length ? [businessId, requestedPlatforms] : [businessId]
    );

    if (accountsResult.rows.length === 0) {
      const error = new Error('Connect at least one social account before creating posts.');
      error.status = 400;
      throw error;
    }

    const platformsWithIds = accountsResult.rows.map((row) => ({
      platform: row.platform,
      accountId: row.zernio_account_id,
    }));

    // Actually publish through Zernio
    const { post } = await zernio.posts.createPost({
      content: normalizedContent,
      platforms: platformsWithIds,
      publishNow: true,
    });

    // Save the REAL Zernio post ID and status to our own database
    const savedResult = await db.query(
      `INSERT INTO scheduled_posts (
         business_id, provider, provider_post_id, content, platforms, status, scheduled_for
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
       RETURNING id, business_id, provider_post_id, content, platforms, status, created_at, scheduled_for`,
      [
        businessId,
        DEFAULT_PROVIDER,
        post._id,
        normalizedContent,
        JSON.stringify(platformsWithIds.map((p) => p.platform)),
        post.status || 'published',
      ]
    );

    const row = savedResult.rows[0];
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

  // ── READ-ONLY LOOKUPS (unchanged — these already worked correctly) ────
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

  async getConnectedAccounts({ businessId }) {
    this.ensureConfigured();
    const result = await db.query(
      `SELECT id, business_id, platform, account_handle, status, connected_at, created_at, updated_at
       FROM zernio_accounts
       WHERE business_id = $1
         AND status = 'connected'
       ORDER BY connected_at DESC NULLS LAST, created_at DESC`,
      [businessId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      businessId: row.business_id,
      platform: row.platform,
      accountHandle: row.account_handle,
      status: row.status,
      connectedAt: toIso(row.connected_at),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    }));
  }
}

module.exports = new ZernioService();
