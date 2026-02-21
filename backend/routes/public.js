const express = require('express');
const pool = require('../config/db');
const { getPublicBusinessBySlug } = require('../utils/publicBusinessProfile');

const router = express.Router();

router.get('/businesses', async (req, res) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const badge = typeof req.query.badge === 'string' ? req.query.badge.trim() : '';
    const communitySupport = typeof req.query.communitySupport === 'string' ? req.query.communitySupport.trim() : '';
    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 25);
    const offset = (page - 1) * limit;

    const columnsResult = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'businesses'
         AND column_name IN (
           'verification_status',
           'disabled_at',
           'suspended_at',
           'is_approved',
           'is_verified',
           'is_public',
           'is_published',
           'is_active',
           'community_support_text'
         )`
    );

    const tablesResult = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('business_badges', 'badges')`
    );

    const availableColumns = new Set(columnsResult.rows.map((row) => row.column_name));
    const availableTables = new Set(tablesResult.rows.map((row) => row.table_name));
    const includeBadges = availableTables.has('business_badges') && availableTables.has('badges');
    const selectCommunitySupport = availableColumns.has('community_support_text')
      ? 'b.community_support_text'
      : 'NULL::text AS community_support_text';
    const selectBadges = includeBadges
      ? `COALESCE(
           json_agg(
             DISTINCT jsonb_build_object('id', bd.id, 'name', bd.name)
           ) FILTER (WHERE bd.id IS NOT NULL),
           '[]'::json
         ) AS badges`
      : "'[]'::json AS badges";
    const badgesJoins = includeBadges
      ? `LEFT JOIN business_badges bb ON bb.business_id = b.id
         LEFT JOIN badges bd ON bd.id = bb.badge_id`
      : '';
    const whereConditions = [];
    const params = [];

    // Discoverable businesses are those with active verification status.
    whereConditions.push("COALESCE(b.verification_status, 'active') = 'active'");

    if (query) {
      params.push(`%${query}%`);
      whereConditions.push(`(b.name ILIKE $${params.length} OR COALESCE(b.tagline, '') ILIKE $${params.length})`);
    }

    if (communitySupport && availableColumns.has('community_support_text')) {
      params.push(`%${communitySupport}%`);
      whereConditions.push(`COALESCE(b.community_support_text, '') ILIKE $${params.length}`);
    }

    if (badge) {
      if (includeBadges) {
        params.push(`%${badge}%`);
        whereConditions.push(`EXISTS (
          SELECT 1
          FROM business_badges bb_filter
          JOIN badges bd_filter ON bd_filter.id = bb_filter.badge_id
          WHERE bb_filter.business_id = b.id
            AND bd_filter.name ILIKE $${params.length}
        )`);
      } else {
        whereConditions.push('FALSE');
      }
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(DISTINCT b.id) AS total
       FROM businesses b
       ${whereClause}`;

    const countResult = await pool.query(countSql, params);

    params.push(limit);
    params.push(offset);
    const limitParamIndex = params.length - 1;
    const offsetParamIndex = params.length;

    const listSql = `SELECT b.id,
              b.name,
              b.slug,
              b.tagline,
              COALESCE(b.verification_status, 'active') AS verification_status,
              ${selectCommunitySupport},
              ${selectBadges}
       FROM businesses b
       ${badgesJoins}
       ${whereClause}
       GROUP BY b.id
       ORDER BY b.name ASC
       LIMIT $${limitParamIndex}
       OFFSET $${offsetParamIndex}`;

    if (process.env.NODE_ENV === 'development') {
      console.debug('Public businesses query debug:', {
        query,
        page,
        limit,
        offset,
        badge,
        communitySupport,
        whereClause,
        countSql,
        listSql,
        params
      });
    }

    const result = await pool.query(listSql, params);

    const totalCount = Number(countResult.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return res.json({
      businesses: result.rows,
      page,
      limit,
      total: totalCount,
      totalCount,
      totalPages
    });
  } catch (error) {
    console.error('Error searching public businesses:', error);
    return res.status(500).json({ error: 'Failed to search businesses' });
  }
});


const handlePublicBusinessLookup = async (req, res) => {
  try {
    const key = typeof req.params.key === 'string' ? req.params.key.trim() : '';
    const business = await getPublicBusinessBySlug(key);

    if (!business) {
      console.warn('[public-business-lookup] not found', { key });
      return res.status(404).json({ error: 'Business not found' });
    }

    return res.json(business);
  } catch (error) {
    console.error('Error fetching public business profile:', error);
    return res.status(500).json({ error: 'Failed to fetch business profile' });
  }
};

router.get('/businesses/by-slug/:key', handlePublicBusinessLookup);
router.get('/businesses/slug/:key', handlePublicBusinessLookup);

module.exports = router;
