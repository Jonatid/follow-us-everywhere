-- Migration: 004_create_qr_scans.sql
-- Creates the qr_scans table to log every QR code scan.
-- Each row = one scan event from a customer.

CREATE TABLE IF NOT EXISTS qr_scans (
  id            SERIAL PRIMARY KEY,
  business_slug VARCHAR(255)  NOT NULL,         -- matches fuse101.com/qr/:slug
  ip_address    VARCHAR(100),                   -- for geo analytics (future)
  user_agent    TEXT,                           -- raw browser/device string
  device_type   VARCHAR(20)   DEFAULT 'unknown',-- 'mobile', 'tablet', 'desktop'
  scanned_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by business (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_qr_scans_business_slug
  ON qr_scans (business_slug);

-- Index for time-based queries (charts, weekly counts)
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at
  ON qr_scans (scanned_at);

-- Composite index for the most common dashboard query
CREATE INDEX IF NOT EXISTS idx_qr_scans_slug_time
  ON qr_scans (business_slug, scanned_at DESC);
