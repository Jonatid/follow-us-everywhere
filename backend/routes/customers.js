const express = require('express');
const pool = require('../config/db');
const { authenticateCustomerToken } = require('../middleware/customer-auth');

const router = express.Router();

const businessVisibilityClause = `
  b.verification_status NOT IN ('disabled', 'suspended')
  AND b.disabled_at IS NULL
  AND b.suspended_at IS NULL
`;

// @route   GET /api/customers/favorites
// @desc    Get customer favorites
// @access  Private
router.get('/favorites', authenticateCustomerToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id,
              b.name,
              b.slug,
              b.tagline,
              b.logo,
              b.verification_status
       FROM customer_favorites cf
       JOIN businesses b ON cf.business_id = b.id
       WHERE cf.customer_id = $1
         AND ${businessVisibilityClause}
       ORDER BY cf.created_at DESC`,
      [req.customerId]
    );

    return res.json({ favorites: result.rows });
  } catch (err) {
    console.error('Customer favorites error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/customers/favorites/:businessId
// @desc    Add business to favorites
// @access  Private
router.post('/favorites/:businessId', authenticateCustomerToken, async (req, res) => {
  const businessId = Number(req.params.businessId);
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return res.status(400).json({ message: 'Invalid business id' });
  }

  try {
    const businessResult = await pool.query(
      `SELECT id
       FROM businesses b
       WHERE b.id = $1
         AND ${businessVisibilityClause}`,
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const insertResult = await pool.query(
      `INSERT INTO customer_favorites (customer_id, business_id)
       VALUES ($1, $2)
       ON CONFLICT (customer_id, business_id) DO NOTHING
       RETURNING id`,
      [req.customerId, businessId]
    );

    if (insertResult.rows.length === 0) {
      return res.json({ message: 'Business already favorited' });
    }

    return res.status(201).json({ message: 'Business favorited' });
  } catch (err) {
    console.error('Add favorite error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/customers/favorites/:businessId
// @desc    Remove business from favorites
// @access  Private
router.delete('/favorites/:businessId', authenticateCustomerToken, async (req, res) => {
  const businessId = Number(req.params.businessId);
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return res.status(400).json({ message: 'Invalid business id' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM customer_favorites
       WHERE customer_id = $1 AND business_id = $2
       RETURNING id`,
      [req.customerId, businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    return res.json({ message: 'Favorite removed' });
  } catch (err) {
    console.error('Remove favorite error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
