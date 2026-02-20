CREATE TABLE IF NOT EXISTS badge_requests (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  business_notes TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  linked_document_id INTEGER REFERENCES business_documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_requests_business_id ON badge_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_badge_requests_badge_id ON badge_requests(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_requests_status ON badge_requests(status);
CREATE INDEX IF NOT EXISTS idx_badge_requests_submitted_at ON badge_requests(submitted_at);

ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE badges
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

UPDATE badges
SET category = 'Community'
WHERE category IS NULL;

ALTER TABLE badges
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN category SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'badges_slug_unique'
  ) THEN
    ALTER TABLE badges
      ADD CONSTRAINT badges_slug_unique UNIQUE (slug);
  END IF;
END $$;

ALTER TABLE business_badges
  ADD COLUMN IF NOT EXISTS granted_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS source_badge_request_id INTEGER REFERENCES badge_requests(id) ON DELETE SET NULL;

UPDATE business_badges
SET granted_by_admin_id = awarded_by_admin_id
WHERE granted_by_admin_id IS NULL;

UPDATE business_badges
SET granted_at = COALESCE(awarded_at, CURRENT_TIMESTAMP)
WHERE granted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_badge_requests_business_badge_pending
  ON badge_requests (business_id, badge_id)
  WHERE status = 'Pending';
