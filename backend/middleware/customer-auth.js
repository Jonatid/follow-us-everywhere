const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { requestLogger } = require('../config/logger');

const SESSION_EXPIRED_RESPONSE = { message: 'Session expired. Please sign in again.' };

const authenticateCustomerToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  return jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err || !payload?.customerId || typeof payload.tokenVersion !== 'number') {
      requestLogger(req).warn({ reason: err ? 'invalid_token' : 'invalid_payload' }, 'Customer auth denied');
      return res.status(403).json(SESSION_EXPIRED_RESPONSE);
    }

    try {
      const result = await pool.query('SELECT id, token_version FROM customers WHERE id = $1', [payload.customerId]);
      if (result.rows.length === 0 || result.rows[0].token_version !== payload.tokenVersion) {
        requestLogger(req).info({ customerId: payload.customerId }, 'Customer session invalidated or expired');
        return res.status(403).json(SESSION_EXPIRED_RESPONSE);
      }

      req.customerId = payload.customerId;
      return next();
    } catch (dbError) {
      requestLogger(req).error({ err: dbError }, 'Customer auth token version check failed');
      return res.status(500).json({ error: 'Server error' });
    }
  });
};

module.exports = {
  authenticateCustomerToken,
};
