const pool = require('./db');

const REQUIRED_TABLES = [
  'businesses',
  'social_links',
  'email_verification_tokens',
  'password_reset_tokens',
  'admins'
];

const getMissingTables = async (client = pool) => {
  try {
    const result = await client.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1)
      `,
      [REQUIRED_TABLES]
    );

    const existingTables = new Set(result.rows.map((row) => row.table_name));
    return REQUIRED_TABLES.filter((table) => !existingTables.has(table));
  } catch (error) {
    console.warn(
      'Warning: schema verification failed, skipping strict table check.',
      error
    );
    return null;
  }
};

const ensureSchema = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        tagline VARCHAR(255) DEFAULT '',
        logo VARCHAR(10) DEFAULT '',
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_links (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        platform VARCHAR(100) NOT NULL,
        url VARCHAR(500) NOT NULL,
        icon VARCHAR(10) DEFAULT '',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_social_links_business_id ON social_links(business_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_social_links_platform ON social_links(platform);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);');
  } catch (error) {
    if (error.code === '42501') {
      const dbUser = process.env.DATABASE_URL
        ? new URL(process.env.DATABASE_URL).username
        : process.env.DB_USER || process.env.PGUSER || process.env.USER || 'unknown';
      const permissionError = new Error(
        `Database user "${dbUser}" lacks CREATE privileges on schema "public".`
      );
      permissionError.code = 'INSUFFICIENT_PRIVILEGE';
      throw permissionError;
    }

    throw error;
  }

  const missingTables = await getMissingTables();
  if (!missingTables) {
    return;
  }
  if (missingTables.length > 0) {
    const missingError = new Error(
      `Database schema is not initialized: missing tables: ${missingTables.join(', ')}`
    );
    missingError.code = 'SCHEMA_MISSING';
    missingError.missingTables = missingTables;
    throw missingError;
  }
};

module.exports = { ensureSchema, getMissingTables, REQUIRED_TABLES };
