const db = require('../config/db');

const detectDeviceType = (userAgent = '') => {
  const ua = String(userAgent).toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipod', 'blackberry', 'windows phone'];
  const tabletKeywords = ['tablet', 'ipad', 'kindle', 'playbook', 'silk'];

  if (mobileKeywords.some((keyword) => ua.includes(keyword))) {
    return 'mobile';
  }

  if (tabletKeywords.some((keyword) => ua.includes(keyword))) {
    return 'tablet';
  }

  return 'desktop';
};

const logScan = async ({ businessSlug, ipAddress, userAgent }) => {
  try {
    const deviceType = detectDeviceType(userAgent);

    await db.query(
      `INSERT INTO qr_scans (business_slug, ip_address, user_agent, device_type)
       VALUES ($1, $2, $3, $4)`,
      [businessSlug, ipAddress, userAgent, deviceType]
    );
  } catch (error) {
    // Never let analytics logging break QR redirect requests.
    console.error('Failed to log QR scan:', error.message);
  }
};

const getScanStats = async (businessSlug) => {
  const [totalResult, weeklyResult, byDeviceResult, byDayResult] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS total
       FROM qr_scans
       WHERE business_slug = $1`,
      [businessSlug]
    ),
    db.query(
      `SELECT COUNT(*)::int AS weekly
       FROM qr_scans
       WHERE business_slug = $1
         AND scanned_at >= NOW() - INTERVAL '7 days'`,
      [businessSlug]
    ),
    db.query(
      `SELECT device_type, COUNT(*)::int AS count
       FROM qr_scans
       WHERE business_slug = $1
       GROUP BY device_type
       ORDER BY count DESC`,
      [businessSlug]
    ),
    db.query(
      `SELECT TO_CHAR(DATE(scanned_at), 'YYYY-MM-DD') AS day,
              COUNT(*)::int AS count
       FROM qr_scans
       WHERE business_slug = $1
         AND scanned_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(scanned_at)
       ORDER BY DATE(scanned_at) ASC`,
      [businessSlug]
    )
  ]);

  return {
    total: totalResult.rows[0]?.total || 0,
    weekly: weeklyResult.rows[0]?.weekly || 0,
    byDevice: byDeviceResult.rows,
    byDay: byDayResult.rows
  };
};

module.exports = {
  logScan,
  getScanStats
};
