const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get public business profile by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const businessResult = await pool.query(
      'SELECT id, name, slug, tagline, logo FROM businesses WHERE slug = $1',
      [slug]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult.rows[0];

    // Fetch social links for this business
    const socialsResult = await pool.query(
      'SELECT id, platform, url, display_name, icon_url, position FROM social_links WHERE business_id = $1 AND is_active = true ORDER BY position ASC',
      [business.id]
    );

    res.json({
      ...business,
      socials: socialsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});


module.exports = router;
