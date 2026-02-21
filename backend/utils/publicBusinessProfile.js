const pool = require('../config/db');
const { resolveVerificationStatus } = require('./verification');

let hasCheckedUsernameColumn = false;
let hasUsernameColumn = false;
let hasCheckedBusinessColumns = false;
let businessColumns = new Set();
let hasCheckedBadgeTables = false;
let hasBadgeTables = false;

const checkUsernameColumn = async () => {
  if (hasCheckedUsernameColumn) {
    return hasUsernameColumn;
  }

  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'businesses'
       AND column_name = 'username'
     LIMIT 1`
  );

  hasUsernameColumn = result.rows.length > 0;
  hasCheckedUsernameColumn = true;
  return hasUsernameColumn;
};

const checkBusinessColumns = async () => {
  if (hasCheckedBusinessColumns) {
    return businessColumns;
  }

  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'businesses'
       AND column_name IN (
         'logo_url',
         'verification_status',
         'disabled_at',
         'community_support_text',
         'community_support_links',
         'mission_statement',
         'vision_statement',
         'philanthropic_goals'
       )`
  );

  businessColumns = new Set(result.rows.map((row) => row.column_name));
  hasCheckedBusinessColumns = true;
  return businessColumns;
};

const checkBadgeTables = async () => {
  if (hasCheckedBadgeTables) {
    return hasBadgeTables;
  }

  const result = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('business_badges', 'badges')`
  );

  const availableTables = new Set(result.rows.map((row) => row.table_name));
  hasBadgeTables = availableTables.has('business_badges') && availableTables.has('badges');
  hasCheckedBadgeTables = true;
  return hasBadgeTables;
};

const getPublicBusinessBySlug = async (slug) => {
  const usesUsername = await checkUsernameColumn();
  const availableBusinessColumns = await checkBusinessColumns();
  const canLoadBadges = await checkBadgeTables();
  const slugValue = typeof slug === 'string' ? slug.trim() : '';
  const fieldMatchSql = usesUsername
    ? "(LOWER(slug) = LOWER($1) OR LOWER(COALESCE(username, '')) = LOWER($1))"
    : 'LOWER(slug) = LOWER($1)';

  if (process.env.NODE_ENV !== 'production') {
    console.log('[public-business-slug-lookup] request', {
      slug: slugValue,
      field: usesUsername ? 'slug|username' : 'slug'
    });
  }

  const result = await pool.query(
    `SELECT id,
            name,
            slug,
            tagline,
            logo,
            ${availableBusinessColumns.has('logo_url') ? 'logo_url' : 'NULL::text AS logo_url'},
            ${availableBusinessColumns.has('verification_status') ? 'verification_status' : "'active'::text AS verification_status"},
            ${availableBusinessColumns.has('disabled_at') ? 'disabled_at' : 'NULL::timestamptz AS disabled_at'},
            ${availableBusinessColumns.has('community_support_text') ? 'community_support_text' : 'NULL::text AS community_support_text'},
            ${availableBusinessColumns.has('community_support_links') ? 'community_support_links' : 'NULL::jsonb AS community_support_links'},
            ${availableBusinessColumns.has('mission_statement') ? 'mission_statement' : 'NULL::text AS mission_statement'},
            ${availableBusinessColumns.has('vision_statement') ? 'vision_statement' : 'NULL::text AS vision_statement'},
            ${availableBusinessColumns.has('philanthropic_goals') ? 'philanthropic_goals' : 'NULL::text AS philanthropic_goals'}
     FROM businesses
     WHERE ${fieldMatchSql}
     ORDER BY CASE
       WHEN LOWER(slug) = LOWER($1) THEN 0
       ELSE 1
     END,
     id ASC
     LIMIT 1`,
    [slugValue]
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log('[public-business-slug-lookup] result', {
      slug: slugValue,
      found: result.rows.length > 0
    });
  }

  if (result.rows.length === 0) {
    return null;
  }

  const business = result.rows[0];
  business.verification_status = resolveVerificationStatus(business);
  business.verificationStatus = business.verification_status;
  const isRestricted = ['suspended', 'disabled'].includes(business.verification_status);

  if (business.verification_status === 'disabled' && business.disabled_at) {
    const disabledAt = new Date(business.disabled_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (disabledAt <= sevenDaysAgo) {
      return null;
    }
  }

  const hasIsActiveResult = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'social_links'
       AND column_name = 'is_active'`
  );
  const hasIsActive = hasIsActiveResult.rows.length > 0;

  const socialsQuery = `
    SELECT id, platform, url, icon, display_order${hasIsActive ? ', is_active' : ''}
    FROM social_links
    WHERE business_id = $1
    ORDER BY display_order
  `;
  const socialsResult = await pool.query(socialsQuery, [business.id]);

  business.socials = isRestricted ? [] : socialsResult.rows;
  if (isRestricted) {
    business.status = business.verification_status;
    business.message = 'This page is temporarily unavailable due to technical difficulties.';
  }

  if (canLoadBadges) {
    const badgesResult = await pool.query(
      `SELECT bb.id,
              bb.awarded_at,
              bb.evidence_url,
              bb.notes,
              b.category,
              b.name,
              b.description,
              b.icon,
              b.slug
       FROM business_badges bb
         JOIN badges b ON b.id = bb.badge_id
       WHERE bb.business_id = $1
         AND bb.status = 'active'
       ORDER BY bb.awarded_at DESC`,
      [business.id]
    );

    business.badges = badgesResult.rows;
  } else {
    business.badges = [];
  }

  return business;
};

module.exports = {
  getPublicBusinessBySlug,
};
