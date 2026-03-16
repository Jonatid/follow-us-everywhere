const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { requestLogger } = require('../config/logger');

const SESSION_EXPIRED_RESPONSE = { message: 'Session expired. Please sign in again.' };

const authenticatePrivilegedUser = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Access token required', code: 'AUTH_REQUIRED' });
  }

  return jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err || typeof payload?.tokenVersion !== 'number') {
      requestLogger(req).warn({ reason: err ? 'invalid_token' : 'invalid_payload' }, 'Privileged auth denied');
      return res.status(403).json(SESSION_EXPIRED_RESPONSE);
    }

    try {
      if (payload?.businessId) {
        const result = await pool.query('SELECT id, token_version FROM businesses WHERE id = $1', [payload.businessId]);
        if (result.rows.length === 0 || result.rows[0].token_version !== payload.tokenVersion) {
          requestLogger(req).info({ role: 'business', businessId: payload.businessId }, 'Privileged auth session expired');
          return res.status(403).json(SESSION_EXPIRED_RESPONSE);
        }

        req.auth = { role: 'business', id: String(payload.businessId) };
        req.businessId = payload.businessId;
        return next();
      }

      if (payload?.adminId) {
        const result = await pool.query('SELECT id, token_version FROM admins WHERE id = $1', [payload.adminId]);
        if (result.rows.length === 0 || result.rows[0].token_version !== payload.tokenVersion) {
          requestLogger(req).info({ role: 'admin', adminId: payload.adminId }, 'Privileged auth session expired');
          return res.status(403).json(SESSION_EXPIRED_RESPONSE);
        }

        req.auth = { role: 'admin', id: String(payload.adminId) };
        req.adminId = payload.adminId;
        return next();
      }

      requestLogger(req).warn({ payloadKeys: Object.keys(payload || {}) }, 'Denied privileged access due to missing allowed role');
      return res.status(403).json({ message: 'Insufficient permissions', code: 'ROLE_NOT_ALLOWED' });
    } catch (dbError) {
      requestLogger(req).error({ err: dbError }, 'Privileged auth token version check failed');
      return res.status(500).json({ message: 'Server error', code: 'AUTH_CHECK_FAILED' });
    }
  });
};

module.exports = {
  authenticatePrivilegedUser,
};
