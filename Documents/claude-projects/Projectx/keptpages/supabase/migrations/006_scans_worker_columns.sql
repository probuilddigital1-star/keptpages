-- Migration 006: Add worker-expected columns to scans table
-- The original schema had generic columns (original_url, extracted_json, confidence).
-- The worker code uses more specific columns. Add them without breaking existing schema.

-- R2 storage key (worker stores images in R2, not as URLs)
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS r2_key TEXT;

-- Original filename from upload
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Document title extracted by AI
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS title TEXT;

-- Document type (recipe, letter, journal, artwork)
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Confidence score as float (worker uses this instead of DECIMAL confidence)
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- Full extracted data as JSONB (worker uses this instead of extracted_json)
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- Which AI model processed this scan
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS ai_model TEXT;

-- R2 key for processed results
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS processed_key TEXT;

-- When processing completed
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- AI warnings array
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS warnings JSONB;

-- Error message if processing failed
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Notify PostgREST to pick up schema changes
NOTIFY pgrst, 'reload schema';
