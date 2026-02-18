const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateAdminToken } = require('../middleware/admin-auth');
const { resolveVerificationStatus } = require('../utils/verification');

const router = express.Router();

router.use(authenticateAdminToken);


// @route   GET /api/admin/documents
// @desc    List business documents for admin review
// @access  Private (admin)
router.get('/documents', async (req, res) => {
  const { status, business_id } = req.query;
  const allowedStatuses = new Set(['Pending', 'Verified', 'Rejected']);

  try {
    const filters = [];
    const values = [];

    if (status) {
      if (!allowedStatuses.has(status)) {
        return res.status(400).json({ message: 'Invalid status filter' });
      }
      filters.push(`bd.status = $${values.length + 1}`);
      values.push(status);
    }

    if (business_id) {
      filters.push(`bd.business_id = $${values.length + 1}`);
      values.push(Number(business_id));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT bd.id,
              bd.business_id AS "businessId",
              b.name AS "businessName",
              b.slug AS "businessSlug",
              bd.document_type AS "documentType",
              bd.original_file_name AS "originalFileName",
              bd.stored_file_name AS "storedFileName",
              bd.storage_provider AS "storageProvider",
              bd.storage_path AS "storagePath",
              bd.mime_type AS "mimeType",
              bd.file_size AS "fileSize",
              bd.status,
              bd.submitted_at AS "submittedAt",
              bd.reviewed_at AS "reviewedAt",
              bd.reviewed_by_admin_id AS "reviewedByAdminId",
              bd.rejection_reason AS "rejectionReason",
              bd.notes
       FROM business_documents bd
       JOIN businesses b ON b.id = bd.business_id
       ${whereClause}
       ORDER BY bd.submitted_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list business documents error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/admin/documents/:id
// @desc    Review a business document
// @access  Private (admin)
router.patch('/documents/:id', async (req, res) => {
  const { status, rejection_reason } = req.body;
  const allowedStatuses = new Set(['Verified', 'Rejected']);

  if (!status || !allowedStatuses.has(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  if (status === 'Rejected' && (!rejection_reason || !String(rejection_reason).trim())) {
    return res.status(400).json({ message: 'rejection_reason is required for Rejected status' });
  }

  try {
    const result = await pool.query(
      `UPDATE business_documents
       SET status = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by_admin_id = $2,
           rejection_reason = $3
       WHERE id = $4
       RETURNING id,
                 business_id AS "businessId",
                 document_type AS "documentType",
                 original_file_name AS "originalFileName",
                 stored_file_name AS "storedFileName",
                 storage_provider AS "storageProvider",
                 storage_path AS "storagePath",
                 mime_type AS "mimeType",
                 file_size AS "fileSize",
                 status,
                 submitted_at AS "submittedAt",
                 reviewed_at AS "reviewedAt",
                 reviewed_by_admin_id AS "reviewedByAdminId",
                 rejection_reason AS "rejectionReason",
                 notes`,
      [
        status,
        req.adminId,
        status === 'Rejected' ? String(rejection_reason).trim() : null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin review business document error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// @route   GET /api/admin/dashboard/summary
// @desc    Get admin dashboard business/admin counts
// @access  Private (admin)
router.get('/dashboard/summary', async (req, res) => {
  try {
    const [businessCountResult, adminCountResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE COALESCE(verification_status, 'active') = 'active')::int AS active,
                COUNT(*) FILTER (WHERE COALESCE(verification_status, 'active') <> 'active')::int AS inactive
         FROM businesses`
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM admins')
    ]);

    const counts = businessCountResult.rows[0] || { total: 0, active: 0, inactive: 0 };
    const admins = adminCountResult.rows[0] || { total: 0 };

    res.json({
      businesses: {
        total: Number(counts.total || 0),
        active: Number(counts.active || 0),
        inactive: Number(counts.inactive || 0),
      },
      admins: Number(admins.total || 0),
    });
  } catch (err) {
    console.error('Admin dashboard summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/reviews/businesses
// @desc    List businesses by verification status for admin reviews
// @access  Private (admin)
router.get('/reviews/businesses', async (req, res) => {
  const { status } = req.query;
  const allowedStatuses = new Set(['active', 'flagged', 'suspended', 'disabled']);

  try {
    const filters = [];
    const values = [];
    if (status) {
      if (!allowedStatuses.has(status)) {
        return res.status(400).json({ message: 'Invalid status filter' });
      }
      filters.push(`verification_status = $${values.length + 1}`);
      values.push(status);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id,
              name,
              slug,
              email,
              verification_status AS "verificationStatus",
              policy_violation_code AS "policyViolationCode",
              policy_violation_text AS "policyViolationText",
              nudge_message AS "nudgeMessage",
              last_nudge_at AS "lastNudgeAt",
              suspended_at AS "suspendedAt",
              disabled_at AS "disabledAt",
              created_at AS "createdAt"
       FROM businesses
       ${whereClause}
       ORDER BY created_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Admin review list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/admin/reviews/businesses/:id
// @desc    Update business verification status for admin reviews
// @access  Private (admin)
router.patch('/reviews/businesses/:id', async (req, res) => {
  const { verification_status, policy_violation_code, policy_violation_text, nudge_message } = req.body;
  const allowedStatuses = new Set(['active', 'flagged', 'suspended', 'disabled']);

  if (!verification_status || !allowedStatuses.has(verification_status)) {
    return res.status(400).json({ message: 'Invalid verification_status' });
  }

  try {
    const fields = ['verification_status = $1'];
    const values = [verification_status];
    let paramCount = values.length + 1;

    if (verification_status === 'active') {
      fields.push('policy_violation_code = NULL');
      fields.push('policy_violation_text = NULL');
      fields.push('nudge_message = NULL');
      fields.push('last_nudge_at = NULL');
      fields.push('suspended_at = NULL');
      fields.push('disabled_at = NULL');
    } else {
      if (policy_violation_code !== undefined) {
        fields.push(`policy_violation_code = $${paramCount}`);
        values.push(policy_violation_code);
        paramCount += 1;
      }
      if (policy_violation_text !== undefined) {
        fields.push(`policy_violation_text = $${paramCount}`);
        values.push(policy_violation_text);
        paramCount += 1;
      }
      if (nudge_message !== undefined) {
        fields.push(`nudge_message = $${paramCount}`);
        values.push(nudge_message);
        paramCount += 1;
        fields.push('last_nudge_at = CURRENT_TIMESTAMP');
      }
      if (verification_status === 'suspended') {
        fields.push('suspended_at = CURRENT_TIMESTAMP');
      }
      if (verification_status === 'disabled') {
        fields.push('disabled_at = CURRENT_TIMESTAMP');
      }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE businesses
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id,
                 name,
                 slug,
                 email,
                 verification_status AS "verificationStatus",
                 policy_violation_code AS "policyViolationCode",
                 policy_violation_text AS "policyViolationText",
                 nudge_message AS "nudgeMessage",
                 last_nudge_at AS "lastNudgeAt",
                 suspended_at AS "suspendedAt",
                 disabled_at AS "disabledAt"`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin review update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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
              verification_status,
              created_at AS "createdAt"
       FROM businesses
       ORDER BY created_at DESC`
    );

    const businesses = result.rows.map((business) => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      email: business.email,
      verification_status: resolveVerificationStatus(business),
      verificationStatus: resolveVerificationStatus(business),
      createdAt: business.createdAt,
    }));

    res.json(businesses);
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
              verification_status,
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

    const business = result.rows[0];
    res.json({
      id: business.id,
      name: business.name,
      slug: business.slug,
      tagline: business.tagline,
      logo: business.logo,
      email: business.email,
      verification_status: resolveVerificationStatus(business),
      verificationStatus: resolveVerificationStatus(business),
      communitySupportText: business.communitySupportText,
      communitySupportLinks: business.communitySupportLinks,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    });
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
       SET verification_status = 'active',
           suspended_at = NULL,
           disabled_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, slug, email, verification_status AS "verificationStatus"`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const business = result.rows[0];
    business.verification_status = business.verificationStatus;
    res.json(business);
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
       SET verification_status = 'suspended',
           suspended_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, slug, email, verification_status AS "verificationStatus"`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const business = result.rows[0];
    business.verification_status = business.verificationStatus;
    res.json(business);
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
