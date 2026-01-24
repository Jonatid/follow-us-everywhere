const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register new business
// @access  Public
router.post('/signup', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('slug').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, slug, tagline, email, password } = req.body;

  try {
    // Check if business already exists
    const existingBusiness = await pool.query(
      'SELECT * FROM businesses WHERE email = $1 OR slug = $2',
      [email, slug]
    );

    if (existingBusiness.rows.length > 0) {
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
    const result = await pool.query(
      `INSERT INTO businesses (name, slug, tagline, logo, email, password_hash) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, slug, tagline, logo, email`,
      [name, slug, tagline || '', logo, email, passwordHash]
    );

    const business = result.rows[0];

    // Create default social link entries
    const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'LinkedIn', 'Website'];
    const icons = ['📷', '🎵', '▶️', '👍', '✖️', '💼', '🌐'];
    
    for (let i = 0; i < platforms.length; i++) {
      await pool.query(
        `INSERT INTO social_links (business_id, platform, url, icon, display_order) 
         VALUES ($1, $2, $3, $4, $5)`,
        [business.id, platforms[i], '', icons[i], i]
      );
    }

    // Get the social links we just created
    const socialsResult = await pool.query(
      'SELECT platform, url, icon FROM social_links WHERE business_id = $1 ORDER BY display_order',
      [business.id]
    );

    business.socials = socialsResult.rows;

    // Create JWT token
    const payload = { businessId: business.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, business });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login business
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

  try {
    // Check if business exists
    const result = await pool.query(
      'SELECT * FROM businesses WHERE email = $1',
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
      'SELECT platform, url, icon FROM social_links WHERE business_id = $1 ORDER BY display_order',
      [business.id]
    );

    // Create JWT token
    const payload = { businessId: business.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return business data without password
    const { password_hash, ...businessData } = business;
    businessData.socials = socialsResult.rows;

    res.json({ token, business: businessData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current business
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, tagline, logo, email FROM businesses WHERE id = $1',
      [req.businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const business = result.rows[0];

    // Get social links
    const socialsResult = await pool.query(
      'SELECT id, platform, url, icon FROM social_links WHERE business_id = $1 ORDER BY display_order',
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