const { logger } = require('./logger');
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1']);
const LOCAL_FRONTEND_ORIGIN = 'http://localhost:3000';

const parseAllowedOrigins = (rawOrigins = process.env.ALLOWED_ORIGINS) => {
  if (!rawOrigins || rawOrigins.trim().length === 0) {
    throw new Error('ALLOWED_ORIGINS is required and must include at least one origin.');
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('ALLOWED_ORIGINS is required and must include at least one origin.');
  }

  for (const origin of origins) {
    let parsed;

    try {
      parsed = new URL(origin);
    } catch (_) {
      throw new Error(`Invalid origin in ALLOWED_ORIGINS: ${origin}`);
    }

    const isHttpsOrigin = parsed.protocol === 'https:' && parsed.origin === origin;
    const isExplicitLocalDevOrigin = (
      parsed.protocol === 'http:'
      && LOCALHOST_HOSTS.has(parsed.hostname)
      && parsed.origin === origin
    );

    if (!isHttpsOrigin && !isExplicitLocalDevOrigin) {
      throw new Error(
        `ALLOWED_ORIGINS entries must be exact https origins, or explicit http localhost/127.0.0.1 origins: ${origin}`
      );
    }
  }

  return origins;
};

const createCorsOriginValidator = (allowedOrigins) => {
  const allowlist = new Set(allowedOrigins);

  return (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowlist.has(origin)) {
      return callback(null, true);
    }

    logger.warn({ origin }, 'Blocked CORS origin');
    const corsError = new Error(`CORS blocked for origin: ${origin}`);
    corsError.status = 403;
    return callback(corsError);
  };
};

const getCorsOptions = () => {
  const allowedOrigins = parseAllowedOrigins();

  if (!allowedOrigins.includes(LOCAL_FRONTEND_ORIGIN)) {
    allowedOrigins.push(LOCAL_FRONTEND_ORIGIN);
  }

  return {
    origin: createCorsOriginValidator(allowedOrigins),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
  };
};

module.exports = {
  parseAllowedOrigins,
  createCorsOriginValidator,
  getCorsOptions
};
