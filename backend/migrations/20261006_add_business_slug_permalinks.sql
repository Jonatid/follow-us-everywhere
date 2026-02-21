ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

DO $$
DECLARE
  business_record RECORD;
  base_slug TEXT;
  candidate_slug TEXT;
  suffix INTEGER;
BEGIN
  FOR business_record IN
    SELECT id, name, slug
    FROM businesses
    ORDER BY id ASC
  LOOP
    base_slug := NULLIF(BTRIM(COALESCE(business_record.slug, '')), '');

    IF base_slug IS NULL THEN
      base_slug := LOWER(REGEXP_REPLACE(COALESCE(business_record.name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
      base_slug := REGEXP_REPLACE(base_slug, '(^-+|-+$)', '', 'g');
    END IF;

    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'business';
    END IF;

    candidate_slug := base_slug;
    suffix := 1;

    WHILE EXISTS (
      SELECT 1
      FROM businesses
      WHERE slug = candidate_slug
        AND id <> business_record.id
    ) LOOP
      candidate_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;

    UPDATE businesses
    SET slug = candidate_slug
    WHERE id = business_record.id
      AND COALESCE(slug, '') <> candidate_slug;
  END LOOP;
END;
$$;

ALTER TABLE businesses
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug_unique
  ON businesses(slug);
