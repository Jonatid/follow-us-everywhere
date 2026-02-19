const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { authenticateAdminToken } = require('../middleware/admin-auth');

const router = express.Router();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

// Badge catalog (public)
router.get('/badges', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, description, category
       FROM badges
       WHERE is_active = true
       ORDER BY category ASC, name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List badges error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Business: create badge request
router.post(
  '/business/badges/request',
  authenticateToken,
  [
    body('badge_id').isInt({ gt: 0 }),
    body('business_notes').optional({ nullable: true }).isLength({ max: 2000 }),
    body('linked_document_id').optional({ nullable: true }).isInt({ gt: 0 })
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) {
      return;
    }

    const { badge_id, business_notes, linked_document_id } = req.body;

    try {
      const badgeResult = await pool.query('SELECT id, name, slug, description, category FROM badges WHERE id = $1 AND is_active = true', [badge_id]);
      if (badgeResult.rows.length === 0) {
        return res.status(404).json({ message: 'Badge not found' });
      }

      if (linked_document_id) {
        const documentResult = await pool.query(
          `SELECT id, business_id AS "businessId", document_type AS "documentType", original_file_name AS "originalFileName", status
           FROM business_documents
           WHERE id = $1 AND business_id = $2`,
          [linked_document_id, req.businessId]
        );

        if (documentResult.rows.length === 0) {
          return res.status(400).json({ message: 'linked_document_id must belong to your business' });
        }
      }

      const existingGranted = await pool.query(
        'SELECT id FROM business_badges WHERE business_id = $1 AND badge_id = $2 LIMIT 1',
        [req.businessId, badge_id]
      );

      if (existingGranted.rows.length > 0) {
        return res.status(409).json({ message: 'Badge already verified for this business' });
      }

      const existingPending = await pool.query(
        `SELECT id
         FROM badge_requests
         WHERE business_id = $1 AND badge_id = $2 AND status = 'Pending'
         LIMIT 1`,
        [req.businessId, badge_id]
      );

      if (existingPending.rows.length > 0) {
        return res.status(409).json({ message: 'A pending request already exists for this badge' });
      }

      const inserted = await pool.query(
        `INSERT INTO badge_requests (
           business_id, badge_id, request_type, status, business_notes, linked_document_id
         )
         VALUES ($1, $2, 'badge', 'Pending', $3, $4)
         RETURNING id,
                   business_id AS "businessId",
                   badge_id AS "badgeId",
                   request_type AS "requestType",
                   status,
                   submitted_at AS "submittedAt",
                   reviewed_at AS "reviewedAt",
                   reviewed_by_admin_id AS "reviewedByAdminId",
                   business_notes AS "businessNotes",
                   admin_notes AS "adminNotes",
                   rejection_reason AS "rejectionReason",
                   linked_document_id AS "linkedDocumentId"`,
        [req.businessId, badge_id, business_notes || null, linked_document_id || null]
      );

      res.status(201).json({
        ...inserted.rows[0],
        badge: badgeResult.rows[0]
      });
    } catch (error) {
      console.error('Create badge request error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Business: list own badge requests
router.get('/business/badge-requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT br.id,
              br.business_id AS "businessId",
              br.badge_id AS "badgeId",
              br.request_type AS "requestType",
              br.status,
              br.submitted_at AS "submittedAt",
              br.reviewed_at AS "reviewedAt",
              br.reviewed_by_admin_id AS "reviewedByAdminId",
              br.business_notes AS "businessNotes",
              br.admin_notes AS "adminNotes",
              br.rejection_reason AS "rejectionReason",
              br.linked_document_id AS "linkedDocumentId",
              b.slug AS "badgeSlug",
              b.name AS "badgeName",
              b.description AS "badgeDescription",
              b.category AS "badgeCategory",
              bd.document_type AS "linkedDocumentType",
              bd.original_file_name AS "linkedDocumentOriginalFileName",
              bd.status AS "linkedDocumentStatus",
              bd.submitted_at AS "linkedDocumentSubmittedAt"
       FROM badge_requests br
       JOIN badges b ON b.id = br.badge_id
       LEFT JOIN business_documents bd ON bd.id = br.linked_document_id
       WHERE br.business_id = $1
       ORDER BY br.submitted_at DESC`,
      [req.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List business badge requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: list badge requests
router.get(
  '/admin/badge-requests',
  authenticateAdminToken,
  [query('status').optional().isIn(['Pending', 'Approved', 'Rejected'])],
  async (req, res) => {
    if (!handleValidation(req, res)) {
      return;
    }

    const values = [];
    const where = [];

    if (req.query.status) {
      values.push(req.query.status);
      where.push(`br.status = $${values.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    try {
      const result = await pool.query(
        `SELECT br.id,
                br.business_id AS "businessId",
                biz.name AS "businessName",
                biz.slug AS "businessSlug",
                br.badge_id AS "badgeId",
                b.slug AS "badgeSlug",
                b.name AS "badgeName",
                b.description AS "badgeDescription",
                b.category AS "badgeCategory",
                br.request_type AS "requestType",
                br.status,
                br.submitted_at AS "submittedAt",
                br.reviewed_at AS "reviewedAt",
                br.reviewed_by_admin_id AS "reviewedByAdminId",
                br.business_notes AS "businessNotes",
                br.admin_notes AS "adminNotes",
                br.rejection_reason AS "rejectionReason",
                br.linked_document_id AS "linkedDocumentId",
                bd.document_type AS "linkedDocumentType",
                bd.original_file_name AS "linkedDocumentOriginalFileName",
                bd.status AS "linkedDocumentStatus",
                bd.submitted_at AS "linkedDocumentSubmittedAt"
         FROM badge_requests br
         JOIN businesses biz ON biz.id = br.business_id
         JOIN badges b ON b.id = br.badge_id
         LEFT JOIN business_documents bd ON bd.id = br.linked_document_id
         ${whereClause}
         ORDER BY br.submitted_at DESC`,
        values
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Admin list badge requests error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: review badge request
router.patch(
  '/admin/badge-requests/:id/review',
  authenticateAdminToken,
  [
    body('status').isIn(['Approved', 'Rejected']),
    body('admin_notes').optional({ nullable: true }).isLength({ max: 2000 }),
    body('rejection_reason').optional({ nullable: true }).isLength({ max: 2000 })
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) {
      return;
    }

    const { status, admin_notes, rejection_reason } = req.body;
    if (status === 'Rejected' && (!rejection_reason || !String(rejection_reason).trim())) {
      return res.status(400).json({ message: 'rejection_reason is required when rejecting a request' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        `SELECT id, business_id AS "businessId", badge_id AS "badgeId", status
         FROM badge_requests
         WHERE id = $1
         FOR UPDATE`,
        [req.params.id]
      );

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Badge request not found' });
      }

      const requestRow = requestResult.rows[0];

      const reviewed = await client.query(
        `UPDATE badge_requests
         SET status = $1,
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by_admin_id = $2,
             admin_notes = $3,
             rejection_reason = $4
         WHERE id = $5
         RETURNING id,
                   business_id AS "businessId",
                   badge_id AS "badgeId",
                   request_type AS "requestType",
                   status,
                   submitted_at AS "submittedAt",
                   reviewed_at AS "reviewedAt",
                   reviewed_by_admin_id AS "reviewedByAdminId",
                   business_notes AS "businessNotes",
                   admin_notes AS "adminNotes",
                   rejection_reason AS "rejectionReason",
                   linked_document_id AS "linkedDocumentId"`,
        [
          status,
          req.adminId,
          admin_notes || null,
          status === 'Rejected' ? String(rejection_reason).trim() : null,
          req.params.id
        ]
      );

      if (status === 'Approved') {
        await client.query(
          `INSERT INTO business_badges (
             business_id,
             badge_id,
             awarded_by_admin_id,
             granted_by_admin_id,
             source_badge_request_id
           )
           VALUES ($1, $2, $3, $3, $4)
           ON CONFLICT (business_id, badge_id)
           DO UPDATE SET awarded_by_admin_id = EXCLUDED.awarded_by_admin_id,
                         granted_by_admin_id = EXCLUDED.granted_by_admin_id,
                         granted_at = CURRENT_TIMESTAMP,
                         awarded_at = CURRENT_TIMESTAMP,
                         source_badge_request_id = EXCLUDED.source_badge_request_id`,
          [requestRow.businessId, requestRow.badgeId, req.adminId, req.params.id]
        );
      }

      await client.query('COMMIT');
      res.json(reviewed.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Admin review badge request error:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  }
);

// Admin: create badge
router.post(
  '/admin/badges',
  authenticateAdminToken,
  [
    body('slug').trim().isLength({ min: 2, max: 255 }).matches(/^[a-z0-9-]+$/),
    body('name').trim().isLength({ min: 1, max: 120 }),
    body('description').trim().isLength({ min: 1, max: 500 }),
    body('category').trim().isLength({ min: 1, max: 100 })
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) {
      return;
    }

    const { slug, name, description, category } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO badges (slug, name, description, category, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, slug, name, description, category, is_active AS "isActive", created_at AS "createdAt"`,
        [slug.trim().toLowerCase(), name.trim(), description.trim(), category.trim()]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Admin create badge (phase4) error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Badge slug already exists' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Public impact endpoint
router.get('/public/businesses/:id/impact', async (req, res) => {
  try {
    const businessId = Number(req.params.id);
    if (!Number.isInteger(businessId) || businessId < 1) {
      return res.status(400).json({ message: 'Invalid business id' });
    }

    const verifiedBadgesResult = await pool.query(
      `SELECT b.id,
              b.slug,
              b.name,
              b.description,
              b.category,
              bb.granted_at AS "grantedAt"
       FROM business_badges bb
       JOIN badges b ON b.id = bb.badge_id
       WHERE bb.business_id = $1
       ORDER BY bb.granted_at DESC, b.name ASC`,
      [businessId]
    );

    res.json({
      businessId,
      summary: {
        verifiedActionsCount: verifiedBadgesResult.rows.length,
        label: 'Community Impact'
      },
      verified_badges: verifiedBadgesResult.rows
    });
  } catch (error) {
    console.error('Public business impact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
