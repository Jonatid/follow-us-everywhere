const express = require('express');
const multer = require('multer');
const { uploadBuffer } = require('../services/r2');
const { authenticatePrivilegedUser } = require('../middleware/privileged-auth');
const { buildScopedKey } = require('../services/objectAccess');
const { uploadRateLimit } = require('../services/requestRateLimit');

const router = express.Router();

const uploadLimitBytes = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024);
const multipartUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadLimitBytes, files: 1 },
});

router.post('/upload', authenticatePrivilegedUser, uploadRateLimit, (req, res) => {
  multipartUpload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File exceeds the maximum allowed size.', code: 'FILE_TOO_LARGE' });
      }
      return res.status(400).json({ message: uploadErr.message || 'Invalid upload request', code: 'UPLOAD_INVALID' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded. Use multipart/form-data with field name "file".', code: 'FILE_REQUIRED' });
      }

      const key = buildScopedKey({ auth: req.auth, filename: req.file.originalname });
      await uploadBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });

      return res.status(201).json({ message: 'File uploaded successfully', key });
    } catch (error) {
      console.error('Upload endpoint error:', error);
      return res.status(500).json({ message: 'Failed to upload file', code: 'UPLOAD_FAILED' });
    }
  });
});

module.exports = router;
