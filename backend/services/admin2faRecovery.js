const resetAdminTwoFactor = async ({ db, email, resetBy = 'operational-script' }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Admin email is required for 2FA reset');
  }

  const result = await db.query(
    `UPDATE admins
     SET totp_enabled = FALSE,
         totp_secret_encrypted = NULL,
         totp_enrolled_at = NULL,
         backup_codes_hashed = '[]'::jsonb,
         backup_codes_generated_at = NULL,
         totp_last_verified_step = NULL,
         token_version = token_version + 1
     WHERE LOWER(email) = LOWER($1)
     RETURNING id, email, token_version AS "tokenVersion"`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    return { reset: false, email: normalizedEmail };
  }

  return {
    reset: true,
    admin: result.rows[0],
    resetBy,
  };
};

module.exports = {
  resetAdminTwoFactor,
};
