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

  try {
    const ipRateLimit = await enforceIpRateLimit({ routeScope: 'admin', ip: requestIp });
    if (ipRateLimit.blocked) {
      return res.status(429).json({ message: 'Too many attempts from this IP. Please try again later.' });
    }

    const accountAttempt = await getAccountAttempt({ routeScope: 'admin', emailNormalized });
    if (isAccountLocked(accountAttempt)) {
      return res
        .status(429)
        .json({ message: `Too many failed attempts. Try again in ${ACCOUNT_LOCKOUT_MINUTES} minutes.` });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM admins WHERE LOWER(email) = LOWER($1)',
      [emailNormalized]
    );

    if (result.rows.length === 0) {
      const failedAttempt = await recordFailedPasswordAttempt({
        routeScope: 'admin',
        emailNormalized,
        ip: requestIp,
      });
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

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      const failedAttempt = await recordFailedPasswordAttempt({
        routeScope: 'admin',
        emailNormalized,
        ip: requestIp,
      });
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

    await clearAccountFailedAttempts({ routeScope: 'admin', emailNormalized });

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
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
