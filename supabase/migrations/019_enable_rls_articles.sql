-- ============================================================================
-- Enable RLS on articles table
-- ============================================================================
-- Resolves Supabase lint: "Table public.articles is public, but RLS has not
-- been enabled."
--
-- Policy: anyone can read published articles; all other operations require
-- the service_role key (used by the Worker / admin).
-- ============================================================================

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to read published articles
CREATE POLICY "Published articles are publicly readable"
  ON articles
  FOR SELECT
  USING (status = 'published');
