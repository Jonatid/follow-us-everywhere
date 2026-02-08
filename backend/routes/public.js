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
           'is_active'
         )`
    );

    const availableColumns = new Set(columnsResult.rows.map((row) => row.column_name));
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
    if (availableColumns.has('is_approved')) {
      visibilityChecks.push('b.is_approved = TRUE');
    }
    if (availableColumns.has('is_verified')) {
      visibilityChecks.push('b.is_verified = TRUE');
    }
    if (availableColumns.has('is_public')) {
      visibilityChecks.push('b.is_public = TRUE');
    }
    if (availableColumns.has('is_published')) {
      visibilityChecks.push('b.is_published = TRUE');
    }
    if (availableColumns.has('is_active')) {
      visibilityChecks.push('b.is_active = TRUE');
    }

    const whereConditions = [];
    const params = [];

    if (query) {
      params.push(`%${query}%`);
      whereConditions.push('(b.name ILIKE $1 OR b.slug ILIKE $1 OR COALESCE(b.tagline, \'\') ILIKE $1)');
    }

    if (visibilityChecks.length) {
      whereConditions.push(visibilityChecks.join(' AND '));
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT b.id) AS total
       FROM businesses b
       ${whereClause}`,
      params
    );

    params.push(limit);
    params.push(offset);
    const limitParamIndex = params.length - 1;
    const offsetParamIndex = params.length;

    const result = await pool.query(
      `SELECT b.id,
              b.name,
              b.slug,
              b.tagline,
              COALESCE(b.verification_status, 'active') AS verification_status,
              b.community_support_text,
              COALESCE(
                json_agg(
                  DISTINCT jsonb_build_object('id', bd.id, 'name', bd.name)
                ) FILTER (WHERE bd.id IS NOT NULL),
                '[]'::json
              ) AS badges
       FROM businesses b
       LEFT JOIN business_badges bb ON bb.business_id = b.id
       LEFT JOIN badges bd ON bd.id = bb.badge_id
       ${whereClause}
       GROUP BY b.id
       ORDER BY b.name ASC
       LIMIT $${limitParamIndex}
       OFFSET $${offsetParamIndex}`,
      params
    );

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
