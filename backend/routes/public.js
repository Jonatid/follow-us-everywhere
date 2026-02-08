const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/businesses', async (req, res) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
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
    const visibilityChecks = [];

    if (availableColumns.has('verification_status')) {
      visibilityChecks.push("COALESCE(b.verification_status, 'active') NOT IN ('disabled', 'suspended')");
    }
    if (availableColumns.has('disabled_at')) {
      visibilityChecks.push('b.disabled_at IS NULL');
    }
    if (availableColumns.has('suspended_at')) {
      visibilityChecks.push('b.suspended_at IS NULL');
    }
    // Public discovery should only require active verification and no suspension/disable timestamps.

    const whereConditions = [];
    const params = [];

    if (query) {
      params.push(`%${query}%`);
      whereConditions.push('(b.name ILIKE $1 OR COALESCE(b.tagline, \'\') ILIKE $1)');
    }

    if (visibilityChecks.length) {
      whereConditions.push(visibilityChecks.join(' AND '));
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
        visibilityChecks,
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

module.exports = router;
