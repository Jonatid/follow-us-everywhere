const RESEND_API_URL = 'https://api.resend.com/emails';

const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }

  if (!from) {
    throw new Error('Missing RESEND_FROM environment variable');
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend API request failed (${response.status}): ${errorBody}`);
    }
  } catch (error) {
    console.error('Resend email send failed:', {
      to,
      subject,
      error: error?.message || error
    });
    throw error;
  }
};

module.exports = { sendEmail };
