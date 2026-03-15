const express = require('express');
const { getSignedUploadUrl, getSignedDownloadUrl } = require('../services/r2');
const { authenticatePrivilegedUser } = require('../middleware/privileged-auth');
const { buildScopedKey, canAccessKey, normalizeObjectKey, sanitizeFilename } = require('../services/objectAccess');
const { uploadRateLimit, downloadRateLimit } = require('../services/requestRateLimit');

const router = express.Router();

const maxJsonBytes = Number(process.env.R2_SIGNED_URL_BODY_LIMIT_BYTES || 8 * 1024);
const parseSignedUrlBody = express.json({ limit: maxJsonBytes });

const parseSignedUploadBody = (req, res, next) => {
  parseSignedUrlBody(req, res, (err) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ message: 'Request is too large.', code: 'REQUEST_TOO_LARGE' });
    }

    if (err) {
      return res.status(400).json({ message: 'Invalid request body', code: 'BODY_INVALID' });
    }

    return next();
  });
};

// Final mounted URLs:
// GET  /api/r2/health
// POST /api/r2/upload (business/admin only)
// GET  /api/r2/download/* (business/admin only)
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.post('/upload', authenticatePrivilegedUser, uploadRateLimit, parseSignedUploadBody, async (req, res) => {
  try {
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType : undefined;
    const expiresInSeconds = req.body?.expiresInSeconds ? Number(req.body.expiresInSeconds) : undefined;
    const filename = sanitizeFilename(req.body?.filename || 'upload.bin');

    const key = buildScopedKey({ auth: req.auth, filename });
    if (!key) {
      return res.status(403).json({ message: 'Insufficient permissions', code: 'SCOPE_DENIED' });
    }

    const uploadUrl = await getSignedUploadUrl({ key, contentType, expiresInSeconds });
    return res.json({ key, uploadUrl, expiresIn: expiresInSeconds || 600 });
  } catch (error) {
    console.error('R2 upload URL error:', error);
    return res.status(500).json({ message: 'Failed to create upload URL', code: 'SIGNED_UPLOAD_FAILED' });
  }
});

router.get('/download/*', authenticatePrivilegedUser, downloadRateLimit, async (req, res) => {
  try {
    const requestedKey = normalizeObjectKey(req.params[0] || '');
    const expiresInSeconds = req.query.expiresInSeconds ? Number(req.query.expiresInSeconds) : undefined;
    const shouldRedirect = req.query.redirect === '1';
    const filename = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';

    if (!requestedKey) {
      return res.status(400).json({ message: 'key is required', code: 'KEY_REQUIRED' });
    }

    if (!canAccessKey({ auth: req.auth, key: requestedKey })) {
      return res.status(403).json({ message: 'Access denied for requested file', code: 'SCOPE_DENIED' });
    }

    const responseContentDisposition = filename
      ? `attachment; filename="${filename.replace(/["\r\n]/g, '_')}"`
      : undefined;

    const downloadUrl = await getSignedDownloadUrl({
      key: requestedKey,
      expiresInSeconds,
      responseContentDisposition,
    });

    if (shouldRedirect) {
      return res.redirect(downloadUrl);
    }

    return res.json({ key: requestedKey, downloadUrl, expiresIn: expiresInSeconds || 600 });
  } catch (error) {
    console.error('R2 download URL error:', error);
    return res.status(500).json({ message: 'Failed to create download URL', code: 'SIGNED_DOWNLOAD_FAILED' });
  }
});

router.get('/public-download/*', async (req, res) => {
  try {
    const requestedKey = normalizeObjectKey(req.params[0] || '');
    const expiresInSeconds = req.query.expiresInSeconds ? Number(req.query.expiresInSeconds) : undefined;
    const shouldRedirect = req.query.redirect === '1';

    if (!requestedKey) {
      return res.status(400).json({ message: 'key is required', code: 'KEY_REQUIRED' });
    }

    if (!requestedKey.startsWith('business-logos/')) {
      return res.status(403).json({ message: 'Access denied for requested file', code: 'SCOPE_DENIED' });
    }

    const downloadUrl = await getSignedDownloadUrl({
      key: requestedKey,
      expiresInSeconds,
    });

    if (shouldRedirect) {
      return res.redirect(downloadUrl);
    }

    return res.json({ key: requestedKey, downloadUrl, expiresIn: expiresInSeconds || 600 });
  } catch (error) {
    console.error('R2 public download URL error:', error);
    return res.status(500).json({ message: 'Failed to create download URL', code: 'SIGNED_DOWNLOAD_FAILED' });
  }
});

module.exports = router;
