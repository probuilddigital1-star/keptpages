-- Migration 011: Add customization JSONB column to books table
-- Stores the visual book designer blueprint (pages, elements, settings)

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS customization JSONB DEFAULT '{}';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
