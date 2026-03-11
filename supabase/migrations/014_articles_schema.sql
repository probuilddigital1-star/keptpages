-- ============================================================================
-- KeptPages: Articles Schema ("Between the Pages")
-- ============================================================================
-- Creates the articles table for the "Between the Pages" content hub.
-- Articles are publicly readable, managed via Supabase Dashboard or admin API.
-- ============================================================================

-- ==========================================================================
-- 1. ENUM
-- ==========================================================================

DO $$ BEGIN
  CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================================
-- 2. TABLE
-- ==========================================================================

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  cover_image_url TEXT,
  author TEXT NOT NULL DEFAULT 'KeptPages Team',
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'preservation',
  status article_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT articles_category_check CHECK (
    category IN ('preservation', 'family-stories', 'product-guides')
  )
);

-- ==========================================================================
-- 3. TRIGGER
-- ==========================================================================

CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ==========================================================================
-- 4. INDEXES
-- ==========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_articles_fulltext ON articles USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
);

-- ==========================================================================
-- 5. COMMENTS
-- ==========================================================================

COMMENT ON TABLE articles IS 'Content hub articles for "Between the Pages"';
COMMENT ON COLUMN articles.category IS 'One of: preservation, family-stories, product-guides';
COMMENT ON COLUMN articles.status IS 'draft (hidden), published (visible), archived (soft-deleted)';
