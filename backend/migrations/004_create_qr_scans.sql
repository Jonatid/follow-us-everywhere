CREATE TABLE IF NOT EXISTS qr_scans (
  id            SERIAL PRIMARY KEY,
  business_slug VARCHAR(255)  NOT NULL,
  ip_address    VARCHAR(100),
  user_agent    TEXT,
  device_type   VARCHAR(20)   DEFAULT 'unknown',
  scanned_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_business_slug
  ON qr_scans (business_slug);

CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at
  ON qr_scans (scanned_at);

CREATE INDEX IF NOT EXISTS idx_qr_scans_slug_time
  ON qr_scans (business_slug, scanned_at DESC);
