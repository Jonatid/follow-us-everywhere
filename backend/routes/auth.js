const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register endpoint
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Username must be between 3 and 255 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
    body('email')
      .isEmail()
      .withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('business_name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Business name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, business_name } = req.body;

      // Check if user already exists
      const userCheck = await db.query(
        'SELECT id FROM businesses WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (userCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await db.query(
        'INSERT INTO businesses (username, email, password_hash, business_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, business_name',
        [username, email, password_hash, business_name]
      );

      const business = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { id: business.id, username: business.username, email: business.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        business,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login endpoint
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Find user
      const result = await db.query(
        'SELECT id, username, email, password_hash, business_name FROM businesses WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const business = result.rows[0];

      // Verify password
      const passwordMatch = await bcrypt.compare(password, business.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: business.id, username: business.username, email: business.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        business: {
          id: business.id,
          username: business.username,
          email: business.email,
          business_name: business.business_name,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, email, business_name, business_description, bio, profile_image_url, created_at FROM businesses WHERE id = $1',
      [req.business.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

module.exports = router;
