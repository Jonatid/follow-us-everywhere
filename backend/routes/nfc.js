const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');

const router = express.Router();

const CHIP_TYPES = ['NTAG213', 'NTAG215', 'NTAG216', 'MIFARE'];
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://fuse101.com';

const buildNfcUrl = (slug) =>
  `${PUBLIC_SITE_URL}/qr/${encodeURIComponent(slug)}?src=nfc`;

// GET /api/nfc/devices — list this business's NFC devices
router.get('/devices', async (req, res) => {
  try {
    const slugResult = await pool.query(
      'SELECT slug FROM businesses WHERE id = $1',
      [req.businessId]
    );

    if (slugResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const result = await pool.query(
      `SELECT id, label, chip_type, encoded_url, is_active, created_at, updated_at
       FROM nfc_devices
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [req.businessId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('NFC devices fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch NFC devices' });
  }
});

// POST /api/nfc/devices — register a new NFC device
router.post(
  '/devices',
  [
    body('label').trim().isLength({ min: 1, max: 100 }).withMessage('Label is required (max 100 chars)'),
    body('chip_type').optional().isIn(CHIP_TYPES).withMessage(`chip_type must be one of: ${CHIP_TYPES.join(', ')}`),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { label, chip_type = 'NTAG213' } = req.body;

    try {
      const slugResult = await pool.query(
        'SELECT slug FROM businesses WHERE id = $1',
        [req.businessId]
      );

      if (slugResult.rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const { slug } = slugResult.rows[0];
      const encodedUrl = buildNfcUrl(slug);

      const result = await pool.query(
        `INSERT INTO nfc_devices (business_id, label, chip_type, encoded_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, label, chip_type, encoded_url, is_active, created_at, updated_at`,
        [req.businessId, label.trim(), chip_type, encodedUrl]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('NFC device create error:', error);
      res.status(500).json({ error: 'Failed to register NFC device' });
    }
  }
);

// PUT /api/nfc/devices/:id — rename or toggle active state
router.put(
  '/devices/:id',
  [
    body('label').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Label must be 1-100 chars'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { label, is_active } = req.body;

    const fields = [];
    const values = [];
    let p = 1;

    if (label !== undefined) { fields.push(`label = $${p++}`); values.push(label.trim()); }
    if (is_active !== undefined) { fields.push(`is_active = $${p++}`); values.push(Boolean(is_active)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, req.businessId);

    try {
      const result = await pool.query(
        `UPDATE nfc_devices
         SET ${fields.join(', ')}
         WHERE id = $${p} AND business_id = $${p + 1}
         RETURNING id, label, chip_type, encoded_url, is_active, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'NFC device not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('NFC device update error:', error);
      res.status(500).json({ error: 'Failed to update NFC device' });
    }
  }
);

// DELETE /api/nfc/devices/:id
router.delete('/devices/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM nfc_devices WHERE id = $1 AND business_id = $2 RETURNING id',
      [req.params.id, req.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NFC device not found' });
    }

    res.json({ message: 'NFC device removed' });
  } catch (error) {
    console.error('NFC device delete error:', error);
    res.status(500).json({ error: 'Failed to remove NFC device' });
  }
});

// GET /api/nfc/devices/:id/stats — tap stats for a single device
// Pulls from qr_scans using the business slug + source=nfc
router.get('/devices/:id/stats', async (req, res) => {
  try {
    const deviceResult = await pool.query(
      `SELECT nd.id, nd.label, nd.created_at, b.slug
       FROM nfc_devices nd
       JOIN businesses b ON b.id = nd.business_id
       WHERE nd.id = $1 AND nd.business_id = $2`,
      [req.params.id, req.businessId]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'NFC device not found' });
    }

    const { slug, label, created_at } = deviceResult.rows[0];

    const [totalResult, weeklyResult, byDayResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM qr_scans
         WHERE business_slug = $1 AND source = 'nfc'`,
        [slug]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS weekly FROM qr_scans
         WHERE business_slug = $1 AND source = 'nfc'
           AND scanned_at >= NOW() - INTERVAL '7 days'`,
        [slug]
      ),
      pool.query(
        `SELECT TO_CHAR(DATE(scanned_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM qr_scans
         WHERE business_slug = $1 AND source = 'nfc'
           AND scanned_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(scanned_at)
         ORDER BY DATE(scanned_at) ASC`,
        [slug]
      ),
    ]);

    res.json({
      deviceLabel: label,
      registeredAt: created_at,
      stats: {
        total: totalResult.rows[0]?.total || 0,
        weekly: weeklyResult.rows[0]?.weekly || 0,
        byDay: byDayResult.rows,
      },
    });
  } catch (error) {
    console.error('NFC stats error:', error);
    res.status(500).json({ error: 'Failed to fetch NFC stats' });
  }
});

module.exports = router;
