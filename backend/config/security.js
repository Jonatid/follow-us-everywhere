const express = require('express');
const helmet = require('helmet');
const { requestLogger } = require('./logger');

const defaultBodyLimit = '1mb';

const jsonBodyLimit = process.env.JSON_BODY_LIMIT || defaultBodyLimit;
const urlencodedBodyLimit = process.env.URLENCODED_BODY_LIMIT || defaultBodyLimit;

const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: false,
  },
  frameguard: { action: 'sameorigin' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

const jsonBodyParser = express.json({ limit: jsonBodyLimit });
const urlencodedBodyParser = express.urlencoded({ limit: urlencodedBodyLimit, extended: true });

const requestSizeLimitErrorHandler = (err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    requestLogger(req).warn({ contentLength: req.get('content-length') }, 'Request size limit exceeded');
    return res.status(413).json({
      message: 'Request is too large.',
      code: 'REQUEST_TOO_LARGE',
    });
  }

  return next(err);
};

module.exports = {
  jsonBodyLimit,
  requestSizeLimitErrorHandler,
  securityHeadersMiddleware,
  jsonBodyParser,
  urlencodedBodyParser,
};
