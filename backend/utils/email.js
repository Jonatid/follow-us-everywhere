const getFromAddress = () =>
  process.env.RESEND_FROM_EMAIL || 'Follow Us Everywhere <no-reply@followuseverywhere.app>';

const sendEmail = async ({ to, subject, text }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured; skipping email send.');
    return { skipped: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Resend API error: ${response.status} ${errorText}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

module.exports = { sendEmail, getFromAddress };
