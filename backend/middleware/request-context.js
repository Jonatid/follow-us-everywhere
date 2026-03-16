const crypto = require('crypto');
const { logger } = require('../config/logger');

const getRequestId = (req) => {
  const headerValue = req.get('X-Request-Id');

  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
};

const requestContextMiddleware = (req, res, next) => {
  const requestId = getRequestId(req);
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  next();
};

module.exports = {
  requestContextMiddleware,
};
