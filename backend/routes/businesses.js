const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { resolveVerificationStatus, buildAccountRestrictionError } = require('../utils/verification');

const router = express.Router();

// Get public business profile by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT id,
              name,
              slug,
              tagline,
              logo,
              verification_status,
              disabled_at,
              community_support_text,
              community_support_links
       FROM businesses
       WHERE slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = result.rows[0];
    business.verification_status = resolveVerificationStatus(business);
    const isRestricted = ['suspended', 'disabled'].includes(business.verification_status);

    if (business.verification_status === 'disabled' && business.disabled_at) {
      const disabledAt = new Date(business.disabled_at);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (disabledAt <= sevenDaysAgo) {
        return res.status(404).json({ error: 'Business not found' });
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
              b.id AS badge_id,
              b.name,
              b.description,
              b.icon
       FROM business_badges bb
       JOIN badges b ON bb.badge_id = b.id
       WHERE bb.business_id = $1
       ORDER BY bb.awarded_at DESC, b.name ASC`,
      [business.id]
    );

    business.badges = badgesResult.rows;
    delete business.disabled_at;

    res.json(business);
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Update community support (requires authentication)
router.put(
  '/community-support',
  authenticateToken,
  [
    body('community_support_text')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Community support text must be 2000 characters or less'),
    body('community_support_links')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null) {
          return true;
        }
        if (!Array.isArray(value)) {
          throw new Error('Community support links must be an array');
        }
        value.forEach((link) => {
          if (!link || typeof link !== 'object') {
            throw new Error('Each community support link must be an object');
          }
          const label = typeof link.label === 'string' ? link.label.trim() : '';
          const url = typeof link.url === 'string' ? link.url.trim() : '';
          if (!label || !url) {
            throw new Error('Each community support link requires a label and url');
          }
        });
        return true;
      }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { community_support_text, community_support_links } = req.body;

      if (community_support_text === undefined && community_support_links === undefined) {
        return res.status(400).json({ error: 'No community support fields to update' });
      }

      const statusResult = await pool.query(
        `SELECT verification_status,
                is_approved,
                is_verified,
                suspended_reason,
                suspended_at,
                disabled_at,
                policy_violation_code,
                policy_violation_text,
                nudge_message
         FROM businesses
         WHERE id = $1`,
        [req.businessId]
      );

      if (statusResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const verificationStatus = resolveVerificationStatus(statusResult.rows[0]);
      if (!['active', 'flagged'].includes(verificationStatus)) {
        const restrictionError = buildAccountRestrictionError(statusResult.rows[0]);
        return res.status(403).json(restrictionError);
      }

      const fields = [];
      const values = [];
      let paramCount = 1;

      if (community_support_text !== undefined) {
        fields.push(`community_support_text = $${paramCount}`);
        values.push(community_support_text === null ? null : community_support_text.trim());
        paramCount++;
      }

      if (community_support_links !== undefined) {
        const cleanedLinks = community_support_links === null
          ? null
          : community_support_links.map((link) => ({
              label: link.label.trim(),
              url: link.url.trim(),
            }));
        fields.push(`community_support_links = $${paramCount}`);
        values.push(cleanedLinks);
        paramCount++;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.businessId);

      const query = `UPDATE businesses SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING community_support_text, community_support_links`;
      const result = await pool.query(query, values);

      res.json({
        message: 'Community support updated successfully',
        communitySupport: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating community support:', error);
      res.status(500).json({ error: 'Failed to update community support' });
    }
  }
);

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

      const statusResult = await pool.query(
        `SELECT verification_status,
                is_approved,
                is_verified,
                suspended_reason,
                suspended_at,
                disabled_at,
                policy_violation_code,
                policy_violation_text,
                nudge_message
         FROM businesses
         WHERE id = $1`,
        [req.businessId]
      );

      if (statusResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const verificationStatus = resolveVerificationStatus(statusResult.rows[0]);
      if (!['active', 'flagged'].includes(verificationStatus)) {
        const restrictionError = buildAccountRestrictionError(statusResult.rows[0]);
        return res.status(403).json(restrictionError);
      }

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
