ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS widget_settings JSONB;
