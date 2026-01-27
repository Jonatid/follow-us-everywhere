const sendPasswordResetEmail = async ({ toEmail, resetUrl, businessName }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Skipping password reset email send.');
    return;
  }

  const fromEmail = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
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

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html
    })
  });

  if (!response.ok) {
    const message = await response.text();
    console.error('Failed to send password reset email:', message);
  }
};

module.exports = { sendPasswordResetEmail };
