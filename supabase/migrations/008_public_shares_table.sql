-- Migration 008: Create public shares table for shareable collection links
-- The existing family_shares and share_invites tables handle user-to-user sharing.
-- This table handles public link sharing (no login required to view).

CREATE TABLE IF NOT EXISTS public.shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  collection_id   UUID NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  token           TEXT UNIQUE NOT NULL,
  permissions     JSONB NOT NULL DEFAULT '{"canView": true}',
  expires_at      TIMESTAMPTZ,
  view_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shares_user_id ON public.shares (user_id);
CREATE INDEX idx_shares_collection_id ON public.shares (collection_id);
CREATE INDEX idx_shares_token ON public.shares (token);

-- RLS
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shares_select_own"
  ON public.shares FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "shares_insert_own"
  ON public.shares FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "shares_delete_own"
  ON public.shares FOR DELETE
  USING (user_id = auth.uid());

-- Allow public read by token (for the public viewer endpoint)
CREATE POLICY "shares_select_by_token"
  ON public.shares FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
