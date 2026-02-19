const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
};

const getMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
};

const runMigrations = async () => {
  await ensureMigrationsTable();

  const files = getMigrationFiles();
  if (files.length === 0) {
    console.log('No SQL migrations found.');
    return;
  }

  for (const filename of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1',
      [filename]
    );

    if (rows.length > 0) {
      console.log(`Skipping already applied migration: ${filename}`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf8').trim();

    if (!sql) {
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        [filename]
      );
      console.log(`Marked empty migration as applied: ${filename}`);
      continue;
    }

    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        [filename]
      );
      await pool.query('COMMIT');
      console.log(`Applied migration: ${filename}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      if (error.code === '42P07' || error.code === '42701' || error.code === '42710') {
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
          [filename]
        );
        console.log(`Migration already satisfied, marked as applied: ${filename}`);
        continue;
      }
      throw error;
    }
  }
};

module.exports = { runMigrations };
