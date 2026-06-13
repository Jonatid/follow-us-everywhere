require('dotenv').config();
const pool = require('../config/db');
const { cleanupOldScans, getRetentionDays } = require('../services/qrAnalytics');

const cleanup = async () => {
  try {
    const retentionDays = getRetentionDays();
    const result = await cleanupOldScans({ retentionDays });
    console.log(`Deleted ${result.deletedCount} QR scan rows older than ${retentionDays} days.`);
  } catch (error) {
    console.error('Failed to clean up QR analytics:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

cleanup();
