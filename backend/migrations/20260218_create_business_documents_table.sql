CREATE TABLE IF NOT EXISTS business_documents (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  stored_file_name VARCHAR(255) NOT NULL,
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP NULL,
  reviewed_by_admin_id INTEGER NULL REFERENCES admins(id) ON DELETE SET NULL,
  rejection_reason TEXT NULL,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_business_documents_business_id ON business_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_business_documents_status ON business_documents(status);
CREATE INDEX IF NOT EXISTS idx_business_documents_submitted_at ON business_documents(submitted_at);
