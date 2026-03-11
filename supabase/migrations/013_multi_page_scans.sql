-- Multi-page scan support
-- Adds a JSONB column to store metadata for additional page images.
-- The primary image remains in r2_key; additional pages are tracked here.
-- Format: [{ "r2Key": "...", "mimeType": "image/jpeg", "originalFilename": "page2.jpg", "fileSize": 12345 }]

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS additional_r2_keys JSONB DEFAULT NULL;

COMMENT ON COLUMN scans.additional_r2_keys IS 'JSONB array of additional page images for multi-page scans';
