/**
 * Tests for collections route handlers.
 * @see ../routes/collections.js
 */

// ─── Supabase mock ───────────────────────────────────────────────────────────

/**
 * Creates a chainable query builder that resolves to the given result.
 * Every Supabase method (select, insert, eq, order, ...) returns `this`,
 * and `.single()` / `.maybeSingle()` return the stored result as a Promise.
 * The builder itself is thenable so bare `await supabase.from(...).select()...`
 * resolves to `_result` automatically.
 */
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

/** Per-table result queues consumed by each supabase.from(table) call. */
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

vi.mock('../services/pdf.js', () => ({
  generateBookPdf: vi.fn(() =>
    Promise.resolve({ buffer: new Uint8Array([37, 80, 68, 70]) })
  ),
}));

/** Push one or more result objects into the queue for `table`. */
function mockFrom(table, ...results) {
  if (!supabaseFromResults[table]) supabaseFromResults[table] = [];
  supabaseFromResults[table].push(...results);
}

// ─── Hono context helpers ────────────────────────────────────────────────────

const TEST_USER = { id: 'user-123', email: 'test@example.com', role: 'authenticated' };

/**
 * Build a mock Hono context object that satisfies the contract used by route
 * handlers: `c.get('user')`, `c.get('body')`, `c.req.param()`, `c.req.json()`,
 * `c.env`, and `c.json()`.
 */
function createMockContext({ user = TEST_USER, params = {}, query = {}, body = null } = {}) {
  const store = { user };
  if (body !== null) store.body = body;

  return {
    req: {
      param: vi.fn((key) => params[key]),
      query: vi.fn((key) => query[key]),
      json: vi.fn(() => Promise.resolve(body)),
      header: vi.fn(() => null),
      formData: vi.fn(() => Promise.resolve(new FormData())),
    },
    env: {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
      PROCESSED: {
        put: vi.fn(() => Promise.resolve()),
        get: vi.fn(() => Promise.resolve(null)),
      },
      UPLOADS: {
        get: vi.fn(() => Promise.resolve(null)),
        put: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve()),
      },
    },
    get: vi.fn((key) => store[key]),
    set: vi.fn((key, value) => { store[key] = value; }),
    json: vi.fn((data, status = 200) => ({ _body: data, _status: status })),
    _store: store,
  };
}

// ─── Import route handlers (after mocks) ────────────────────────────────────
import collectionsApp from '../routes/collections.js';

/**
 * Extract raw Hono route handlers by method+path so we can call them directly
 * with our mock context, bypassing middleware (validate) when needed.
 *
 * For routes that use the `validate` middleware, the Hono app registers
 * multiple handlers for the same path. We always want the LAST handler
 * (the actual route logic) because our mock context pre-populates `body`.
 */
function getHandler(method, path) {
  const matches = collectionsApp.routes.filter(
    (r) => r.method === method && r.path === path
  );
  if (matches.length === 0) throw new Error(`No route found: ${method} ${path}`);
  // Return the last handler (actual route handler, not validate middleware)
  return matches[matches.length - 1].handler;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  supabaseFromResults = {};
  vi.clearAllMocks();
});

