-- Migration 020: Abuse prevention infrastructure
-- Adds file fingerprinting, abuse monitoring, and session tracking columns.

-- File fingerprint column on scans (for deduplication)
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Partial index for fast duplicate lookup per user
CREATE INDEX IF NOT EXISTS idx_scans_file_hash
  ON public.scans (user_id, file_hash)
  WHERE deleted_at IS NULL;

-- Abuse monitoring columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS abuse_flags JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_session_id TEXT;
