-- Migration 010: Add missing columns to books table
-- The books route handler references columns that don't exist in the schema.

-- Add missing columns
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS chapter_order JSONB;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;

-- Rename pdf url columns to pdf key columns (we store R2 keys, not URLs)
-- Use DO block to handle case where columns were already renamed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='books' AND column_name='interior_pdf_url') THEN
    ALTER TABLE public.books RENAME COLUMN interior_pdf_url TO interior_pdf_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='books' AND column_name='cover_pdf_url') THEN
    ALTER TABLE public.books RENAME COLUMN cover_pdf_url TO cover_pdf_key;
  END IF;
END $$;

-- Add missing enum values used by the books route handler
ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'generating';
ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'error';
ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'cancelled';