describe('Collections Routes', () => {
  // ───── GET / ── List collections with item counts ─────────────────────────
  describe('GET / - List collections', () => {
    it('returns collections with item counts', async () => {
      mockFrom('collections', {
        data: [
          {
            id: 'col-1',
            name: 'Recipes',
            description: 'My recipes',
            cover_image_url: 'https://img.co/1',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-06-01T00:00:00Z',
            collection_items: [{ count: 5 }],
          },
          {
            id: 'col-2',
            name: 'Letters',
            description: null,
            cover_image_url: null,
            created_at: '2025-02-01T00:00:00Z',
            updated_at: '2025-02-01T00:00:00Z',
            collection_items: [{ count: 0 }],
          },
        ],
        error: null,
      });

      const c = createMockContext();
      const handler = getHandler('GET', '/');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.collections).toHaveLength(2);
      expect(res._body.collections[0]).toEqual({
        id: 'col-1',
        name: 'Recipes',
        description: 'My recipes',
        coverImageUrl: 'https://img.co/1',
        itemCount: 5,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
      });
      expect(res._body.collections[1].itemCount).toBe(0);
    });
  });

  // ───── POST / ── Create collection ────────────────────────────────────────
  describe('POST / - Create collection', () => {
    it('creates a collection and returns 201', async () => {
      // 1st from('profiles') -> isFreeTier check
      mockFrom('profiles', { data: { tier: 'free' }, error: null });
      // 2nd from('collections') -> count check
      mockFrom('collections', { data: null, error: null, count: 2 });
      // 3rd from('collections') -> insert
      mockFrom('collections', {
        data: {
          id: 'col-new',
          name: 'New Collection',
          description: 'Desc',
          created_at: '2025-06-01T00:00:00Z',
        },
        error: null,
      });

      const c = createMockContext({ body: { name: 'New Collection', description: 'Desc' } });
      const handler = getHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(201);
      expect(res._body.id).toBe('col-new');
      expect(res._body.name).toBe('New Collection');
    });

    it('returns 403 when free tier limit is reached', async () => {
      mockFrom('profiles', { data: { tier: 'free' }, error: null });
      mockFrom('collections', { data: null, error: null, count: 5 });

      const c = createMockContext({ body: { name: 'Sixth' } });
      const handler = getHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(403);
      expect(res._body.error).toBe('Collection limit reached');
      expect(res._body.limit).toBe(5);
    });

    it('returns 500 when count query errors', async () => {
      mockFrom('profiles', { data: { tier: 'free' }, error: null });
      mockFrom('collections', { data: null, error: { message: 'DB error' }, count: null });

      const c = createMockContext({ body: { name: 'Oops' } });
      const handler = getHandler('POST', '/');
      const res = await handler(c);

      expect(res._status).toBe(500);
      expect(res._body.error).toBe('Failed to check collection limits');
    });
  });

  // ───── GET /:id ── Get collection with items ──────────────────────────────
  describe('GET /:id - Get collection with items', () => {
    it('returns collection with its items', async () => {
      mockFrom('collections', {
        data: {
          id: 'col-1',
          name: 'Recipes',
          description: 'Desc',
          cover_image_url: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        },
        error: null,
      });
      mockFrom('collection_items', {
        data: [
          {
            id: 'item-1',
            sort_order: 0,
            section_title: 'Starters',
            created_at: '2025-01-02T00:00:00Z',
            scans: {
              id: 'scan-1',
              title: 'Recipe Card',
              document_type: 'recipe',
              confidence_score: 0.95,
              extracted_data: { text: 'Mix flour...' },
              original_filename: 'recipe.jpg',
              r2_key: 'uploads/recipe.jpg',
              status: 'complete',
              created_at: '2025-01-01T00:00:00Z',
            },
          },
        ],
        error: null,
      });

      const c = createMockContext({ params: { id: 'col-1' } });
      const handler = getHandler('GET', '/:id');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.name).toBe('Recipes');
      expect(res._body.items).toHaveLength(1);
      expect(res._body.items[0].scan.id).toBe('scan-1');
      expect(res._body.items[0].position).toBe(0);
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });

      const c = createMockContext({ params: { id: 'nonexistent' } });
      const handler = getHandler('GET', '/:id');
      const res = await handler(c);

      expect(res._status).toBe(404);
      expect(res._body.error).toBe('Collection not found');
    });
  });

  // ───── PUT /:id ── Update collection ──────────────────────────────────────
  describe('PUT /:id - Update collection', () => {
    it('updates name and description', async () => {
      // Verify ownership
      mockFrom('collections', { data: { id: 'col-1' }, error: null });
      // Update
      mockFrom('collections', {
        data: {
          id: 'col-1',
          name: 'Updated Name',
          description: 'Updated Desc',
          updated_at: '2025-06-02T00:00:00Z',
        },
        error: null,
      });

      const c = createMockContext({
        params: { id: 'col-1' },
        body: { name: 'Updated Name', description: 'Updated Desc' },
      });
      const handler = getHandler('PUT', '/:id');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.name).toBe('Updated Name');
      expect(res._body.description).toBe('Updated Desc');
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });

      const c = createMockContext({ params: { id: 'bad-id' }, body: { name: 'X' } });
      const handler = getHandler('PUT', '/:id');
      const res = await handler(c);

      expect(res._status).toBe(404);
    });
  });

  // ───── DELETE /:id ── Delete collection ───────────────────────────────────
  describe('DELETE /:id - Delete collection', () => {
    it('deletes a collection', async () => {
      mockFrom('collections', { data: { id: 'col-1' }, error: null });
      mockFrom('collections', { data: null, error: null });

      const c = createMockContext({ params: { id: 'col-1' } });
      const handler = getHandler('DELETE', '/:id');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Collection deleted');
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });

      const c = createMockContext({ params: { id: 'bad-id' } });
      const handler = getHandler('DELETE', '/:id');
      const res = await handler(c);

      expect(res._status).toBe(404);
    });
  });

  // ───── POST /:id/documents ── Add scan to collection ─────────────────────
  describe('POST /:id/documents - Add scan', () => {
    it('adds a scan to a collection and returns 201', async () => {
      // collection ownership check
      mockFrom('collections', { data: { id: 'col-1' }, error: null });
      // scan ownership check
      mockFrom('scans', { data: { id: 'scan-1' }, error: null });
      // max sort_order lookup
      mockFrom('collection_items', { data: { sort_order: 2 }, error: null });
      // insert
      mockFrom('collection_items', {
        data: {
          id: 'item-new',
          sort_order: 3,
          created_at: '2025-06-01T00:00:00Z',
        },
        error: null,
      });
      // touch updated_at
      mockFrom('collections', { data: null, error: null });

      const c = createMockContext({
        params: { id: 'col-1' },
        body: { documentId: 'scan-1' },
      });
      const handler = getHandler('POST', '/:id/documents');
      const res = await handler(c);

      expect(res._status).toBe(201);
      expect(res._body.scanId).toBe('scan-1');
      expect(res._body.sortOrder).toBe(3);
    });

    it('returns 400 when documentId is missing', async () => {
      const c = createMockContext({ params: { id: 'col-1' }, body: {} });
      const handler = getHandler('POST', '/:id/documents');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('documentId is required');
    });

    it('returns 409 when scan already exists in collection', async () => {
      mockFrom('collections', { data: { id: 'col-1' }, error: null });
      mockFrom('scans', { data: { id: 'scan-1' }, error: null });
      mockFrom('collection_items', { data: { sort_order: 0 }, error: null });
      mockFrom('collection_items', {
        data: null,
        error: { code: '23505', message: 'unique violation' },
      });

      const c = createMockContext({
        params: { id: 'col-1' },
        body: { documentId: 'scan-1' },
      });
      const handler = getHandler('POST', '/:id/documents');
      const res = await handler(c);

      expect(res._status).toBe(409);
      expect(res._body.error).toBe('Scan is already in this collection');
    });

    it('auto-calculates sort_order when not provided', async () => {
      mockFrom('collections', { data: { id: 'col-1' }, error: null });
      mockFrom('scans', { data: { id: 'scan-2' }, error: null });
      // No existing items (single returns null)
      mockFrom('collection_items', { data: null, error: null });
      mockFrom('collection_items', {
        data: { id: 'item-x', sort_order: 0, created_at: '2025-06-01T00:00:00Z' },
        error: null,
      });
      mockFrom('collections', { data: null, error: null });

      const c = createMockContext({
        params: { id: 'col-1' },
        body: { documentId: 'scan-2' },
      });
      const handler = getHandler('POST', '/:id/documents');
      const res = await handler(c);

      expect(res._status).toBe(201);
      // (-1) + 1 = 0 when no existing items
      expect(res._body.sortOrder).toBe(0);
    });
  });

  // ───── DELETE /:id/documents/:scanId ── Remove scan ───────────────────────
  describe('DELETE /:id/documents/:scanId - Remove scan', () => {
    it('removes a scan from a collection', async () => {
      mockFrom('collections', { data: { id: 'col-1' }, error: null });
      mockFrom('collection_items', { data: null, error: null });
      mockFrom('collections', { data: null, error: null });

      const c = createMockContext({ params: { id: 'col-1', scanId: 'scan-1' } });
      const handler = getHandler('DELETE', '/:id/documents/:scanId');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Removed from collection');
    });
  });

  // ───── PUT /:id/reorder ── Reorder items ──────────────────────────────────
  describe('PUT /:id/reorder - Reorder items', () => {
    it('reorders items successfully', async () => {
      // ownership check
      mockFrom('collections', { data: { id: 'col-1' }, error: null });
      // update sort_order for each item (2 items)
      mockFrom('collection_items', { data: null, error: null });
      mockFrom('collection_items', { data: null, error: null });
      // touch updated_at
      mockFrom('collections', { data: null, error: null });

      const c = createMockContext({
        params: { id: 'col-1' },
        body: { orderedIds: ['scan-b', 'scan-a'] },
      });
      const handler = getHandler('PUT', '/:id/reorder');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Reordered successfully');
    });

    it('returns 400 when orderedIds is empty', async () => {
      const c = createMockContext({
        params: { id: 'col-1' },
        body: { orderedIds: [] },
      });
      const handler = getHandler('PUT', '/:id/reorder');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('orderedIds array is required');
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });

      const c = createMockContext({
        params: { id: 'bad-id' },
        body: { orderedIds: ['scan-1'] },
      });
      const handler = getHandler('PUT', '/:id/reorder');
      const res = await handler(c);

      expect(res._status).toBe(404);
    });
  });

  // ───── POST /:id/export ── Export PDF ─────────────────────────────────────
  describe('POST /:id/export - Export PDF', () => {
    it('generates a PDF export', async () => {
      mockFrom('collections', {
        data: {
          id: 'col-1',
          name: 'My Collection',
          description: 'Desc',
        },
        error: null,
      });
      mockFrom('collection_items', {
        data: [
          {
            sort_order: 0,
            scan_id: 'scan-1',
            scans: {
              title: 'Recipe',
              document_type: 'recipe',
              extracted_data: { text: 'Mix flour' },
              r2_key: null,
              mime_type: null,
            },
          },
        ],
        error: null,
      });

      const c = createMockContext({ params: { id: 'col-1' }, body: {} });
      const handler = getHandler('POST', '/:id/export');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.message).toBe('PDF export generated successfully');
      expect(res._body.documentCount).toBe(1);
      expect(res._body.exportKey).toContain('user-123/exports/col-1-');
      expect(c.env.PROCESSED.put).toHaveBeenCalled();
    });

    it('returns 400 when collection has no documents', async () => {
      mockFrom('collections', {
        data: { id: 'col-1', name: 'Empty', description: null },
        error: null,
      });
      mockFrom('collection_items', { data: [], error: null });

      const c = createMockContext({ params: { id: 'col-1' }, body: {} });
      const handler = getHandler('POST', '/:id/export');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('No documents to export in this collection');
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });

      const c = createMockContext({ params: { id: 'bad-id' }, body: {} });
      const handler = getHandler('POST', '/:id/export');
      const res = await handler(c);

      expect(res._status).toBe(404);
    });
  });

  // ───── GET /:id/download/:key ── Download export ──────────────────────────
  describe('GET /:id/download/:key - Download export', () => {
    it('serves a PDF export file', async () => {
      const mockBody = new ReadableStream();
      const c = createMockContext({ params: { id: 'col-1', key: 'user-123/exports/col-1-123.pdf' } });
      c.env.PROCESSED.get.mockResolvedValue({
        body: mockBody,
        httpMetadata: { contentType: 'application/pdf' },
      });

      const handler = getHandler('GET', '/:id/download/:key{.+}');
      const res = await handler(c);

      // Returns a real Response object, not a mock c.json result
      expect(res).toBeInstanceOf(Response);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('keptpages-collection.pdf');
    });

    it('returns 403 when key belongs to another user', async () => {
      const c = createMockContext({ params: { id: 'col-1', key: 'other-user/exports/col-1.pdf' } });
      const handler = getHandler('GET', '/:id/download/:key{.+}');
      const res = await handler(c);

      expect(res._status).toBe(403);
      expect(res._body.error).toBe('Forbidden');
    });

    it('returns 403 when path traversal is attempted', async () => {
      const c = createMockContext({ params: { id: 'col-1', key: 'user-123/exports/../../etc/passwd' } });
      const handler = getHandler('GET', '/:id/download/:key{.+}');
      const res = await handler(c);

      expect(res._status).toBe(403);
      expect(res._body.error).toBe('Forbidden');
    });

    it('returns 404 when export not found in R2', async () => {
      const c = createMockContext({ params: { id: 'col-1', key: 'user-123/exports/missing.pdf' } });
      c.env.PROCESSED.get.mockResolvedValue(null);

      const handler = getHandler('GET', '/:id/download/:key{.+}');
      const res = await handler(c);

      expect(res._status).toBe(404);
      expect(res._body.error).toBe('Export not found');
    });
  });
});
