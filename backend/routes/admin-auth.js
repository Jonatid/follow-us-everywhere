const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const {
  ACCOUNT_LOCKOUT_MINUTES,
  clearAccountFailedAttempts,
  enforceIpRateLimit,
  getAccountAttempt,
  getFailedAttemptDelay,
  getRequestIp,
  isAccountLocked,
  normalizeEmail,
  recordFailedPasswordAttempt,
  sleep,
} = require('../services/loginProtection');

const router = express.Router();

// @route   POST /api/admin/auth/login
// @desc    Login admin
// @access  Public
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const emailNormalized = normalizeEmail(email);
  const requestIp = getRequestIp(req);

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const ipRateLimit = await enforceIpRateLimit(client, { routeScope: 'admin', ip: requestIp });
    if (ipRateLimit.blocked) {
      await client.query('ROLLBACK');
      return res.status(429).json({ message: 'Too many attempts from this IP. Please try again later.' });
    }

    const accountAttempt = await getAccountAttempt(client, { routeScope: 'admin', emailNormalized });
    if (isAccountLocked(accountAttempt)) {
      await client.query('ROLLBACK');
      return res
        .status(429)
        .json({ message: `Too many failed attempts. Try again in ${ACCOUNT_LOCKOUT_MINUTES} minutes.` });
    }

    const result = await client.query(
      'SELECT id, name, email, password_hash FROM admins WHERE LOWER(email) = LOWER($1)',
      [emailNormalized]
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      await sleep(getFailedAttemptDelay(1));
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      const failedAttempt = await recordFailedPasswordAttempt(client, {
        routeScope: 'admin',
        emailNormalized,
        ip: requestIp,
      });
      await client.query('COMMIT');
      await sleep(getFailedAttemptDelay(failedAttempt.failCount));

      if (failedAttempt.warning) {
        return res.status(400).json({ message: 'Warning: 1 attempt remaining before temporary lockout.' });
      }

      if (failedAttempt.locked) {
        return res
          .status(429)
          .json({ message: `Too many failed attempts. Try again in ${ACCOUNT_LOCKOUT_MINUTES} minutes.` });
      }

      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await clearAccountFailedAttempts(client, { routeScope: 'admin', emailNormalized });
    await client.query('COMMIT');

    const payload = { adminId: admin.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Transaction may already be finalized.
      }
    }
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
