-- ============================================================================
-- KeptPages: Fix waitlist RLS for anon role
-- ============================================================================
-- Newer Supabase projects require policies to explicitly target the anon role.
-- The original policy applied to PUBLIC but anon needs explicit targeting.
-- ============================================================================

-- Drop the original policy and recreate targeting anon explicitly
DROP POLICY IF EXISTS "waitlist_insert_public" ON public.waitlist;

CREATE POLICY "waitlist_insert_anon"
  ON public.waitlist FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- Also grant SELECT so PostgREST can return the inserted row
GRANT SELECT ON public.waitlist TO anon;
