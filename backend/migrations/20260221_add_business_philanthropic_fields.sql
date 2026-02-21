ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS mission_statement TEXT,
  ADD COLUMN IF NOT EXISTS vision_statement TEXT,
  ADD COLUMN IF NOT EXISTS philanthropic_goals TEXT;
