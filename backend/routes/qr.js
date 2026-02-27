const express = require('express');
const { logScan, getScanStats } = require('../services/qrAnalytics');

const router = express.Router();

router.get('/:slug', (req, res) => {
  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim() : '';
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  logScan({
    businessSlug: slug,
    ipAddress,
    userAgent
  });

  const landingPageUrl = process.env.LANDING_PAGE_URL || 'https://fuse101.com/business';
  return res.redirect(302, `${landingPageUrl}/${slug}`);
});

router.get('/analytics/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const stats = await getScanStats(slug);
    return res.json({ ok: true, slug, stats });
  } catch (error) {
    console.error('Failed to fetch QR analytics:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Failed to fetch QR analytics' });
  }
});

module.exports = router;
