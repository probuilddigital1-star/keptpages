-- ============================================================================
-- KeptPages: Add role grants and missing waitlist columns
-- ============================================================================
-- 1. Grant permissions to anon and authenticated roles on all public tables
-- 2. Add missing columns to waitlist table (source, referral_code, etc.)
-- ============================================================================

-- ==========================================================================
-- 1. GRANTS — Ensure anon and authenticated roles can use public tables
-- ==========================================================================

-- Tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT ON public.waitlist TO anon;

-- Sequences (needed for serial/generated columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Future tables get the same grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO authenticated;


-- ==========================================================================
-- 2. WAITLIST — Add missing columns that the worker expects
-- ==========================================================================
-- The worker's POST /waitlist inserts source, referral_code, ip_address,
-- and user_agent, but 001_initial_schema.sql only has id, email, created_at.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS user_agent TEXT;
