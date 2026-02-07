const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateCustomerToken } = require('../middleware/customer-auth');

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
