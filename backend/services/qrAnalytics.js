const db = require('../config/db');

const DEFAULT_RETENTION_DAYS = 180;

const getRetentionDays = () => {
  const parsed = Number.parseInt(process.env.QR_ANALYTICS_RETENTION_DAYS, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
};

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

const VALID_SOURCES = new Set(['qr', 'nfc', 'link']);

const logScan = async ({ businessSlug, ipAddress, userAgent, source = 'qr' }) => {
  try {
    const deviceType = detectDeviceType(userAgent);
    const safeSource = VALID_SOURCES.has(source) ? source : 'qr';

    await db.query(
      `INSERT INTO qr_scans (business_slug, source, ip_address, user_agent, device_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [businessSlug, safeSource, ipAddress, userAgent, deviceType]
    );
  } catch (error) {
    // Never let analytics logging break redirect requests.
    console.error('Failed to log scan:', error.message);
  }
};

const cleanupOldScans = async ({ retentionDays = getRetentionDays() } = {}) => {
  const days = Number.parseInt(retentionDays, 10);
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('retentionDays must be a positive integer');
  }

  const result = await db.query(
    `DELETE FROM qr_scans
     WHERE scanned_at < NOW() - ($1::int * INTERVAL '1 day')`,
    [days]
  );

  return { deletedCount: result.rowCount || 0, retentionDays: days };
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

  const bySourceResult = await db.query(
    `SELECT source, COUNT(*)::int AS count
     FROM qr_scans
     WHERE business_slug = $1
     GROUP BY source
     ORDER BY count DESC`,
    [businessSlug]
  );

  return {
    total: totalResult.rows[0]?.total || 0,
    weekly: weeklyResult.rows[0]?.weekly || 0,
    byDevice: byDeviceResult.rows,
    byDay: byDayResult.rows,
    bySource: bySourceResult.rows,
  };
};

module.exports = {
  DEFAULT_RETENTION_DAYS,
  cleanupOldScans,
  getRetentionDays,
  logScan,
  getScanStats
};
