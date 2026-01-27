const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { getMissingTables } = require('../config/schema');
const { authenticateToken } = require('../middleware/auth');
const { resolveVerificationStatus } = require('../utils/verification');
const { sendPasswordResetEmail } = require('../utils/email');
const crypto = require('crypto');

const router = express.Router();
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,64}$/;
const PASSWORD_ERROR_MESSAGE =
  'Password must be at least 12 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.';

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  return null;
};

// @route   POST /api/auth/signup
// @desc    Register new business
// @access  Public
router.post('/signup', [
  body('email').isEmail(),
  body('password').custom((value) => {
    if (!PASSWORD_REGEX.test(value || '')) {
      throw new Error(PASSWORD_ERROR_MESSAGE);
    }
    return true;
  }),
  body('name').notEmpty(),
  body('slug').notEmpty()
], async (req, res) => {
  const errorResponse = handleValidationErrors(req, res);
  if (errorResponse) {
    return errorResponse;
  }

  const { name, slug, tagline, email, password } = req.body;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // Check if business already exists
    const existingBusiness = await client.query(
      'SELECT 1 FROM businesses WHERE email = $1 OR slug = $2',
      [email, slug]
    );

    if (existingBusiness.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Business with this email or slug already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create logo from initials
    const logo = name.substring(0, 2).toUpperCase();

    // Insert business
    const result = await client.query(
      `INSERT INTO businesses (name, slug, tagline, logo, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 name,
                 slug,
                 tagline,
                 logo,
                 email,
                 verification_status,
                 suspended_at,
                 disabled_at,
                 last_nudge_at,
                 nudge_message,
                 policy_violation_code,
                 policy_violation_text,
                 community_support_text,
                 community_support_links`,
      [name, slug, tagline || '', logo, email, passwordHash]
    );

    const business = result.rows[0];

    // Create default social link entries
    const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'LinkedIn', 'Website'];
    const icons = ['📷', '🎵', '▶️', '👍', '✖️', '💼', '🌐'];

    for (let i = 0; i < platforms.length; i++) {
      await client.query(
        `INSERT INTO social_links (business_id, platform, url, icon, display_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [business.id, platforms[i], '', icons[i], i]
      );
    }

    // Get the social links we just created
    const socialsResult = await client.query(
      'SELECT id, platform, url, icon, display_order, is_active FROM social_links WHERE business_id = $1 ORDER BY display_order',
      [business.id]
    );

    business.socials = socialsResult.rows;

    // Create JWT token
    const payload = { businessId: business.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    await client.query('COMMIT');
    res.json({ token, business });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Signup error:', err);
    if (err.code === '23505') {
      return res.status(400).json({
        message: 'Business with this email or slug already exists'
      });
    }
    if (err.code === '42501') {
      const dbUser = process.env.DATABASE_URL
        ? new URL(process.env.DATABASE_URL).username
        : process.env.DB_USER || process.env.PGUSER || process.env.USER || 'unknown';
      return res.status(500).json({
        message: `Database user "${dbUser}" lacks CREATE privileges on schema "public".`
      });
    }
    if (err.code === '42P01' || err.code === '42703') {
      try {
        const missingTables = await getMissingTables();
        if (missingTables && missingTables.length > 0) {
          return res.status(500).json({
            message: `Database schema is not initialized: missing tables: ${missingTables.join(', ')}`
          });
        }
      } catch (schemaError) {
        console.error('Schema check failed after query error:', schemaError);
      }
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ message: 'Database connection failed' });
    }
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// @route   POST /api/auth/login
// @desc    Login business
// @access  Public
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  const errorResponse = handleValidationErrors(req, res);
  if (errorResponse) {
    return errorResponse;
  }

  const { email, password } = req.body;

  try {
    // Check if business exists
    const result = await pool.query(
      `SELECT id,
              name,
              slug,
              tagline,
              logo,
              email,
              password_hash,
              verification_status,
              suspended_at,
              disabled_at,
              last_nudge_at,
              nudge_message,
              policy_violation_code,
              policy_violation_text,
              community_support_text,
              community_support_links,
              is_verified,
              is_approved,
              suspended_reason
       FROM businesses
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const business = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, business.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Get social links
    const socialsResult = await pool.query(
      'SELECT id, platform, url, icon, display_order, is_active FROM social_links WHERE business_id = $1 ORDER BY display_order',
      [business.id]
    );

    // Create JWT token
    const payload = { businessId: business.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return business data without password
    const { password_hash, is_verified, is_approved, suspended_reason, ...businessData } = business;
    businessData.verification_status = resolveVerificationStatus(business);
    businessData.socials = socialsResult.rows;

    res.json({ token, business: businessData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send reset password email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail()
], async (req, res) => {
  const errorResponse = handleValidationErrors(req, res);
  if (errorResponse) {
    return errorResponse;
  }

  const { email } = req.body;
  const responseMessage = 'If that email exists, we sent a reset link.';

  try {
    const businessResult = await pool.query(
      'SELECT id, name, email FROM businesses WHERE email = $1',
      [email]
    );

    if (businessResult.rows.length === 0) {
      return res.json({ message: responseMessage });
    }

    const business = businessResult.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE business_id = $1 AND used_at IS NULL`,
      [business.id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (business_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [business.id, token, expiresAt]
    );

    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      toEmail: business.email,
      resetUrl,
      businessName: business.name
    });

    return res.json({ message: responseMessage });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.json({ message: responseMessage });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset business password with token
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password').custom((value) => {
    if (!PASSWORD_REGEX.test(value || '')) {
      throw new Error(PASSWORD_ERROR_MESSAGE);
    }
    return true;
  })
], async (req, res) => {
  const errorResponse = handleValidationErrors(req, res);
  if (errorResponse) {
    return errorResponse;
  }

  const { token, password } = req.body;

  try {
    const tokenResult = await pool.query(
      `SELECT id, business_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    const resetToken = tokenResult.rows[0];
    const isExpired = new Date(resetToken.expires_at) < new Date();
    if (resetToken.used_at || isExpired) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query(
      'UPDATE businesses SET password_hash = $1 WHERE id = $2',
      [passwordHash, resetToken.business_id]
    );

    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );

    res.json({ message: 'Password updated successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current business
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              name,
              slug,
              tagline,
              logo,
              email,
              verification_status,
              suspended_at,
              disabled_at,
              last_nudge_at,
              nudge_message,
              policy_violation_code,
              policy_violation_text,
              community_support_text,
              community_support_links,
              is_verified,
              is_approved,
              suspended_reason
       FROM businesses
       WHERE id = $1`,
      [req.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const { is_verified, is_approved, suspended_reason, ...business } = result.rows[0];
    business.verification_status = resolveVerificationStatus(result.rows[0]);

    // Get social links
    const socialsResult = await pool.query(
      'SELECT id, platform, url, icon, display_order, is_active FROM social_links WHERE business_id = $1 ORDER BY display_order',
      [business.id]
    );

    business.socials = socialsResult.rows;

    res.json(business);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
