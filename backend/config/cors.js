const DEFAULT_ALLOWED_ORIGINS = [
  'https://fuse101.com',
  'https://www.fuse101.com',
  'https://admin.fuse101.com'
];

const parseAllowedOrigins = (rawOrigins = process.env.ALLOWED_ORIGINS) => {
  const source = rawOrigins && rawOrigins.trim().length > 0
    ? rawOrigins.split(',')
    : DEFAULT_ALLOWED_ORIGINS;

  const origins = source
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must include at least one https origin.');
  }

  for (const origin of origins) {
    let parsed;

    try {
      parsed = new URL(origin);
    } catch (_) {
      throw new Error(`Invalid origin in ALLOWED_ORIGINS: ${origin}`);
    }

    if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
      throw new Error(`ALLOWED_ORIGINS entries must be exact https origins: ${origin}`);
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

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  };
};

const getCorsOptions = () => {
  const allowedOrigins = parseAllowedOrigins();

  return {
    origin: createCorsOriginValidator(allowedOrigins),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
  };
};

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  parseAllowedOrigins,
  createCorsOriginValidator,
  getCorsOptions
};
