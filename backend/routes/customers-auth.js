const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateCustomerToken } = require('../middleware/customer-auth');
const { sendCustomerPasswordResetEmail } = require('../utils/email');

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

const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_PASSWORD_MAX_ATTEMPTS = 5;
const forgotPasswordAttemptTracker = new Map();

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const rateLimitForgotPassword = (ip, email) => {
  const now = Date.now();
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${normalizeEmail(email)}`;

  const checkAndIncrement = (key) => {
    const existing = forgotPasswordAttemptTracker.get(key);
    if (!existing || now > existing.resetAt) {
      forgotPasswordAttemptTracker.set(key, { count: 1, resetAt: now + FORGOT_PASSWORD_WINDOW_MS });
      return false;
    }

    if (existing.count >= FORGOT_PASSWORD_MAX_ATTEMPTS) {
      return true;
    }

    existing.count += 1;
    forgotPasswordAttemptTracker.set(key, existing);
    return false;
  };

  return checkAndIncrement(ipKey) || checkAndIncrement(emailKey);
};

// @route   POST /api/customers/auth/signup
// @desc    Register new customer
// @access  Public
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Valid email is required.'),
    body('password').custom((value) => {
      if (!PASSWORD_REGEX.test(value || '')) {
        throw new Error(PASSWORD_ERROR_MESSAGE);
      }
      return true;
    }),
    body('first_name').trim().notEmpty().withMessage('First name is required.'),
    body('last_name').trim().notEmpty().withMessage('Last name is required.'),
  ],
  async (req, res) => {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) {
      return errorResponse;
    }

    const { email, password, first_name, last_name } = req.body;

    try {
      const existingCustomer = await pool.query('SELECT 1 FROM customers WHERE email = $1', [email]);
      if (existingCustomer.rows.length > 0) {
        return res.status(409).json({ message: 'Customer with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const result = await pool.query(
        `INSERT INTO customers (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, first_name, last_name, phone, address, created_at`,
        [email, passwordHash, first_name, last_name]
      );

      const customer = result.rows[0];
      const payload = { customerId: customer.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      return res.json({ token, customer });
    } catch (err) {
      console.error('Customer signup error:', err);
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Customer with this email already exists' });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/customers/auth/login
// @desc    Login customer
// @access  Public
router.post('/login', [body('email').isEmail(), body('password').exists()], async (req, res) => {
  const errorResponse = handleValidationErrors(req, res);
  if (errorResponse) {
    return errorResponse;
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, address, password_hash, created_at FROM customers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const customer = result.rows[0];
    const isMatch = await bcrypt.compare(password, customer.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = { customerId: customer.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password_hash, ...customerData } = customer;
    return res.json({ token, customer: customerData });
  } catch (err) {
    console.error('Customer login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/customers/auth/forgot-password
// @desc    Send reset password email for customer account
// @access  Public
router.post('/forgot-password', [body('email').isEmail()], async (req, res) => {
  const errorResponse = handleValidationErrors(req, res);
  if (errorResponse) {
    return errorResponse;
  }

  const { email } = req.body;
  const responseMessage = 'If an account exists for that email, we sent a reset link.';

  try {
    const isRateLimited = rateLimitForgotPassword(getRequestIp(req), email);
    if (isRateLimited) {
      return res.json({ message: responseMessage });
    }

    const customerResult = await pool.query(
      'SELECT id, email, first_name FROM customers WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (customerResult.rows.length === 0) {
      return res.json({ message: responseMessage });
    }

    const customer = customerResult.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE customer_password_resets
       SET used_at = NOW()
       WHERE customer_id = $1 AND used_at IS NULL`,
      [customer.id]
    );

    await pool.query(
      `INSERT INTO customer_password_resets (customer_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [customer.id, tokenHash, expiresAt]
    );

    const resetBaseUrl = (process.env.CUSTOMER_FRONTEND_URL || 'https://fuse101.com').replace(/\/$/, '');
    const resetUrl = `${resetBaseUrl}/customer/reset-password?token=${token}`;

    await sendCustomerPasswordResetEmail({
      toEmail: customer.email,
      firstName: customer.first_name,
      resetUrl,
    });

    return res.json({ message: responseMessage });
  } catch (err) {
    console.error('Customer forgot password error:', err);
    return res.json({ message: responseMessage });
  }
});

// @route   POST /api/customers/auth/reset-password
// @desc    Reset customer password with token
// @access  Public
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required.'),
    body('password').custom((value) => {
      if (!PASSWORD_REGEX.test(value || '')) {
        throw new Error(PASSWORD_ERROR_MESSAGE);
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) {
      return errorResponse;
    }

    const { token, password } = req.body;
    const tokenHash = hashResetToken(token);

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const tokenResult = await client.query(
        `SELECT id, customer_id
         FROM customer_password_resets
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
      }

      const resetRecord = tokenResult.rows[0];
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      await client.query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        passwordHash,
        resetRecord.customer_id,
      ]);

      await client.query('UPDATE customer_password_resets SET used_at = NOW() WHERE id = $1', [resetRecord.id]);

      await client.query('COMMIT');
      return res.json({ message: 'Password updated successfully. Please log in with your new password.' });
    } catch (err) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Customer reset password error:', err);
      return res.status(500).json({ message: 'Server error' });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

// @route   GET /api/customers/auth/me
// @desc    Get current customer
// @access  Private
router.get('/me', authenticateCustomerToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, address, created_at FROM customers WHERE id = $1',
      [req.customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Customer me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
