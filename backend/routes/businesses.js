const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { resolveVerificationStatus, buildAccountRestrictionError } = require('../utils/verification');
const { getPublicBusinessBySlug } = require('../utils/publicBusinessProfile');

const router = express.Router();


const uploadRootDir = path.join(__dirname, '..', 'uploads', 'business_documents');

const allowedDocumentTypes = new Set(['lara', 'incorporation', 'insurance', 'other']);
const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const businessDir = path.join(uploadRootDir, String(req.businessId));
    fs.mkdirSync(businessDir, { recursive: true });
    cb(null, businessDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  }
});


const logoUploadRootDir = path.join(__dirname, '..', 'uploads', 'business_logos');
fs.mkdirSync(logoUploadRootDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logoUploadRootDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname || '').toLowerCase();
    const safeExtension = ['.jpg', '.jpeg', '.png', '.webp'].includes(extension) ? extension : '';
    const safeBaseName = path.basename(file.originalname || 'logo', extension).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'logo';
    cb(null, `${req.businessId}-${timestamp}-${safeBaseName}${safeExtension}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Unsupported logo file type'));
    }
    cb(null, true);
  }
});

const buildLogoPublicUrl = (req, filename) => {
  if (!filename) {
    return null;
  }
  const basePath = `/uploads/business_logos/${filename}`;
  return basePath;
};

const handleDocumentUpload = (req, res) => {
  documentUpload.single('document')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File exceeds 10MB limit' });
      }
      return res.status(400).json({ error: uploadErr.message || 'Invalid upload' });
    }

    try {
      const { document_type, notes } = req.body;

      if (!document_type || !allowedDocumentTypes.has(document_type)) {
        return res.status(400).json({ error: 'Invalid document_type' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Document file is required' });
      }

      const storagePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

      const result = await pool.query(
        `INSERT INTO business_documents (
           business_id,
           document_type,
           original_file_name,
           stored_file_name,
           storage_provider,
           storage_path,
           mime_type,
           file_size,
           status,
           notes
         )
         VALUES ($1, $2, $3, $4, 'local', $5, $6, $7, 'Pending', $8)
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
          req.businessId,
          document_type,
          req.file.originalname,
          req.file.filename,
          storagePath,
          req.file.mimetype,
          req.file.size,
          notes || null
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error uploading business document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });
};

// Upload a business verification document
router.post('/documents', authenticateToken, handleDocumentUpload);
router.post('/documents/upload', authenticateToken, handleDocumentUpload);

// List documents for authenticated business
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
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
              notes
       FROM business_documents
       WHERE business_id = $1
       ORDER BY submitted_at DESC`,
      [req.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing business documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.get('/documents/:id/download', authenticateToken, async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ error: 'Invalid document id' });
    }

    const result = await pool.query(
      `SELECT id, business_id AS "businessId", original_file_name AS "originalFileName", storage_path AS "storagePath", mime_type AS "mimeType"
       FROM business_documents
       WHERE id = $1 AND business_id = $2`,
      [documentId, req.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];
    const absolutePath = path.join(__dirname, '..', document.storagePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Stored file not found' });
    }

    res.download(absolutePath, document.originalFileName);
  } catch (error) {
    console.error('Error downloading business document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});


// Get public business profile by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const business = await getPublicBusinessBySlug(slug);

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    return res.json(business);
  } catch (error) {
    console.error('Error fetching business:', error);
    return res.status(500).json({ error: 'Failed to fetch business' });
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
    body('logo_url')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 2048 })
      .withMessage('Logo URL must be 2048 characters or less'),
    body('lara_number')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage('LARA number must be 255 characters or less'),
    body('mission_statement')
      .optional({ nullable: true })
      .isLength({ max: 300 })
      .withMessage('Mission statement must be 300 characters or less'),
    body('vision_statement')
      .optional({ nullable: true })
      .isLength({ max: 300 })
      .withMessage('Vision statement must be 300 characters or less'),
    body('philanthropic_goals')
      .optional({ nullable: true })
      .isLength({ max: 300 })
      .withMessage('Philanthropic goals must be 300 characters or less'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, tagline, logo, logo_url, lara_number, mission_statement, vision_statement, philanthropic_goals } = req.body;

      const statusResult = await pool.query(
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

      if (logo_url !== undefined) {
        fields.push(`logo_url = $${paramCount}`);
        values.push(logo_url === null ? null : logo_url);
        paramCount++;
      }

      if (lara_number !== undefined) {
        fields.push(`lara_number = $${paramCount}`);
        values.push(lara_number === null ? null : lara_number);
        paramCount++;
      }

      if (mission_statement !== undefined) {
        fields.push(`mission_statement = $${paramCount}`);
        values.push(mission_statement === null ? null : mission_statement);
        paramCount++;
      }

      if (vision_statement !== undefined) {
        fields.push(`vision_statement = $${paramCount}`);
        values.push(vision_statement === null ? null : vision_statement);
        paramCount++;
      }

      if (philanthropic_goals !== undefined) {
        fields.push(`philanthropic_goals = $${paramCount}`);
        values.push(philanthropic_goals === null ? null : philanthropic_goals);
        paramCount++;
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.businessId);

      const query = `
        UPDATE businesses
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id,
                  name,
                  slug,
                  tagline,
                  logo,
                  logo_url,
                  lara_number,
                  email,
                  verification_status,
                  suspended_at,
                  disabled_at,
                  last_nudge_at,
                  nudge_message,
                  policy_violation_code,
                  policy_violation_text,
                  community_support_text,
                  community_support_links,
                  mission_statement,
                  vision_statement,
                  philanthropic_goals,
                  created_at,
                  updated_at
      `;

      const result = await pool.query(query, values);

      const updatedBusiness = result.rows[0];
      updatedBusiness.verificationStatus = updatedBusiness.verification_status;

      res.json({
        message: 'Profile updated successfully',
        business: updatedBusiness,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);


router.post('/logo/upload', authenticateToken, (req, res) => {
  logoUpload.single('logo')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Logo exceeds 5MB limit' });
      }
      return res.status(400).json({ error: uploadErr.message || 'Invalid logo upload' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Logo file is required' });
    }

    const logoUrl = buildLogoPublicUrl(req, req.file.filename);

    try {
      const result = await pool.query(
        `UPDATE businesses
         SET logo_url = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, name, slug, logo, logo_url`,
        [logoUrl, req.businessId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('[business-logo-upload]', {
          businessId: req.businessId,
          filename: req.file.filename,
          logoUrl,
          rowCount: result.rowCount,
        });
      }

      return res.status(200).json({
        message: 'Logo uploaded successfully',
        logo_url: logoUrl,
        business: result.rows[0],
      });
    } catch (error) {
      console.error('Error uploading business logo:', error);
      return res.status(500).json({ error: 'Failed to upload logo' });
    }
  });
});

module.exports = router;
