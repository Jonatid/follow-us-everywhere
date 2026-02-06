const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/businesses', async (req, res) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const columnsResult = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'businesses'
         AND column_name IN ('verification_status', 'disabled_at', 'suspended_at')`
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
       WHERE (b.name ILIKE $1 OR b.slug ILIKE $1 OR COALESCE(b.tagline, '') ILIKE $1)
         ${visibilityChecks.length ? `AND ${visibilityChecks.join(' AND ')}` : ''}
       GROUP BY b.id
       ORDER BY b.name ASC
       LIMIT 25`,
      [`%${query}%`]
    );

    return res.json({ businesses: result.rows });
  } catch (error) {
    console.error('Error searching public businesses:', error);
    return res.status(500).json({ error: 'Failed to search businesses' });
  }
});

module.exports = router;
