const express = require('express');
const { logScan, getScanStats } = require('../services/qrAnalytics');

const router = express.Router();

<<<<<<< HEAD
// ─── Public: QR Code Redirect ─────────────────────────────────────────────────
// This is the URL encoded in every QR code: fuse101.com/qr/:slug
// It logs the scan then redirects to the Follow Us Everywhere landing page.
//
// Final mounted URL: GET /qr/:slug
// Example:          GET /qr/detroit-coffee-co

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  // Log the scan (fire-and-forget — never blocks the redirect)
  logScan({
    businessSlug: slug,
    ipAddress:    req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                  || req.socket.remoteAddress
                  || 'unknown',
    userAgent:    req.headers['user-agent'] || 'unknown',
  });

  // Redirect to the Follow Us Everywhere landing page
  // Update this base URL to wherever you host the landing page
  const landingPageBase = process.env.LANDING_PAGE_URL || 'https://fuse101.com/business';
  return res.redirect(302, `${landingPageBase}/${slug}`);
});


// ─── Authenticated: Get scan analytics for a business ────────────────────────
// Called by the FUSE101 dashboard to show a business their scan stats.
//
// Final mounted URL: GET /qr/analytics/:slug
// Requires:         JWT auth middleware (add your existing auth middleware here)

router.get('/analytics/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const stats = await getScanStats(slug);
    return res.json({ ok: true, slug, stats });
  } catch (error) {
    console.error('QR analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch scan analytics' });
  }
});


=======
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

>>>>>>> fa74d675ffb53a5d2acf1ae802be63958781d59f
module.exports = router;
