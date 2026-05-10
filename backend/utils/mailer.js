const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: 'Follow Us Everywhere <support@fuse101.com>',
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('SMTP email send failed:', {
      to,
      subject,
      error: error?.message || error
    });
    throw error;
  }
};

module.exports = { sendEmail };
