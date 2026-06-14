ALTER TABLE auth_login_attempts
  ALTER COLUMN route_scope TYPE VARCHAR(64);

DELETE FROM auth_login_attempts
WHERE (locked_until IS NOT NULL AND locked_until <= NOW())
   OR (first_failed_at IS NOT NULL AND first_failed_at <= NOW() - (900 * INTERVAL '1 second'));

CREATE INDEX IF NOT EXISTS auth_login_attempts_first_failed_at_idx
  ON auth_login_attempts (first_failed_at);
