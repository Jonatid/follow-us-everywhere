const express = require('express');
const { getSignedUploadUrl, getSignedDownloadUrl } = require('../services/r2');

const router = express.Router();

// Final mounted URLs:
// GET  /api/r2/health
// POST /api/r2/upload
// GET  /api/r2/download/*
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.post('/upload', async (req, res) => {
  try {
    const { key, contentType, expiresInSeconds } = req.body || {};

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const uploadUrl = await getSignedUploadUrl({ key, contentType, expiresInSeconds });

    return res.json({ key, uploadUrl, expiresIn: expiresInSeconds || 600 });
  } catch (error) {
    console.error('R2 upload URL error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create upload URL' });
  }
});

router.get('/download/*', async (req, res) => {
  try {
    const key = (req.params[0] || '').trim();
    const expiresInSeconds = req.query.expiresInSeconds ? Number(req.query.expiresInSeconds) : undefined;
    const shouldRedirect = req.query.redirect === '1';
    const filename = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const responseContentDisposition = filename
      ? `attachment; filename="${filename.replace(/["\r\n]/g, '_')}"`
      : undefined;

    const downloadUrl = await getSignedDownloadUrl({ key, expiresInSeconds, responseContentDisposition });

    if (shouldRedirect) {
      return res.redirect(downloadUrl);
    }

    return res.json({ key, downloadUrl, expiresIn: expiresInSeconds || 600 });
  } catch (error) {
    console.error('R2 download URL error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create download URL' });
  }
});

module.exports = router;
