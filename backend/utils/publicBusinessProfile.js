const pool = require('../config/db');
const { resolveVerificationStatus } = require('./verification');

let hasCheckedUsernameColumn = false;
let hasUsernameColumn = false;

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

const getPublicBusinessBySlug = async (slug) => {
  const usesUsername = await checkUsernameColumn();
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
            logo_url,
            verification_status,
            disabled_at,
            community_support_text,
            community_support_links,
            mission_statement,
            vision_statement,
            philanthropic_goals
     FROM businesses
     WHERE ${fieldMatchSql}`,
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

  const badgesResult = await pool.query(
    `SELECT bb.id,
            bb.awarded_at,
            bb.evidence_url,
            bb.notes,
            bb.category,
            bb.expires_at,
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

  return business;
};

module.exports = {
  getPublicBusinessBySlug,
};
