const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get public business profile by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      'SELECT id, name, slug, tagline, logo FROM businesses WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = result.rows[0];

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

    business.socials = socialsResult.rows;

    res.json(business);
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Update business profile (requires authentication)
router.put(
  '/profile/update',
  authenticateToken,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Business name must be between 1 and 255 characters'),
    body('tagline')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Tagline must be 255 characters or less'),
    body('logo')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Logo must be 10 characters or less'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, tagline, logo } = req.body;

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        fields.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (tagline !== undefined) {
        fields.push(`tagline = $${paramCount}`);
        values.push(tagline);
        paramCount++;
      }

      if (logo !== undefined) {
        fields.push(`logo = $${paramCount}`);
        values.push(logo);
        paramCount++;
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.businessId);

      const query = `UPDATE businesses SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await pool.query(query, values);

      res.json({
        message: 'Profile updated successfully',
        business: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

module.exports = router;
