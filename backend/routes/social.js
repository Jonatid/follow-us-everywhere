const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const zernioService = require('../services/zernioService');

const router = express.Router();

router.use(authenticateToken);

router.get('/status', async (req, res) => {
  const hasApiKey = Boolean((process.env.ZERNIO_API_KEY || '').trim());

  res.json({
    enabled: hasApiKey,
    provider: 'zernio',
    businessId: req.businessId,
    message: hasApiKey ? 'Zernio integration is configured.' : 'Missing ZERNIO_API_KEY. Set it in backend/.env to enable Zernio features.',
  });
});

router.post('/connect', async (req, res) => {
  try {
    const { platform, accountHandle } = req.body || {};

    if (!platform || !accountHandle) {
      return res.status(400).json({ error: 'platform and accountHandle are required.' });
    }

    const result = await zernioService.connectAccount({
      businessId: req.businessId,
      platform,
      accountHandle,
    });

    console.log('[social/connect] Saved social account to PostgreSQL', {
      businessId: req.businessId,
      accountId: result.id,
      platform: result.platform,
      accountHandle: result.accountHandle,
      status: result.status,
    });

    return res.status(201).json({ success: true, connection: result });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Failed to connect account.' });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const { content, platforms } = req.body || {};

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required.' });
    }

    const result = await zernioService.createPost({
      businessId: req.businessId,
      content,
      platforms: Array.isArray(platforms) ? platforms : [],
    });

    return res.status(201).json({ success: true, post: result });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Failed to create post.' });
  }
});

router.get('/posts/history', async (req, res) => {
  try {
    const posts = await zernioService.getPostHistory({ businessId: req.businessId });
    return res.json({ success: true, posts });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Failed to fetch post history.' });
  }
});

module.exports = router;
