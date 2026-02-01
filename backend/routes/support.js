const express = require('express');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('../utils/email');

const router = express.Router();

router.post(
  '/contact',
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('business').trim().isLength({ min: 1 }).withMessage('Business is required'),
    body('reason').trim().isLength({ min: 1 }).withMessage('Reason is required'),
    body('message').trim().isLength({ min: 1 }).withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, business, reason, message } = req.body;
    const supportEmail =
      process.env.SUPPORT_EMAIL ||
      process.env.RESEND_SUPPORT_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      'support@followuseverywhere.app';

    try {
      await sendEmail({
        to: supportEmail,
        subject: `Support request: ${reason}`,
        text:
          `Name: ${name}\n` +
          `Email: ${email}\n` +
          `Business: ${business}\n` +
          `Reason: ${reason}\n\n` +
          `${message}`,
      });

      res.json({ message: 'Support request sent successfully' });
    } catch (error) {
      console.error('Support contact error:', error);
      res.status(500).json({ message: 'Failed to send support request' });
    }
  }
);

module.exports = router;
