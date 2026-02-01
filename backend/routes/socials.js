const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { resolveVerificationStatus, buildAccountRestrictionError } = require('../utils/verification');

const router = express.Router();

// Get all social links for a business (public)
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business exists
    const businessCheck = await db.query(
      'SELECT id, verification_status, suspended_at FROM businesses WHERE id = $1',
      [businessId]
    );

    if (businessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = await autoDisableBusiness(db, businessCheck.rows[0]);
    if (business.verification_status === 'disabled') {
      return res.status(404).json({ error: 'Business not found' });
    }
    if (business.verification_status === 'suspended') {
      return res.json([]);
    }

    const result = await db.query(
      'SELECT id, platform, url, icon, display_order, is_active FROM social_links WHERE business_id = $1 AND is_active = true ORDER BY display_order ASC',
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({ error: 'Failed to fetch social links' });
  }
});

// Get social links by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const businessCheck = await db.query(
      'SELECT id, verification_status, suspended_at FROM businesses WHERE slug = $1',
      [slug]
    );

    if (businessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = await autoDisableBusiness(db, businessCheck.rows[0]);
    if (business.verification_status === 'disabled') {
      return res.status(404).json({ error: 'Business not found' });
    }
    if (business.verification_status === 'suspended') {
      return res.json([]);
    }

    const result = await db.query(
      `SELECT id, platform, url, icon, display_order, is_active
       FROM social_links
       WHERE business_id = $1 AND is_active = true
       ORDER BY display_order ASC`,
      [business.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({ error: 'Failed to fetch social links' });
  }
});

// Add social link (requires authentication)
router.post(
  '/',
  authenticateToken,
  [
    body('platform')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Platform is required'),
    body('url')
      .isURL()
      .withMessage('URL must be valid'),
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Icon must be 10 characters or less'),
    body('display_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Display order must be a non-negative integer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { platform, url, icon, display_order } = req.body;

      const statusResult = await db.query(
        `SELECT verification_status,
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

      const result = await db.query(
        'INSERT INTO social_links (business_id, platform, url, icon, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.businessId, platform, url, icon || '', display_order || 0]
      );

      let warning = null;
      if (isLikelyPersonalProfile(url)) {
        const nudgeMessage = getNudgeMessage();
        const updateResult = await db.query(
          `UPDATE businesses
           SET verification_status = 'flagged',
               policy_violation_code = $1,
               policy_violation_text = $2,
               nudge_message = $3,
               last_nudge_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING name, email, last_nudge_at`,
          [
            PERSONAL_PROFILE_POLICY.code,
            PERSONAL_PROFILE_POLICY.text,
            nudgeMessage,
            req.businessId,
          ]
        );

        const business = updateResult.rows[0];
        if (business?.email) {
          sendEmail({
            to: business.email,
            subject: NUDGE_SUBJECT,
            text: nudgeMessage,
          }).catch((emailError) => {
            console.error('Failed to send nudge email:', emailError);
          });
        }

        warning = {
          message: nudgeMessage,
          policy: PERSONAL_PROFILE_POLICY,
          lastNudgeAt: business?.last_nudge_at || null,
        };
      }

      res.status(201).json({
        message: 'Social link added successfully',
        socialLink: result.rows[0],
        warning,
      });
    } catch (error) {
      console.error('Error adding social link:', error);
      res.status(500).json({ error: 'Failed to add social link' });
    }
  }
);

// Update social link (requires authentication)
router.put(
  '/:id',
  authenticateToken,
  [
    body('platform')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Platform must be between 1 and 100 characters'),
    body('url')
      .optional()
      .isURL()
      .withMessage('URL must be valid'),
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Icon must be 10 characters or less'),
    body('display_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Display order must be a non-negative integer'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { platform, url, icon, display_order, is_active } = req.body;

      const statusResult = await db.query(
        `SELECT verification_status,
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

      // Verify ownership
      const linkCheck = await db.query(
        'SELECT business_id FROM social_links WHERE id = $1',
        [id]
      );

      if (linkCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Social link not found' });
      }

      if (linkCheck.rows[0].business_id !== req.businessId) {
        return res.status(403).json({ error: 'Unauthorized to update this link' });
      }

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (platform !== undefined) {
        fields.push(`platform = $${paramCount}`);
        values.push(platform);
        paramCount++;
      }

      if (url !== undefined) {
        fields.push(`url = $${paramCount}`);
        values.push(url);
        paramCount++;
      }

      if (icon !== undefined) {
        fields.push(`icon = $${paramCount}`);
        values.push(icon);
        paramCount++;
      }

      if (display_order !== undefined) {
        fields.push(`display_order = $${paramCount}`);
        values.push(display_order);
        paramCount++;
      }

      if (is_active !== undefined) {
        fields.push(`is_active = $${paramCount}`);
        values.push(is_active);
        paramCount++;
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `UPDATE social_links SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      let warning = null;
      if (url && isLikelyPersonalProfile(url)) {
        const nudgeMessage = getNudgeMessage();
        const updateResult = await db.query(
          `UPDATE businesses
           SET verification_status = 'flagged',
               policy_violation_code = $1,
               policy_violation_text = $2,
               nudge_message = $3,
               last_nudge_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING name, email, last_nudge_at`,
          [
            PERSONAL_PROFILE_POLICY.code,
            PERSONAL_PROFILE_POLICY.text,
            nudgeMessage,
            req.businessId,
          ]
        );

        const business = updateResult.rows[0];
        if (business?.email) {
          sendEmail({
            to: business.email,
            subject: NUDGE_SUBJECT,
            text: nudgeMessage,
          }).catch((emailError) => {
            console.error('Failed to send nudge email:', emailError);
          });
        }

        warning = {
          message: nudgeMessage,
          policy: PERSONAL_PROFILE_POLICY,
          lastNudgeAt: business?.last_nudge_at || null,
        };
      }

      res.json({
        message: 'Social link updated successfully',
        socialLink: result.rows[0],
        warning,
      });
    } catch (error) {
      console.error('Error updating social link:', error);
      res.status(500).json({ error: 'Failed to update social link' });
    }
  }
);

// Delete social link (requires authentication)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const statusResult = await db.query(
      `SELECT verification_status,
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

    // Verify ownership
    const linkCheck = await db.query(
      'SELECT business_id FROM social_links WHERE id = $1',
      [id]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Social link not found' });
    }

    if (linkCheck.rows[0].business_id !== req.businessId) {
      return res.status(403).json({ error: 'Unauthorized to delete this link' });
    }

    await db.query('DELETE FROM social_links WHERE id = $1', [id]);

    res.json({ message: 'Social link deleted successfully' });
  } catch (error) {
    console.error('Error deleting social link:', error);
    res.status(500).json({ error: 'Failed to delete social link' });
  }
});

module.exports = router;
