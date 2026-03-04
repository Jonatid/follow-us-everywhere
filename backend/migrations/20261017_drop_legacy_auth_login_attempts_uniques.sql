BEGIN;

-- Drop legacy non-partial unique constraints that can block email-based attempt rows
-- when multiple accounts from same IP fail login in the same route scope.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'auth_login_attempts'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) IN (
        'UNIQUE (route_scope, ip)',
        'UNIQUE (route_scope, email_normalized)'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.auth_login_attempts DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END;
$$;

-- Drop legacy non-partial unique indexes for the same keys (excluding expected partial indexes).
DO $$
DECLARE
  index_name TEXT;
BEGIN
  FOR index_name IN
    SELECT i.indexname
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = 'auth_login_attempts'
      AND i.indexdef ILIKE 'CREATE UNIQUE INDEX % ON public.auth_login_attempts USING btree (route_scope, ip)%'
      AND i.indexname <> 'auth_login_attempts_scope_ip_uq'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', index_name);
  END LOOP;

  FOR index_name IN
    SELECT i.indexname
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = 'auth_login_attempts'
      AND i.indexdef ILIKE 'CREATE UNIQUE INDEX % ON public.auth_login_attempts USING btree (route_scope, email_normalized)%'
      AND i.indexname <> 'auth_login_attempts_scope_email_uq'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', index_name);
  END LOOP;
END;
$$;

COMMIT;
