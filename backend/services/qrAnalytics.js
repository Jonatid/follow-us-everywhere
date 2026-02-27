const db = require('../config/db');

/**
 * Log a QR code scan to the database.
 * Called every time someone scans a business QR code.
 */
async function logScan({ businessSlug, ipAddress, userAgent }) {
  try {
    const deviceType = detectDevice(userAgent);

    await db.query(
      `INSERT INTO qr_scans (business_slug, ip_address, user_agent, device_type, scanned_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [businessSlug, ipAddress, userAgent, deviceType]
    );
  } catch (error) {
    // Never let analytics logging crash the redirect
    console.error('QR scan logging error:', error.message);
  }
}

/**
 * Get scan summary for a business slug.
 * Used by the FUSE101 analytics dashboard.
 */
async function getScanStats(businessSlug) {
  const [total, weekly, byDevice, byDay] = await Promise.all([

    // Total scans all time
    db.query(
      `SELECT COUNT(*) AS total FROM qr_scans WHERE business_slug = $1`,
      [businessSlug]
    ),

    // Scans this week
    db.query(
      `SELECT COUNT(*) AS weekly
       FROM qr_scans
       WHERE business_slug = $1
         AND scanned_at >= NOW() - INTERVAL '7 days'`,
      [businessSlug]
    ),

    // Breakdown by device type
    db.query(
      `SELECT device_type, COUNT(*) AS count
       FROM qr_scans
       WHERE business_slug = $1
       GROUP BY device_type
       ORDER BY count DESC`,
      [businessSlug]
    ),

    // Daily scan counts for the last 30 days (for chart)
    db.query(
      `SELECT DATE(scanned_at) AS day, COUNT(*) AS count
       FROM qr_scans
       WHERE business_slug = $1
         AND scanned_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(scanned_at)
       ORDER BY day ASC`,
      [businessSlug]
    ),
  ]);

  return {
    total:    parseInt(total.rows[0].total),
    weekly:   parseInt(weekly.rows[0].weekly),
    byDevice: byDevice.rows,
    byDay:    byDay.rows,
  };
}

/**
 * Simple device detection from User-Agent string.
 */
function detectDevice(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod|android|mobile|blackberry|windows phone/.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad/.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

module.exports = { logScan, getScanStats };
