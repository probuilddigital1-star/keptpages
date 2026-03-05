-- Migration 005: Add scan_id to collection_items
-- The app stores extracted data directly in the scans table (not documents),
-- so collection_items needs a direct FK to scans.

-- Add scan_id column with FK to scans
ALTER TABLE public.collection_items
  ADD COLUMN scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE;

-- Make document_id nullable (we use scan_id now)
ALTER TABLE public.collection_items
  ALTER COLUMN document_id DROP NOT NULL;

-- Index for efficient lookups by scan_id
CREATE INDEX idx_collection_items_scan_id
  ON public.collection_items (scan_id);

-- Unique constraint: a scan can only appear once per collection
CREATE UNIQUE INDEX idx_collection_items_collection_scan
  ON public.collection_items (collection_id, scan_id)
  WHERE scan_id IS NOT NULL;

-- Notify PostgREST to pick up schema changes
NOTIFY pgrst, 'reload schema';
