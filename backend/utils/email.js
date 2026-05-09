const { sendEmail } = require('./mailer');

const sendPasswordResetEmail = async ({ toEmail, resetUrl, businessName }) => {
  const subject = 'Reset your Follow Us Everywhere password';
  const greeting = businessName ? `Hi ${businessName},` : 'Hello,';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>${greeting}</p>
      <p>We received a request to reset your password. Click the link below to choose a new one:</p>
      <p><a href="${resetUrl}" target="_blank" rel="noreferrer">Reset your password</a></p>
      <p>This link will expire in 60 minutes and can only be used once.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: toEmail, subject, html });
};

const sendCustomerPasswordResetEmail = async ({ toEmail, resetUrl, firstName }) => {
  const subject = 'Reset your Fuse101 customer password';
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>${greeting}</p>
      <p>We received a request to reset your Fuse101 customer password. Click the secure link below to choose a new one:</p>
      <p><a href="${resetUrl}" target="_blank" rel="noreferrer">Reset your customer password</a></p>
      <p>This link expires in 60 minutes and can only be used once.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to: toEmail, subject, html });
};

module.exports = { sendEmail, sendPasswordResetEmail, sendCustomerPasswordResetEmail };
