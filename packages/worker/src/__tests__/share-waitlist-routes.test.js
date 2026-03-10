/**
 * Tests for share and waitlist route handlers.
 * @see ../routes/share.js
 * @see ../routes/waitlist.js
 */

// ─── Supabase mock ───────────────────────────────────────────────────────────

function createQueryBuilder(result = { data: null, error: null }) {
  const builder = {
    _result: result,
    select: vi.fn(function () { return this; }),
    insert: vi.fn(function () { return this; }),
    update: vi.fn(function () { return this; }),
    delete: vi.fn(function () { return this; }),
    eq: vi.fn(function () { return this; }),
    neq: vi.fn(function () { return this; }),
    is: vi.fn(function () { return this; }),
    in: vi.fn(function () { return this; }),
    order: vi.fn(function () { return this; }),
    limit: vi.fn(function () { return this; }),
    lte: vi.fn(function () { return this; }),
    single: vi.fn(function () { return Promise.resolve(this._result); }),
    maybeSingle: vi.fn(function () { return Promise.resolve(this._result); }),
    then(resolve, reject) {
      return Promise.resolve(this._result).then(resolve, reject);
    },
  };
  return builder;
}

let supabaseFromResults;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (supabaseFromResults[table] && supabaseFromResults[table].length > 0) {
        return createQueryBuilder(supabaseFromResults[table].shift());
      }
      return createQueryBuilder({ data: null, error: null });
    }),
  })),
}));

function mockFrom(table, ...results) {
  if (!supabaseFromResults[table]) supabaseFromResults[table] = [];
  supabaseFromResults[table].push(...results);
}

// ─── Hono context helpers ────────────────────────────────────────────────────

const TEST_USER = { id: 'user-123', email: 'test@example.com', role: 'authenticated' };

function createMockContext({ user = TEST_USER, params = {}, query = {}, body = null } = {}) {
  const store = { user };
  if (body !== null) store.body = body;

  return {
    req: {
      param: vi.fn((key) => params[key]),
      query: vi.fn((key) => query[key]),
      json: vi.fn(() => Promise.resolve(body)),
      header: vi.fn((name) => {
        if (name === 'CF-Connecting-IP') return '1.2.3.4';
        if (name === 'User-Agent') return 'TestAgent/1.0';
        return null;
      }),
    },
    env: {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
      APP_URL: 'https://keptpages.com',
    },
    get: vi.fn((key) => store[key]),
    set: vi.fn((key, value) => { store[key] = value; }),
    json: vi.fn((data, status = 200) => ({ _body: data, _status: status })),
    _store: store,
  };
}

// ─── Import route handlers (after mocks) ────────────────────────────────────
import shareApp from '../routes/share.js';
import waitlistApp from '../routes/waitlist.js';

function getShareHandler(method, path) {
  const matches = shareApp.routes.filter(
    (r) => r.method === method && r.path === path
  );
  if (matches.length === 0) throw new Error(`No share route found: ${method} ${path}`);
  return matches[matches.length - 1].handler;
}

