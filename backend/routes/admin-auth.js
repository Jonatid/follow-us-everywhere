const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateAdminToken } = require('../middleware/admin-auth');
const {
  BACKUP_CODES_COUNT,
  buildOtpAuthUri,
  createEnrollmentToken,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  makeBackupCodes,
  verifyBackupCode,
  verifyEnrollmentToken,
  verifyTotpCode,
} = require('../services/admin2fa');
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

const getInvalidSecondFactorMessage = () => 'Invalid verification code';

const sendFailedAttemptResponse = async ({ req, res, emailNormalized }) => {
  const failedAttempt = await recordFailedPasswordAttempt({
    routeScope: 'admin',
    emailNormalized,
    ip: getRequestIp(req),
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

  return res.status(400).json({ message: getInvalidSecondFactorMessage() });
};

const issueAdminToken = (admin) => {
  const payload = { adminId: admin.id, tokenVersion: Number(admin.token_version || 0) };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};


const adminLogoutHandler = async (req, res) => {
  try {
    await pool.query(
      `UPDATE admins
       SET token_version = token_version + 1
       WHERE id = $1`,
      [req.adminId]
    );

    return res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Admin logout error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const finalizeEnrollment = async (req, res) => {
  const { enrollmentToken, totpCode } = req.body;

  if (!enrollmentToken || !totpCode) {
    return res.status(400).json({ message: 'Enrollment token and 6-digit code are required.' });
  }

  let tokenPayload;
  try {
    tokenPayload = verifyEnrollmentToken(enrollmentToken);
  } catch (error) {
    return res.status(400).json({ message: 'Enrollment token is invalid or expired.' });
  }

  const result = await pool.query(
    `SELECT id, name, email, totp_enabled, totp_secret_encrypted, totp_last_verified_step, token_version
     FROM admins
     WHERE id = $1`,
    [tokenPayload.adminId]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ message: 'Admin account was not found for enrollment.' });
  }

  const admin = result.rows[0];
  if (admin.totp_enabled) {
    return res.status(400).json({ message: 'Two-factor authentication is already enabled.' });
  }

  if (!admin.totp_secret_encrypted) {
    return res.status(400).json({ message: 'No pending 2FA enrollment found. Please restart login.' });
  }

  const totpSecret = decryptSecret(admin.totp_secret_encrypted);
  const totpVerification = verifyTotpCode({ secret: totpSecret, code: totpCode });

  if (!totpVerification.valid) {
    return res.status(400).json({ message: getInvalidSecondFactorMessage() });
  }

  const { plainCodes, hashedCodes } = makeBackupCodes();
  await pool.query(
    `UPDATE admins
     SET totp_enabled = TRUE,
         totp_enrolled_at = CURRENT_TIMESTAMP,
         backup_codes_hashed = $2::jsonb,
         backup_codes_generated_at = CURRENT_TIMESTAMP,
         totp_last_verified_step = $3
     WHERE id = $1`,
    [admin.id, JSON.stringify(hashedCodes), totpVerification.step]
  );

  console.log('[admin-security] enrollment completed', { adminId: admin.id, email: admin.email });

  const token = issueAdminToken(admin);
  return res.json({
    token,
    backupCodes: plainCodes,
    backupCodesCount: BACKUP_CODES_COUNT,
    message: 'Two-factor enrollment complete. Save your backup codes now.',
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
    },
  });
};

const adminLoginHandler = async (req, res) => {
  if (req.body?.enrollmentToken) {
    try {
      return await finalizeEnrollment(req, res);
    } catch (err) {
      console.error('Admin enrollment finalization error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  const { email, password, totpCode, backupCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

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
      `SELECT id,
              name,
              email,
              password_hash,
              totp_enabled,
              totp_secret_encrypted,
              backup_codes_hashed,
              totp_last_verified_step,
              token_version
       FROM admins
       WHERE LOWER(email) = LOWER($1)`,
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

    if (!admin.totp_enabled) {
      const totpSecret = generateTotpSecret();
      const encryptedSecret = encryptSecret(totpSecret);

      await pool.query(
        `UPDATE admins
         SET totp_secret_encrypted = $2,
             totp_enabled = FALSE
         WHERE id = $1`,
        [admin.id, encryptedSecret]
      );

      console.log('[admin-security] enrollment started', { adminId: admin.id, email: admin.email });

      return res.json({
        requires2faEnrollment: true,
        message: 'Two-factor authentication is required before continuing.',
        enrollment: {
          enrollmentToken: createEnrollmentToken({ adminId: admin.id }),
          otpauthUri: buildOtpAuthUri({ secret: totpSecret, email: admin.email }),
        },
      });
    }

    if (!totpCode && !backupCode) {
      return res.status(400).json({
        requires2fa: true,
        message: 'Enter your 6-digit code.',
      });
    }

    if (totpCode) {
      const secret = decryptSecret(admin.totp_secret_encrypted);
      const verification = verifyTotpCode({ secret, code: totpCode });

      if (!verification.valid || (admin.totp_last_verified_step !== null && verification.step <= Number(admin.totp_last_verified_step))) {
        return sendFailedAttemptResponse({ req, res, emailNormalized });
      }

      await pool.query('UPDATE admins SET totp_last_verified_step = $2 WHERE id = $1', [admin.id, verification.step]);
    } else {
      const backupResult = verifyBackupCode({
        providedCode: backupCode,
        storedCodes: admin.backup_codes_hashed,
      });

      if (!backupResult.valid) {
        return sendFailedAttemptResponse({ req, res, emailNormalized });
      }

      await pool.query(
        `UPDATE admins
         SET backup_codes_hashed = $2::jsonb
         WHERE id = $1`,
        [admin.id, JSON.stringify(backupResult.nextCodes)]
      );

      console.log('[admin-security] backup code used', { adminId: admin.id, email: admin.email });
    }

    await clearAccountFailedAttempts({ routeScope: 'admin', emailNormalized });

    const token = issueAdminToken(admin);

    return res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/admin/auth/login
// @desc    Login admin with mandatory 2FA enrollment/verification
// @access  Public
router.post('/login', adminLoginHandler);


// @route   POST /api/admin/auth/logout
// @desc    Invalidate current admin session tokens via token version bump
// @access  Private
router.post('/logout', authenticateAdminToken, adminLogoutHandler);

// @route   POST /api/admin/auth/logout-all
// @desc    Invalidate all admin session tokens via token version bump
// @access  Private
router.post('/logout-all', authenticateAdminToken, adminLogoutHandler);

module.exports = router;
module.exports.adminLoginHandler = adminLoginHandler;
module.exports.adminLogoutHandler = adminLogoutHandler;
