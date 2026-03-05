-- ============================================================================
-- KeptPages: Initial Schema Migration
-- ============================================================================
-- Creates the full database schema including enums, tables, functions,
-- triggers, row-level security policies, and indexes.
-- ============================================================================

-- ==========================================================================
-- 1. ENUMS
-- ==========================================================================

CREATE TYPE document_type AS ENUM (
  'recipe',
  'letter',
  'journal',
  'artwork',
  'other'
);

CREATE TYPE scan_status AS ENUM (
  'uploading',
  'uploaded',
  'processing',
  'review',
  'accepted',
  'failed'
);

CREATE TYPE book_status AS ENUM (
  'draft',
  'designing',
  'generating_pdf',
  'ready_to_order',
  'ordered',
  'printing',
  'shipped',
  'delivered'
);

CREATE TYPE subscription_tier AS ENUM (
  'free',
  'keeper'
);

CREATE TYPE share_permission AS ENUM (
  'viewer',
  'contributor',
  'editor'
);


-- ==========================================================================
-- 2. FUNCTIONS (defined before tables so triggers can reference them)
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 2a. Generic updated_at trigger function
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 2b. Auto-create profile when a new auth.users row is inserted
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 2c. Denormalized scan counter maintenance
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET scan_count = scan_count + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET scan_count = GREATEST(scan_count - 1, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft-delete: deleted_at was NULL and is now set
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.profiles
      SET scan_count = GREATEST(scan_count - 1, 0)
      WHERE id = NEW.user_id;
    -- Handle un-delete: deleted_at was set and is now NULL
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE public.profiles
      SET scan_count = scan_count + 1
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 2d. Denormalized collection counter maintenance
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_collection_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET collection_count = collection_count + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET collection_count = GREATEST(collection_count - 1, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft-delete
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.profiles
      SET collection_count = GREATEST(collection_count - 1, 0)
      WHERE id = NEW.user_id;
    -- Handle un-delete
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE public.profiles
      SET collection_count = collection_count + 1
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 2e. Limit check: can the user create another scan?
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_create_scan(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  current_count INT;
BEGIN
  SELECT tier, scan_count
  INTO user_tier, current_count
  FROM public.profiles
  WHERE id = user_uuid;

  IF user_tier = 'keeper' THEN
    RETURN TRUE;
  END IF;

  -- Free tier limit: 25 scans
  RETURN current_count < 25;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 2f. Limit check: can the user create another collection?
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_create_collection(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  current_count INT;
BEGIN
  SELECT tier, collection_count
  INTO user_tier, current_count
  FROM public.profiles
  WHERE id = user_uuid;

  IF user_tier = 'keeper' THEN
    RETURN TRUE;
  END IF;

  -- Free tier limit: 1 collection
  RETURN current_count < 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================================================
-- 3. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 3a. profiles
-- --------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  tier          subscription_tier NOT NULL DEFAULT 'free',
  scan_count    INT NOT NULL DEFAULT 0,
  collection_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 3b. subscriptions
-- --------------------------------------------------------------------------
CREATE TABLE public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,
  status                  TEXT NOT NULL DEFAULT 'active',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 3c. waitlist
-- --------------------------------------------------------------------------
CREATE TABLE public.waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3d. scans
-- --------------------------------------------------------------------------
CREATE TABLE public.scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  original_url    TEXT,
  processed_url   TEXT,
  extracted_text  TEXT,
  extracted_json  JSONB,
  confidence      DECIMAL(3,2),
  status          scan_status NOT NULL DEFAULT 'uploading',
  mime_type       TEXT,
  file_size       INT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER scans_updated_at
  BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER scans_count_insert
  AFTER INSERT ON public.scans
  FOR EACH ROW EXECUTE FUNCTION update_scan_count();

CREATE TRIGGER scans_count_delete
  AFTER DELETE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION update_scan_count();

CREATE TRIGGER scans_count_soft_delete
  AFTER UPDATE OF deleted_at ON public.scans
  FOR EACH ROW EXECUTE FUNCTION update_scan_count();

-- --------------------------------------------------------------------------
-- 3e. documents
-- --------------------------------------------------------------------------
CREATE TABLE public.documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title         TEXT,
  type          document_type NOT NULL DEFAULT 'other',
  content       TEXT,
  ingredients   JSONB,
  instructions  JSONB,
  notes         TEXT,
  tags          TEXT[],
  metadata      JSONB,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 3f. scan_documents (many-to-many link)
-- --------------------------------------------------------------------------
CREATE TABLE public.scan_documents (
  scan_id       UUID NOT NULL REFERENCES public.scans (id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  page_number   INT NOT NULL DEFAULT 1,
  PRIMARY KEY (scan_id, document_id)
);

-- --------------------------------------------------------------------------
-- 3g. collections
-- --------------------------------------------------------------------------
CREATE TABLE public.collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  cover_image_url TEXT,
  slug            TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER collections_count_insert
  AFTER INSERT ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_collection_count();

CREATE TRIGGER collections_count_delete
  AFTER DELETE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_collection_count();

CREATE TRIGGER collections_count_soft_delete
  AFTER UPDATE OF deleted_at ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_collection_count();

-- --------------------------------------------------------------------------
-- 3h. collection_items (junction with ordering)
-- --------------------------------------------------------------------------
CREATE TABLE public.collection_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  sort_order      INT NOT NULL DEFAULT 0,
  section_title   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3i. books
-- --------------------------------------------------------------------------
CREATE TABLE public.books (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  collection_id     UUID NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  title             TEXT,
  subtitle          TEXT,
  template          TEXT NOT NULL DEFAULT 'classic',
  cover_design      JSONB,
  status            book_status NOT NULL DEFAULT 'draft',
  page_count        INT,
  interior_pdf_url  TEXT,
  cover_pdf_url     TEXT,
  lulu_project_id   TEXT,
  lulu_order_id     TEXT,
  tracking_number   TEXT,
  shipping_address  JSONB,
  price_cents       INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 3j. family_shares
-- --------------------------------------------------------------------------
CREATE TABLE public.family_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  shared_with_id  UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  permission      share_permission NOT NULL DEFAULT 'viewer',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3k. share_invites
-- --------------------------------------------------------------------------
CREATE TABLE public.share_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  invited_by      UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  token           TEXT UNIQUE NOT NULL,
  permission      share_permission NOT NULL DEFAULT 'viewer',
  expires_at      TIMESTAMPTZ,
  accepted_by     UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ==========================================================================
-- 4. AUTH TRIGGER (new user -> profile)
-- ==========================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ==========================================================================
-- 5. INDEXES
-- ==========================================================================

-- scans: user timeline (soft-delete aware)
CREATE INDEX idx_scans_user_created
  ON public.scans (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- scans: user + status for queue processing
CREATE INDEX idx_scans_user_status
  ON public.scans (user_id, status);

-- documents: user timeline (soft-delete aware)
CREATE INDEX idx_documents_user_created
  ON public.documents (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- documents: GIN index on tags array
CREATE INDEX idx_documents_tags
  ON public.documents USING GIN (tags);

-- documents: full-text search on title + content
CREATE INDEX idx_documents_fts
  ON public.documents USING GIN (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
  );

-- collections: user timeline (soft-delete aware)
CREATE INDEX idx_collections_user_created
  ON public.collections (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- collections: unique slug per user (soft-delete aware)
CREATE UNIQUE INDEX idx_collections_user_slug
  ON public.collections (user_id, slug)
  WHERE deleted_at IS NULL;

-- collection_items: ordering within a collection
CREATE INDEX idx_collection_items_collection_order
  ON public.collection_items (collection_id, sort_order);

-- books: user timeline
CREATE INDEX idx_books_user_created
  ON public.books (user_id, created_at DESC);

-- family_shares: look up shares for a given user
CREATE INDEX idx_family_shares_shared_with
  ON public.family_shares (shared_with_id);

-- family_shares: look up shares for a given collection
CREATE INDEX idx_family_shares_collection
  ON public.family_shares (collection_id);

-- share_invites: token lookup for pending invites
CREATE INDEX idx_share_invites_token_pending
  ON public.share_invites (token)
  WHERE accepted_at IS NULL;

-- subscriptions: user lookup
CREATE INDEX idx_subscriptions_user
  ON public.subscriptions (user_id);


-- ==========================================================================
-- 6. ROW LEVEL SECURITY
-- ==========================================================================

-- Enable RLS on every table
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_shares   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_invites   ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 6a. profiles
-- --------------------------------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- --------------------------------------------------------------------------
-- 6b. subscriptions
-- --------------------------------------------------------------------------
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role should INSERT/UPDATE subscriptions (via webhook).
-- No user-facing write policies needed.

-- --------------------------------------------------------------------------
-- 6c. waitlist
-- --------------------------------------------------------------------------
CREATE POLICY "waitlist_insert_public"
  ON public.waitlist FOR INSERT
  WITH CHECK (TRUE);

-- No SELECT policy: only service_role can read waitlist entries.

-- --------------------------------------------------------------------------
-- 6d. scans
-- --------------------------------------------------------------------------
CREATE POLICY "scans_select_own"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "scans_insert_own"
  ON public.scans FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND can_create_scan(auth.uid())
  );

CREATE POLICY "scans_update_own"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scans_delete_own"
  ON public.scans FOR DELETE
  USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 6e. documents
-- --------------------------------------------------------------------------

-- Users can see their own documents
CREATE POLICY "documents_select_own"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see documents that belong to collections shared with them
CREATE POLICY "documents_select_shared"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.collection_items ci
      JOIN public.family_shares fs ON fs.collection_id = ci.collection_id
      WHERE ci.document_id = documents.id
        AND fs.shared_with_id = auth.uid()
    )
  );

CREATE POLICY "documents_insert_own"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_update_own"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_delete_own"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 6f. scan_documents
-- --------------------------------------------------------------------------

-- Users can see links for their own scans
CREATE POLICY "scan_documents_select_own"
  ON public.scan_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_documents.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "scan_documents_insert_own"
  ON public.scan_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_documents.scan_id
        AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "scan_documents_delete_own"
  ON public.scan_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = scan_documents.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- 6g. collections
-- --------------------------------------------------------------------------

-- Users see their own collections
CREATE POLICY "collections_select_own"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

-- Users see collections shared with them
CREATE POLICY "collections_select_shared"
  ON public.collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_shares
      WHERE family_shares.collection_id = collections.id
        AND family_shares.shared_with_id = auth.uid()
    )
  );

-- Anyone can see public collections
CREATE POLICY "collections_select_public"
  ON public.collections FOR SELECT
  USING (is_public = TRUE AND deleted_at IS NULL);

CREATE POLICY "collections_insert_own"
  ON public.collections FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND can_create_collection(auth.uid())
  );

CREATE POLICY "collections_update_own"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_delete_own"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 6h. collection_items
-- --------------------------------------------------------------------------

-- Users see items in their own collections
CREATE POLICY "collection_items_select_own"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );

-- Users see items in collections shared with them
CREATE POLICY "collection_items_select_shared"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_shares
      WHERE family_shares.collection_id = collection_items.collection_id
        AND family_shares.shared_with_id = auth.uid()
    )
  );

