require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const createAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || null;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash
       RETURNING id, name, email, created_at AS "createdAt"`,
      [name, email, passwordHash]
    );

    console.log('Admin created/updated:', result.rows[0]);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

createAdmin();
