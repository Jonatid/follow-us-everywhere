const { Pool } = require('pg');
require('dotenv').config();
const { logger } = require('./logger');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNonNegativeInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const poolTuning = {
  max: parsePositiveInt(process.env.PG_POOL_MAX, 20),
  min: parseNonNegativeInt(process.env.PG_POOL_MIN, 0),
  idleTimeoutMillis: parsePositiveInt(process.env.PG_IDLE_TIMEOUT_MS, 30000),
  connectionTimeoutMillis: parsePositiveInt(process.env.PG_CONNECTION_TIMEOUT_MS, 2000),
  maxUses: parsePositiveInt(process.env.PG_MAX_USES, 7500),
  allowExitOnIdle: process.env.PG_ALLOW_EXIT_ON_IDLE === 'true',
};

let pool;
const useSsl = process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL);

const getConnectionInfo = () => {
  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    return {
      host: databaseUrl.hostname,
      database: databaseUrl.pathname.replace(/^\//, ''),
      user: decodeURIComponent(databaseUrl.username || '')
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'followuseverywhere-db',
    user: process.env.DB_USER || 'postgres'
  };
};

if (process.env.DATABASE_URL) {
  // For Render.com or other cloud services that provide DATABASE_URL.
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    ...poolTuning,
  });
} else {
  // For local development (defaults are intentionally dev-only).
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'followuseverywhere-db',
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    ...poolTuning,
  });
}

const connectionInfo = getConnectionInfo();
logger.info(
  {
    host: connectionInfo.host,
    database: connectionInfo.database,
    user: connectionInfo.user,
    pool: {
      max: poolTuning.max,
      min: poolTuning.min,
      idleTimeoutMillis: poolTuning.idleTimeoutMillis,
      connectionTimeoutMillis: poolTuning.connectionTimeoutMillis,
      maxUses: poolTuning.maxUses,
      allowExitOnIdle: poolTuning.allowExitOnIdle,
    },
  },
  'Database connection configured'
);

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client');
});

pool.on('connect', () => {
  logger.info('Successfully connected to PostgreSQL database');
});

module.exports = pool;
module.exports.poolTuning = poolTuning;
module.exports.parsePositiveInt = parsePositiveInt;
module.exports.parseNonNegativeInt = parseNonNegativeInt;