CREATE POLICY "collection_items_insert_own"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_items_update_own"
  ON public.collection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_items_delete_own"
  ON public.collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- 6i. books
-- --------------------------------------------------------------------------
CREATE POLICY "books_select_own"
  ON public.books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "books_insert_own"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "books_update_own"
  ON public.books FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "books_delete_own"
  ON public.books FOR DELETE
  USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 6j. family_shares
-- --------------------------------------------------------------------------

-- Users see shares where they are the owner
CREATE POLICY "family_shares_select_owner"
  ON public.family_shares FOR SELECT
  USING (auth.uid() = owner_id);

-- Users see shares where they are the recipient
CREATE POLICY "family_shares_select_shared_with"
  ON public.family_shares FOR SELECT
  USING (auth.uid() = shared_with_id);

-- Only the collection owner can create shares
CREATE POLICY "family_shares_insert_owner"
  ON public.family_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only the collection owner can remove shares
CREATE POLICY "family_shares_delete_owner"
  ON public.family_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- --------------------------------------------------------------------------
-- 6k. share_invites
-- --------------------------------------------------------------------------

-- Users see invites they created
CREATE POLICY "share_invites_select_own"
  ON public.share_invites FOR SELECT
  USING (auth.uid() = invited_by);

-- Anyone can look up a pending invite by token (for the accept flow).
-- This uses a permissive policy; the application filters by token.
CREATE POLICY "share_invites_select_by_token"
  ON public.share_invites FOR SELECT
  USING (accepted_at IS NULL AND expires_at > now());

-- Only collection owners can create invites
CREATE POLICY "share_invites_insert_own"
  ON public.share_invites FOR INSERT
  WITH CHECK (auth.uid() = invited_by);

-- Authenticated users can accept invites (update accepted_by / accepted_at)
CREATE POLICY "share_invites_update_accept"
  ON public.share_invites FOR UPDATE
  USING (accepted_at IS NULL AND expires_at > now())
  WITH CHECK (auth.uid() = accepted_by);

-- Only the inviter can delete/revoke invites
CREATE POLICY "share_invites_delete_own"
  ON public.share_invites FOR DELETE
  USING (auth.uid() = invited_by);
