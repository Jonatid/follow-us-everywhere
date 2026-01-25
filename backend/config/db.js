const { Pool } = require('pg');
require('dotenv').config();

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
    database: process.env.DB_NAME || 'linktree_db',
    user: process.env.DB_USER || 'postgres'
  };
};

if (process.env.DATABASE_URL) {
  // For Render.com or other cloud services that provide DATABASE_URL
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} else {
  // For local development (defaults are intentionally dev-only).
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'linktree_db',
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

const connectionInfo = getConnectionInfo();
console.log(
  `Database connection configured: host=${connectionInfo.host} database=${connectionInfo.database} user=${connectionInfo.user}`
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Successfully connected to PostgreSQL database');
});

module.exports = pool;
