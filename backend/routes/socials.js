const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all social links for a business (public)
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business exists
    const businessCheck = await db.query(
      'SELECT id FROM businesses WHERE id = $1',
      [businessId]
    );

    if (businessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const result = await db.query(
      'SELECT id, platform, url, display_name, icon_url, position FROM social_links WHERE business_id = $1 AND is_active = true ORDER BY position ASC',
      [businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({ error: 'Failed to fetch social links' });
  }
});

// Get social links by username (public)
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const result = await db.query(
      `SELECT sl.id, sl.platform, sl.url, sl.display_name, sl.icon_url, sl.position 
       FROM social_links sl
       JOIN businesses b ON sl.business_id = b.id
       WHERE b.username = $1 AND sl.is_active = true
       ORDER BY sl.position ASC`,
      [username]
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
    body('display_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Display name must be between 1 and 255 characters'),
    body('icon_url')
      .optional()
      .isURL()
      .withMessage('Icon URL must be valid'),
    body('position')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Position must be a non-negative integer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { platform, url, display_name, icon_url, position } = req.body;

      const result = await db.query(
        'INSERT INTO social_links (business_id, platform, url, display_name, icon_url, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.business.id, platform, url, display_name || platform, icon_url, position || 0]
      );

      res.status(201).json({
        message: 'Social link added successfully',
        socialLink: result.rows[0],
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
    body('display_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Display name must be between 1 and 255 characters'),
    body('icon_url')
      .optional()
      .isURL()
      .withMessage('Icon URL must be valid'),
    body('position')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Position must be a non-negative integer'),
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
      const { platform, url, display_name, icon_url, position, is_active } = req.body;

      // Verify ownership
      const linkCheck = await db.query(
        'SELECT business_id FROM social_links WHERE id = $1',
        [id]
      );

      if (linkCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Social link not found' });
      }

      if (linkCheck.rows[0].business_id !== req.business.id) {
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

      if (display_name !== undefined) {
        fields.push(`display_name = $${paramCount}`);
        values.push(display_name);
        paramCount++;
      }

      if (icon_url !== undefined) {
        fields.push(`icon_url = $${paramCount}`);
        values.push(icon_url);
        paramCount++;
      }

      if (position !== undefined) {
        fields.push(`position = $${paramCount}`);
        values.push(position);
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

      res.json({
        message: 'Social link updated successfully',
        socialLink: result.rows[0],
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

    // Verify ownership
    const linkCheck = await db.query(
      'SELECT business_id FROM social_links WHERE id = $1',
      [id]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Social link not found' });
    }

    if (linkCheck.rows[0].business_id !== req.business.id) {
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
