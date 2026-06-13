require('dotenv').config();
const pool = require('../config/db');
const { resetAdminTwoFactor } = require('../services/admin2faRecovery');

const reset = async () => {
  const email = process.env.ADMIN_EMAIL || process.argv[2];
  const resetBy = process.env.ADMIN_2FA_RESET_BY || process.env.USER || 'operational-script';

  if (!email) {
    console.error('ADMIN_EMAIL or first positional email argument is required.');
    process.exit(1);
  }

  try {
    const result = await resetAdminTwoFactor({ db: pool, email, resetBy });
    if (!result.reset) {
      console.error(`No admin account found for ${result.email}.`);
      process.exitCode = 1;
      return;
    }

    console.log('Admin 2FA reset complete:', result.admin);
    console.log('The admin must complete 2FA enrollment on next successful password login. Existing admin JWTs were invalidated.');
  } catch (error) {
    console.error('Failed to reset admin 2FA:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

reset();