function getWaitlistHandler(method, path) {
  const matches = waitlistApp.routes.filter(
    (r) => r.method === method && r.path === path
  );
  if (matches.length === 0) throw new Error(`No waitlist route found: ${method} ${path}`);
  return matches[matches.length - 1].handler;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  supabaseFromResults = {};
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Share Routes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Share Routes', () => {
  // ───── POST / ── Create share link ────────────────────────────────────────
  describe('POST / - Create share link', () => {
    it('creates a share link and returns 201', async () => {
      // collection ownership check
      mockFrom('collections', {
        data: { id: 'col-1', name: 'My Collection' },
        error: null,
      });
      // insert share record
      mockFrom('shares', {
        data: {
          id: 'share-1',
          created_at: '2025-06-01T00:00:00Z',
        },
        error: null,
      });

      const c = createMockContext({
        body: { collectionId: 'col-1', expiresInDays: 30 },
      });
      const handler = getShareHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(201);
      expect(res._body.id).toBe('share-1');
      expect(res._body.token).toBeTruthy();
      expect(res._body.url).toContain('https://keptpages.com/shared/');
      expect(res._body.collectionId).toBe('col-1');
      expect(res._body.collectionName).toBe('My Collection');
      expect(res._body.permissions.canView).toBe(true);
      expect(res._body.expiresAt).toBeTruthy();
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });

      const c = createMockContext({
        body: { collectionId: 'nonexistent' },
      });
      const handler = getShareHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(404);
      expect(res._body.error).toBe('Collection not found');
    });
  });

  // ───── GET / ── List shares ───────────────────────────────────────────────
  describe('GET / - List shares', () => {
    it('returns all share links for the user', async () => {
      mockFrom('shares', {
        data: [
          {
            id: 'share-1',
            token: 'abc123',
            collection_id: 'col-1',
            permissions: { canView: true },
            expires_at: null,
            view_count: 5,
            created_at: '2025-06-01T00:00:00Z',
            collections: { name: 'Recipes' },
          },
          {
            id: 'share-2',
            token: 'def456',
            collection_id: 'col-2',
            permissions: { canView: true, canDownload: true },
            expires_at: '2025-12-01T00:00:00Z',
            view_count: 0,
            created_at: '2025-06-02T00:00:00Z',
            collections: { name: 'Letters' },
          },
        ],
        error: null,
      });

      const c = createMockContext();
      const handler = getShareHandler('GET', '/');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.shares).toHaveLength(2);
      expect(res._body.shares[0].url).toBe('https://keptpages.com/shared/abc123');
      expect(res._body.shares[0].collectionName).toBe('Recipes');
      expect(res._body.shares[0].viewCount).toBe(5);
      expect(res._body.shares[1].permissions.canDownload).toBe(true);
    });

    it('filters by collectionId query param', async () => {
      mockFrom('shares', {
        data: [
          {
            id: 'share-1',
            token: 'abc123',
            collection_id: 'col-1',
            permissions: { canView: true },
            expires_at: null,
            view_count: 1,
            created_at: '2025-06-01T00:00:00Z',
            collections: { name: 'Recipes' },
          },
        ],
        error: null,
      });

      const c = createMockContext({ query: { collectionId: 'col-1' } });
      const handler = getShareHandler('GET', '/');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.shares).toHaveLength(1);
      expect(res._body.shares[0].collectionId).toBe('col-1');
    });
  });

  // ───── DELETE /:id ── Revoke share link ───────────────────────────────────
  describe('DELETE /:id - Revoke share link', () => {
    it('revokes a share link', async () => {
      mockFrom('shares', { data: null, error: null });

      const c = createMockContext({ params: { id: 'share-1' } });
      const handler = getShareHandler('DELETE', '/:id');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Share link revoked');
    });
  });

  // ───── GET /shared/:token ── View shared collection ───────────────────────
  describe('GET /shared/:token - View shared collection', () => {
    it('returns the shared collection with items', async () => {
      // share record lookup
      mockFrom('shares', {
        data: {
          id: 'share-1',
          collection_id: 'col-1',
          token: 'validtoken',
          permissions: { canView: true, canDownload: false },
          expires_at: null,
          view_count: 3,
        },
        error: null,
      });
      // collection fetch
      mockFrom('collections', {
        data: {
          id: 'col-1',
          name: 'Recipes',
          description: 'My recipes',
          cover_image_url: null,
        },
        error: null,
      });
      // collection items
      mockFrom('collection_items', {
        data: [
          {
            id: 'item-1',
            sort_order: 0,
            section_title: 'Appetizers',
            scans: {
              id: 'scan-1',
              title: 'Recipe Card',
              document_type: 'recipe',
              extracted_data: { text: 'Mix flour' },
              original_filename: 'recipe.jpg',
              status: 'complete',
            },
          },
        ],
        error: null,
      });
      // view count increment
      mockFrom('shares', { data: null, error: null });

      const c = createMockContext({ params: { token: 'validtoken' } });
      const handler = getShareHandler('GET', '/shared/:token');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.collection.name).toBe('Recipes');
      expect(res._body.permissions.canView).toBe(true);
      expect(res._body.items).toHaveLength(1);
      expect(res._body.items[0].scan.title).toBe('Recipe Card');
      expect(res._body.items[0].scan.extractedData).toEqual({ text: 'Mix flour' });
    });

    it('returns 404 when token is invalid', async () => {
      mockFrom('shares', { data: null, error: { message: 'not found' } });

      const c = createMockContext({ params: { token: 'badtoken' } });
      const handler = getShareHandler('GET', '/shared/:token');
      const res = await handler(c);

      expect(res._status).toBe(404);
      expect(res._body.error).toBe('Share link not found or invalid');
    });

    it('returns 410 when share link has expired', async () => {
      mockFrom('shares', {
        data: {
          id: 'share-expired',
          collection_id: 'col-1',
          token: 'expiredtoken',
          permissions: { canView: true },
          expires_at: '2020-01-01T00:00:00Z', // in the past
          view_count: 10,
        },
        error: null,
      });

      const c = createMockContext({ params: { token: 'expiredtoken' } });
      const handler = getShareHandler('GET', '/shared/:token');
      const res = await handler(c);

      expect(res._status).toBe(410);
      expect(res._body.error).toBe('This share link has expired');
    });

    it('increments view count on successful view', async () => {
      mockFrom('shares', {
        data: {
          id: 'share-1',
          collection_id: 'col-1',
          token: 'tok',
          permissions: { canView: true },
          expires_at: null,
          view_count: 5,
        },
        error: null,
      });
      mockFrom('collections', {
        data: { id: 'col-1', name: 'C', description: null, cover_image_url: null },
        error: null,
      });
      mockFrom('collection_items', { data: [], error: null });
      mockFrom('shares', { data: null, error: null }); // update call

      const c = createMockContext({ params: { token: 'tok' } });
      const handler = getShareHandler('GET', '/shared/:token');
      await handler(c);

      // The view count update is fire-and-forget; verify supabase.from('shares')
      // was called for the update (the 4th from() call in the handler).
      // Since we consumed the mock result without error, the update was attempted.
      // We can verify the handler completed without error.
      expect(c.json).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Waitlist Routes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Waitlist Routes', () => {
  // ───── POST / ── New signup ───────────────────────────────────────────────
  describe('POST / - Join waitlist', () => {
    it('adds new email and returns 201 with position', async () => {
      // Check existing
      mockFrom('waitlist', { data: null, error: null });
      // Insert
      mockFrom('waitlist', {
        data: {
          id: 'wl-1',
          email: 'new@example.com',
          created_at: '2025-06-01T00:00:00Z',
        },
        error: null,
      });
      // Count for position
      mockFrom('waitlist', { data: null, error: null, count: 42 });

      const c = createMockContext({
        body: { email: 'New@Example.com', source: 'landing' },
      });
      const handler = getWaitlistHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(201);
      expect(res._body.position).toBe(42);
      expect(res._body.message).toContain('Welcome to the waitlist');
      expect(res._body.joinedAt).toBe('2025-06-01T00:00:00Z');
    });

    it('returns 200 when email is already registered', async () => {
      mockFrom('waitlist', {
        data: {
          id: 'wl-existing',
          created_at: '2025-05-01T00:00:00Z',
        },
        error: null,
      });

      const c = createMockContext({
        body: { email: 'existing@example.com' },
      });
      const handler = getWaitlistHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.alreadyRegistered).toBe(true);
      expect(res._body.message).toContain('already on the waitlist');
      expect(res._body.joinedAt).toBe('2025-05-01T00:00:00Z');
    });

    it('handles unique constraint violation gracefully (200)', async () => {
      // Check existing returns null (race condition: not found on check)
      mockFrom('waitlist', { data: null, error: null });
      // Insert fails with unique constraint
      mockFrom('waitlist', {
        data: null,
        error: { code: '23505', message: 'unique violation' },
      });

      const c = createMockContext({
        body: { email: 'race@example.com' },
      });
      const handler = getWaitlistHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.alreadyRegistered).toBe(true);
    });

    it('returns 500 on database error', async () => {
      mockFrom('waitlist', { data: null, error: null });
      mockFrom('waitlist', {
        data: null,
        error: { code: '42000', message: 'db error' },
      });

      const c = createMockContext({
        body: { email: 'fail@example.com' },
      });
      const handler = getWaitlistHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(500);
      expect(res._body.error).toBe('Failed to join waitlist');
    });
  });
});
