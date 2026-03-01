CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  route_scope VARCHAR(32) NOT NULL,
  email_normalized TEXT,
  ip TEXT NOT NULL,
  fail_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_login_attempts_fail_count_nonnegative CHECK (fail_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_login_attempts_scope_email_uq
  ON auth_login_attempts (route_scope, email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS auth_login_attempts_scope_ip_uq
  ON auth_login_attempts (route_scope, ip)
  WHERE email_normalized IS NULL;

CREATE INDEX IF NOT EXISTS auth_login_attempts_locked_until_idx
  ON auth_login_attempts (locked_until)
  WHERE email_normalized IS NOT NULL;
