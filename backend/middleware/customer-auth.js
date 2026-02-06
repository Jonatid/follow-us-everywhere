const jwt = require('jsonwebtoken');

const authenticateCustomerToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err || !payload?.customerId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.customerId = payload.customerId;
    return next();
  });
};

module.exports = {
  authenticateCustomerToken,
};
