-- ZernioProfile model table
CREATE TABLE IF NOT EXISTS zernio_profiles (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'zernio',
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, provider)
);

-- ZernioAccount model table
CREATE TABLE IF NOT EXISTS zernio_accounts (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES zernio_profiles(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, platform, account_handle)
);

-- ScheduledPost model table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'zernio',
  provider_post_id TEXT,
  content TEXT NOT NULL,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMP,
  published_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zernio_profiles_business_id ON zernio_profiles (business_id);
CREATE INDEX IF NOT EXISTS idx_zernio_accounts_business_id ON zernio_accounts (business_id);
CREATE INDEX IF NOT EXISTS idx_zernio_accounts_profile_id ON zernio_accounts (profile_id);
CREATE INDEX IF NOT EXISTS idx_zernio_accounts_platform ON zernio_accounts (platform);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_business_id ON scheduled_posts (business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts (status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_created_at ON scheduled_posts (created_at DESC);
