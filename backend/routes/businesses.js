const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get public business profile by username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const result = await db.query(
      'SELECT id, username, business_name, business_description, bio, profile_image_url FROM businesses WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(result.rows[0]);
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
    body('business_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Business name must be between 1 and 255 characters'),
    body('business_description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be 1000 characters or less'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be 500 characters or less'),
    body('profile_image_url')
      .optional()
      .isURL()
      .withMessage('Profile image must be a valid URL'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { business_name, business_description, bio, profile_image_url } = req.body;

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (business_name !== undefined) {
        fields.push(`business_name = $${paramCount}`);
        values.push(business_name);
        paramCount++;
      }

      if (business_description !== undefined) {
        fields.push(`business_description = $${paramCount}`);
        values.push(business_description);
        paramCount++;
      }

      if (bio !== undefined) {
        fields.push(`bio = $${paramCount}`);
        values.push(bio);
        paramCount++;
      }

      if (profile_image_url !== undefined) {
        fields.push(`profile_image_url = $${paramCount}`);
        values.push(profile_image_url);
        paramCount++;
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.business.id);

      const query = `UPDATE businesses SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

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
