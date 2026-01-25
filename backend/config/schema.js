const pool = require('./db');

const ensureSchema = async () => {
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

  await pool.query('CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_social_links_business_id ON social_links(business_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_social_links_platform ON social_links(platform);');
};

module.exports = { ensureSchema };
