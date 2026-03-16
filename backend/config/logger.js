const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const LEVEL_WEIGHTS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
};

const normalizeError = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
      code: value.code,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeError(item));
  }

  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalizeError(nested)]));
};

const sanitizeMeta = (meta = {}) => {
  const blockedKeys = new Set([
    'password', 'passwordHash', 'password_hash', 'token', 'jwt', 'authorization',
    'totpCode', 'totpSecret', 'backupCode', 'backupCodes',
  ]);

  const walk = (value) => {
    if (Array.isArray(value)) {
      return value.map(walk);
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const next = {};
    for (const [key, nested] of Object.entries(value)) {
      if (blockedKeys.has(key)) {
        next[key] = '[REDACTED]';
      } else {
        next[key] = walk(nested);
      }
    }

    return next;
  };

  return walk(normalizeError(meta));
};


const normalizeArgs = (meta, message) => {
  if (typeof meta === 'string' && message === undefined) {
    return { meta: undefined, message: meta };
  }

  return { meta, message };
};

const shouldLog = (level) => (LEVEL_WEIGHTS[level] || 0) >= (LEVEL_WEIGHTS[LOG_LEVEL] || LEVEL_WEIGHTS.info);

const writeLog = (level, context, meta, message) => {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    level,
    timestamp: new Date().toISOString(),
    service: 'follow-us-everywhere-backend',
    env: process.env.NODE_ENV || 'development',
    message,
    ...context,
    ...(meta ? sanitizeMeta(meta) : {}),
  };

  const line = JSON.stringify(entry);
  if (level === 'fatal' || level === 'error') {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
};

const buildLogger = (context = {}) => ({
  child(extra = {}) {
    return buildLogger({ ...context, ...sanitizeMeta(extra) });
  },
  fatal(meta, message) {
    const resolved = normalizeArgs(meta, message);
    writeLog('fatal', context, resolved.meta, resolved.message);
  },
  error(meta, message) {
    const resolved = normalizeArgs(meta, message);
    writeLog('error', context, resolved.meta, resolved.message);
  },
  warn(meta, message) {
    const resolved = normalizeArgs(meta, message);
    writeLog('warn', context, resolved.meta, resolved.message);
  },
  info(meta, message) {
    const resolved = normalizeArgs(meta, message);
    writeLog('info', context, resolved.meta, resolved.message);
  },
  debug(meta, message) {
    const resolved = normalizeArgs(meta, message);
    writeLog('debug', context, resolved.meta, resolved.message);
  },
});

const logger = buildLogger();

const requestLogger = (req) => {
  if (req.log) {
    return req.log;
  }

  return logger.child({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
  });
};

module.exports = {
  logger,
  requestLogger,
};
