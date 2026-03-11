const jwt = require('jsonwebtoken');

const authenticatePrivilegedUser = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Access token required', code: 'AUTH_REQUIRED' });
  }

  return jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token', code: 'AUTH_INVALID' });
    }

    if (payload?.businessId) {
      req.auth = { role: 'business', id: String(payload.businessId) };
      req.businessId = payload.businessId;
      return next();
    }

    if (payload?.adminId) {
      req.auth = { role: 'admin', id: String(payload.adminId) };
      req.adminId = payload.adminId;
      return next();
    }

    return res.status(403).json({ message: 'Insufficient permissions', code: 'ROLE_NOT_ALLOWED' });
  });
};

module.exports = {
  authenticatePrivilegedUser,
};
