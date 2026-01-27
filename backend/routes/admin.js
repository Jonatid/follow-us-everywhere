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
              verification_status AS "verificationStatus",
              community_support_text AS "communitySupportText",
              community_support_links AS "communitySupportLinks",
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

// @route   GET /api/admin/badges
// @desc    List badges
// @access  Private (admin)
router.get('/badges', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, icon, created_at AS "createdAt"
       FROM badges
       ORDER BY name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list badges error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/badges
// @desc    Create a badge
// @access  Private (admin)
router.post('/badges', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').trim().isLength({ min: 1, max: 500 }),
  body('icon').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 10 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, icon } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO badges (name, description, icon)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, icon, created_at AS "createdAt"`,
      [name.trim(), description.trim(), icon ? icon.trim() : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create badge error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Badge name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/badges/:id
// @desc    Update a badge
// @access  Private (admin)
router.put('/badges/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ min: 1, max: 500 }),
  body('icon').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 10 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, icon } = req.body;
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    fields.push(`name = $${paramCount}`);
    values.push(name.trim());
    paramCount++;
  }

  if (description !== undefined) {
    fields.push(`description = $${paramCount}`);
    values.push(description.trim());
    paramCount++;
  }

  if (icon !== undefined) {
    fields.push(`icon = $${paramCount}`);
    values.push(icon ? icon.trim() : null);
    paramCount++;
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE badges SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, description, icon, created_at AS "createdAt"`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update badge error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Badge name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/badges/:id
// @desc    Delete a badge
// @access  Private (admin)
router.delete('/badges/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM badges WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    res.json({ message: 'Badge deleted' });
  } catch (err) {
    console.error('Admin delete badge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/businesses/:id/badges
// @desc    List badges assigned to a business
// @access  Private (admin)
router.get('/businesses/:id/badges', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bb.id,
              bb.awarded_at AS "awardedAt",
              bb.evidence_url AS "evidenceUrl",
              bb.notes,
              b.id AS "badgeId",
              b.name,
              b.description,
              b.icon
       FROM business_badges bb
       JOIN badges b ON bb.badge_id = b.id
       WHERE bb.business_id = $1
       ORDER BY bb.awarded_at DESC, b.name ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list business badges error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/businesses/:id/badges
// @desc    Assign a badge to a business
// @access  Private (admin)
router.post('/businesses/:id/badges', [
  body('badgeId').isInt(),
  body('evidenceUrl').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { badgeId, evidenceUrl, notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO business_badges (business_id, badge_id, evidence_url, notes, awarded_by_admin_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (business_id, badge_id)
       DO UPDATE SET evidence_url = EXCLUDED.evidence_url,
                     notes = EXCLUDED.notes,
                     awarded_at = CURRENT_TIMESTAMP,
                     awarded_by_admin_id = EXCLUDED.awarded_by_admin_id
       RETURNING id, business_id AS "businessId", badge_id AS "badgeId", awarded_at AS "awardedAt", evidence_url AS "evidenceUrl", notes`,
      [req.params.id, badgeId, evidenceUrl || null, notes || null, req.adminId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin assign badge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/businesses/:businessId/badges/:badgeId
// @desc    Remove a badge from a business
// @access  Private (admin)
router.delete('/businesses/:businessId/badges/:badgeId', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM business_badges
       WHERE business_id = $1 AND badge_id = $2
       RETURNING id`,
      [req.params.businessId, req.params.badgeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business badge not found' });
    }

    res.json({ message: 'Badge removed from business' });
  } catch (err) {
    console.error('Admin remove badge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
