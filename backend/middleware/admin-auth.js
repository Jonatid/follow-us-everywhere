const jwt = require('jsonwebtoken');

const authenticateAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.adminId = admin.adminId;
    next();
  });
};

module.exports = {
  authenticateAdminToken
};
