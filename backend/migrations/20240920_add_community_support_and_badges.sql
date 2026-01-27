ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS community_support_text TEXT,
  ADD COLUMN IF NOT EXISTS community_support_links JSONB;

CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_badges (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  evidence_url TEXT,
  notes TEXT,
  awarded_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  UNIQUE (business_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_business_badges_business_id ON business_badges(business_id);
CREATE INDEX IF NOT EXISTS idx_business_badges_badge_id ON business_badges(badge_id);
