const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateAdminToken } = require('../middleware/admin-auth');

const router = express.Router();

router.use(authenticateAdminToken);

// @route   GET /api/admin/businesses
// @desc    List businesses for admin
// @access  Private (admin)
router.get('/businesses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              name,
              slug,
              email,
              is_approved AS "isApproved",
              created_at AS "createdAt"
       FROM businesses
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list businesses error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/businesses/:id
// @desc    Get a single business for admin
// @access  Private (admin)
router.get('/businesses/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              name,
              slug,
              tagline,
              logo,
              email,
              is_verified AS "isVerified",
              is_approved AS "isApproved",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM businesses
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin get business error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/businesses/:id/approve
// @desc    Approve a business
// @access  Private (admin)
router.put('/businesses/:id/approve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE businesses
       SET is_approved = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, slug, email, is_approved AS "isApproved"`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin approve business error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/businesses/:id/block
// @desc    Block a business (set not approved)
// @access  Private (admin)
router.put('/businesses/:id/block', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE businesses
       SET is_approved = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, slug, email, is_approved AS "isApproved"`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin block business error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/admins
// @desc    List admins
// @access  Private (admin)
router.get('/admins', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              name,
              email,
              created_at AS "createdAt"
       FROM admins
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list admins error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/admins
// @desc    Create a new admin
// @access  Private (admin)
router.post('/admins', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').optional({ nullable: true, checkFalsy: true }).isLength({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const name = req.body.name ? req.body.name.trim() : null;
  const { email, password } = req.body;

  try {
    const existingAdmin = await pool.query(
      'SELECT 1 FROM admins WHERE email = $1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at AS "createdAt"`,
      [name, email, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create admin error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
