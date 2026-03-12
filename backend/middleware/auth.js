const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SESSION_EXPIRED_RESPONSE = { message: 'Session expired. Please sign in again.' };

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  return jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err || !payload?.businessId || typeof payload.tokenVersion !== 'number') {
      return res.status(403).json(SESSION_EXPIRED_RESPONSE);
    }

    try {
      const result = await pool.query('SELECT id, token_version FROM businesses WHERE id = $1', [payload.businessId]);
      if (result.rows.length === 0 || result.rows[0].token_version !== payload.tokenVersion) {
        return res.status(403).json(SESSION_EXPIRED_RESPONSE);
      }

      req.businessId = payload.businessId;
      return next();
    } catch (dbError) {
      console.error('Business auth token version check failed:', dbError);
      return res.status(500).json({ error: 'Server error' });
    }
  });
};

module.exports = {
  authenticateToken,
};
