BEGIN;

-- Keep only the newest per-IP limiter row before enforcing uniqueness.
WITH ranked_ip_rows AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY route_scope, ip
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS row_rank
  FROM auth_login_attempts
  WHERE email_normalized IS NULL
)
DELETE FROM auth_login_attempts a
USING ranked_ip_rows r
WHERE a.id = r.id
  AND r.row_rank > 1;

-- Keep only the newest per-email lockout row before enforcing uniqueness.
WITH ranked_email_rows AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY route_scope, email_normalized
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS row_rank
  FROM auth_login_attempts
  WHERE email_normalized IS NOT NULL
)
DELETE FROM auth_login_attempts a
USING ranked_email_rows r
WHERE a.id = r.id
  AND r.row_rank > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'auth_login_attempts'
      AND indexname = 'auth_login_attempts_scope_ip_uq'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'auth_login_attempts'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%(route_scope, ip)%'
  ) THEN
    CREATE UNIQUE INDEX auth_login_attempts_scope_ip_uq
      ON auth_login_attempts (route_scope, ip)
      WHERE email_normalized IS NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'auth_login_attempts'
      AND indexname = 'auth_login_attempts_scope_email_uq'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'auth_login_attempts'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%(route_scope, email_normalized)%'
  ) THEN
    CREATE UNIQUE INDEX auth_login_attempts_scope_email_uq
      ON auth_login_attempts (route_scope, email_normalized)
      WHERE email_normalized IS NOT NULL;
  END IF;
END;
$$;

COMMIT;
