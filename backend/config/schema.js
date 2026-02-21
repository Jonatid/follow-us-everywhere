const pool = require('./db');

const REQUIRED_TABLES = [
  'businesses',
  'social_links',
  'email_verification_tokens',
  'password_reset_tokens',
  'admins',
  'customers',
  'customer_favorites',
  'badges',
  'business_badges',
  'badge_requests',
  'customer_password_resets',
  'business_documents'
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
        logo_url TEXT,
        lara_number TEXT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT false,
        suspended_reason TEXT,
        verification_status TEXT NOT NULL DEFAULT 'active',
        suspended_at TIMESTAMP,
        disabled_at TIMESTAMP,
        last_nudge_at TIMESTAMP,
        nudge_message TEXT,
        policy_violation_code TEXT,
        policy_violation_text TEXT,
        community_support_text TEXT,
        community_support_links JSONB,
        mission_statement TEXT,
        vision_statement TEXT,
        philanthropic_goals TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
        ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_nudge_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS nudge_message TEXT,
        ADD COLUMN IF NOT EXISTS policy_violation_code TEXT,
        ADD COLUMN IF NOT EXISTS policy_violation_text TEXT,
        ADD COLUMN IF NOT EXISTS community_support_text TEXT,
        ADD COLUMN IF NOT EXISTS community_support_links JSONB,
        ADD COLUMN IF NOT EXISTS mission_statement TEXT,
        ADD COLUMN IF NOT EXISTS vision_statement TEXT,
        ADD COLUMN IF NOT EXISTS philanthropic_goals TEXT,
        ADD COLUMN IF NOT EXISTS logo_url TEXT,
        ADD COLUMN IF NOT EXISTS lara_number TEXT;
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL DEFAULT '',
        last_name VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS phone TEXT,
        ADD COLUMN IF NOT EXISTS address TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_favorites (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (customer_id, business_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_password_resets (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        icon TEXT,
        slug VARCHAR(255),
        category VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE badges
        ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
        ADD COLUMN IF NOT EXISTS category VARCHAR(100),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    `);

    await pool.query(`
      UPDATE badges
      SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
      WHERE slug IS NULL;
    `);

    await pool.query(`
      UPDATE badges
      SET category = 'Community'
      WHERE category IS NULL;
    `);

    await pool.query(`
      ALTER TABLE badges
        ALTER COLUMN slug SET NOT NULL,
        ALTER COLUMN category SET NOT NULL;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'badges'
            AND column_name = 'slug'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'badges_slug_unique'
        ) THEN
          ALTER TABLE badges
            ADD CONSTRAINT badges_slug_unique UNIQUE (slug);
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_badges (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        evidence_url TEXT,
        notes TEXT,
        awarded_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        granted_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        source_badge_request_id INTEGER,
        UNIQUE (business_id, badge_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_requests (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        request_type VARCHAR(50) NOT NULL DEFAULT 'badge',
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        business_notes TEXT,
        admin_notes TEXT,
        rejection_reason TEXT,
        linked_document_id INTEGER REFERENCES business_documents(id) ON DELETE SET NULL
      );
    `);

    await pool.query(`
      ALTER TABLE business_badges
      ADD COLUMN IF NOT EXISTS source_badge_request_id INTEGER REFERENCES badge_requests(id) ON DELETE SET NULL;
    `);

    await pool.query('UPDATE business_badges SET granted_by_admin_id = awarded_by_admin_id WHERE granted_by_admin_id IS NULL;');
    await pool.query('UPDATE business_badges SET granted_at = COALESCE(awarded_at, CURRENT_TIMESTAMP) WHERE granted_at IS NULL;');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_social_links_business_id ON social_links(business_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_social_links_platform ON social_links(platform);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_business_badges_business_id ON business_badges(business_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_business_badges_badge_id ON business_badges(badge_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_badge_requests_business_id ON badge_requests(business_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_badge_requests_status ON badge_requests(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_badge_requests_submitted_at ON badge_requests(submitted_at);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_badge_requests_badge_id ON badge_requests(badge_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer_id ON customer_favorites(customer_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_favorites_business_id ON customer_favorites(business_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_business_id ON password_reset_tokens(business_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_password_resets_token_hash ON customer_password_resets(token_hash);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_password_resets_customer_id ON customer_password_resets(customer_id);');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_documents (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        original_file_name VARCHAR(255) NOT NULL,
        stored_file_name VARCHAR(255) NOT NULL,
        storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
        storage_path TEXT NOT NULL,
        document_number TEXT,
        mime_type VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        rejection_reason TEXT,
        notes TEXT
      );
    `);

    await pool.query(`
      ALTER TABLE business_documents
        ADD COLUMN IF NOT EXISTS document_number TEXT;
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_business_documents_business_id ON business_documents(business_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_business_documents_status ON business_documents(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_business_documents_submitted_at ON business_documents(submitted_at);');
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
