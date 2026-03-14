/**
 * Integration tests for Worker API routes.
 * Tests route handlers with mocked Supabase/R2 bindings.
 *
 * @see US-QA-2
 */

import { Hono } from 'hono';

// ─── Supabase mock ───────────────────────────────────────────────────────────

/**
 * Builds a chainable query builder that records calls and resolves
 * to a configurable result. Every method returns `this` so chains work.
 * Result is returned when the chain is awaited OR .single() is called.
 */
function createQueryBuilder(result = { data: null, error: null }) {
  const builder = {
    _result: result,
    select: vi.fn(function () { return this; }),
    insert: vi.fn(function () { return this; }),
    update: vi.fn(function () { return this; }),
    delete: vi.fn(function () { return this; }),
    eq: vi.fn(function () { return this; }),
    is: vi.fn(function () { return this; }),
    order: vi.fn(function () { return this; }),
    limit: vi.fn(function () { return this; }),
    single: vi.fn(function () { return Promise.resolve(this._result); }),
    maybeSingle: vi.fn(function () { return Promise.resolve(this._result); }),
    // Make the builder itself thenable so `await query` works
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
      // Pop the next result for this table, or use default
      if (supabaseFromResults[table] && supabaseFromResults[table].length > 0) {
        const result = supabaseFromResults[table].shift();
        return createQueryBuilder(result);
      }
      return createQueryBuilder({ data: null, error: null });
    }),
  })),
}));

/**
 * Queue results for Supabase .from(table) calls.
 * Each call to .from(table) will consume the next result in the array.
 */
function mockFrom(table, ...results) {
  if (!supabaseFromResults[table]) supabaseFromResults[table] = [];
  supabaseFromResults[table].push(...results);
}

// ─── Service mocks ───────────────────────────────────────────────────────────

vi.mock('../services/gemini.js', () => ({
  sendToGemini: vi.fn(() => Promise.resolve({
    type: 'recipe', title: 'Test Recipe',
    ingredients: [{ item: 'flour', amount: '2', unit: 'cups' }],
    instructions: ['Mix ingredients'], content: 'Test content',
  })),
}));

vi.mock('../services/claude.js', () => ({
  sendToClaude: vi.fn(() => Promise.resolve({
    type: 'recipe', title: 'Test Recipe (Claude)',
    ingredients: [{ item: 'flour', amount: '2', unit: 'cups' }],
    instructions: ['Mix'], content: 'Claude content',
  })),
}));

vi.mock('../services/confidence.js', () => ({
  calculateConfidence: vi.fn(() => ({ score: 0.85, warnings: [] })),
}));

vi.mock('../services/lulu.js', () => ({
  getOrderStatus: vi.fn(() => Promise.resolve({ status: 'PRODUCTION', statusMessage: 'In production' })),
}));

vi.mock('../services/stripe.js', () => ({
  createBookCheckoutSession: vi.fn(() => Promise.resolve({ sessionId: 'cs_test', url: 'https://checkout.stripe.com/test' })),
}));

// ─── Import routes ───────────────────────────────────────────────────────────

import scanRoutes from '../routes/scan.js';
import collectionsRoutes from '../routes/collections.js';
import shareRoutes from '../routes/share.js';
import booksRoutes from '../routes/books.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER = { id: 'user-123', email: 'test@keptpages.com' };

function createApp(routes, basePath = '/') {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('user', USER);
    await next();
  });
  app.route(basePath, routes);
  return app;
}

const ENV = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'test-key',
  UPLOADS: { put: vi.fn(), get: vi.fn(() => null), delete: vi.fn() },
  PROCESSED: { put: vi.fn(), get: vi.fn(() => null), delete: vi.fn() },
  GEMINI_API_KEY: 'test',
  APP_URL: 'https://keptpages.com',
};

function postOpts(body) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function putOpts(body) {
  return {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  supabaseFromResults = {};
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scan routes', () => {
  const app = createApp(scanRoutes, '/scan');

  describe('GET /scan', () => {
    it('returns scans list', async () => {
      mockFrom('scans', {
        data: [{ id: 's1', title: 'My Recipe', document_type: 'recipe', confidence_score: 0.9, original_filename: 'p.jpg', status: 'completed', created_at: '2026-01-01' }],
        error: null,
      });
      const res = await app.request('/scan', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.scans).toHaveLength(1);
      expect(json.scans[0].documentType).toBe('recipe');
    });

    it('returns empty when no scans', async () => {
      mockFrom('scans', { data: [], error: null });
      const res = await app.request('/scan', { method: 'GET' }, ENV);
      const json = await res.json();
      expect(json.scans).toEqual([]);
    });
  });

  describe('GET /scan/:id', () => {
    it('returns scan details', async () => {
      mockFrom('scans', {
        data: {
          id: 's1', status: 'completed', document_type: 'recipe', title: 'Test',
          original_filename: 'test.jpg', mime_type: 'image/jpeg', file_size: 1024,
          confidence_score: 0.9, warnings: [], extracted_data: { type: 'recipe' },
          ai_model: 'gemini', error_message: null, created_at: '2026-01-01', processed_at: '2026-01-01',
        },
        error: null,
      });
      const res = await app.request('/scan/s1', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe('s1');
      expect(json.extractedData).toBeDefined();
    });

    it('returns 404 for non-existent scan', async () => {
      mockFrom('scans', { data: null, error: { message: 'not found' } });
      const res = await app.request('/scan/nope', { method: 'GET' }, ENV);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /scan/:id', () => {
    it('returns 404 when scan not found', async () => {
      mockFrom('scans', { data: null, error: { message: 'not found' } });
      const res = await app.request('/scan/s1', putOpts({ title: 'Updated' }), ENV);
      expect(res.status).toBe(404);
    });

    it('updates scan fields', async () => {
      // First call: select existing
      mockFrom('scans',
        { data: { id: 's1', extracted_data: { type: 'recipe', title: 'Old' } }, error: null },
        // Second call: update
        { data: { id: 's1', status: 'completed', document_type: 'recipe', title: 'New', confidence_score: 0.85, warnings: [], extracted_data: { type: 'recipe', title: 'New' }, updated_at: '2026-01-01' }, error: null },
      );
      const res = await app.request('/scan/s1', putOpts({ title: 'New' }), ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe('New');
    });
  });

  describe('DELETE /scan/:id', () => {
    it('returns 404 for non-existent scan', async () => {
      mockFrom('scans', { data: null, error: { message: 'not found' } });
      const res = await app.request('/scan/nope', { method: 'DELETE' }, ENV);
      expect(res.status).toBe(404);
    });

    it('soft-deletes scan', async () => {
      // select existing
      mockFrom('scans',
        { data: { id: 's1', r2_key: 'user-123/abc.jpg' }, error: null },
      );
      // collection_items delete
      mockFrom('collection_items', { data: null, error: null });
      // scans update (soft delete)
      mockFrom('scans', { data: null, error: null });
      const res = await app.request('/scan/s1', { method: 'DELETE' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Collections routes', () => {
  const app = createApp(collectionsRoutes, '/collections');

  describe('GET /collections', () => {
    it('returns collections with item counts', async () => {
      mockFrom('collections', {
        data: [{
          id: 'c1', name: 'Recipes', description: 'Desc', cover_image_url: null,
          created_at: '2026-01-01', updated_at: '2026-01-02',
          collection_items: [{ count: 3 }],
        }],
        error: null,
      });
      const res = await app.request('/collections', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.collections[0].itemCount).toBe(3);
    });
  });

  describe('POST /collections', () => {
    it('creates collection (keeper tier)', async () => {
      mockFrom('profiles', { data: { tier: 'keeper' }, error: null });
      mockFrom('collections', {
        data: { id: 'c-new', name: 'New', description: null, created_at: '2026-01-01' },
        error: null,
      });
      const res = await app.request('/collections', postOpts({ name: 'New' }), ENV);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe('New');
    });

    it('returns 403 when free tier limit reached', async () => {
      mockFrom('profiles', { data: { tier: 'free' }, error: null });
      // Free tier limit is now 2
      mockFrom('collections', { data: null, error: null, count: 2 });
      const res = await app.request('/collections', postOpts({ name: 'Extra' }), ENV);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Collection limit reached');
    });
  });

  describe('GET /collections/:id', () => {
    it('returns 404 for non-existent collection', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });
      const res = await app.request('/collections/nope', { method: 'GET' }, ENV);
      expect(res.status).toBe(404);
    });

    it('returns collection with items', async () => {
      mockFrom('collections', {
        data: { id: 'c1', name: 'Recipes', description: 'Desc', cover_image_url: null, created_at: '2026-01-01', updated_at: '2026-01-02' },
        error: null,
      });
      mockFrom('collection_items', {
        data: [{ id: 'ci-1', sort_order: 0, section_title: null, created_at: '2026-01-01', scans: { id: 's1', title: 'Test', document_type: 'recipe', confidence_score: 0.9, extracted_data: {}, original_filename: 'a.jpg', status: 'completed', created_at: '2026-01-01' } }],
        error: null,
      });
      const res = await app.request('/collections/c1', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.items).toHaveLength(1);
    });
  });

  describe('PUT /collections/:id', () => {
    it('returns 404 for non-owned collection', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });
      const res = await app.request('/collections/c1', putOpts({ name: 'Updated' }), ENV);
      expect(res.status).toBe(404);
    });

    it('updates collection name', async () => {
      mockFrom('collections',
        { data: { id: 'c1' }, error: null },
        { data: { id: 'c1', name: 'Updated', description: null, updated_at: '2026-01-02' }, error: null },
      );
      const res = await app.request('/collections/c1', putOpts({ name: 'Updated' }), ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe('Updated');
    });
  });

  describe('DELETE /collections/:id', () => {
    it('returns 404 for non-owned collection', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });
      const res = await app.request('/collections/nope', { method: 'DELETE' }, ENV);
      expect(res.status).toBe(404);
    });

    it('deletes collection', async () => {
      mockFrom('collections',
        { data: { id: 'c1' }, error: null },
        { data: null, error: null },
      );
      const res = await app.request('/collections/c1', { method: 'DELETE' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('Collection deleted');
    });
  });

  describe('POST /collections/:id/documents', () => {
    it('returns 400 when documentId missing', async () => {
      const res = await app.request('/collections/c1/documents', postOpts({}), ENV);
      expect(res.status).toBe(400);
    });

    it('adds document to collection', async () => {
      mockFrom('collections', { data: { id: 'c1' }, error: null });
      mockFrom('scans', { data: { id: 's1' }, error: null });
      mockFrom('collection_items',
        { data: { sort_order: 2 }, error: null }, // max sort_order query
        { data: { id: 'ci-1', sort_order: 3, created_at: '2026-01-01' }, error: null }, // insert
      );
      // Touch updated_at
      mockFrom('collections', { data: null, error: null });
      const res = await app.request('/collections/c1/documents', postOpts({ documentId: 's1' }), ENV);
      expect(res.status).toBe(201);
    });
  });

  describe('PUT /collections/:id/reorder', () => {
    it('returns 400 when orderedIds missing', async () => {
      const res = await app.request('/collections/c1/reorder', putOpts({}), ENV);
      expect(res.status).toBe(400);
    });

    it('returns 400 when orderedIds empty', async () => {
      const res = await app.request('/collections/c1/reorder', putOpts({ orderedIds: [] }), ENV);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /collections/:id/export', () => {
    it('returns 403 for free tier users', async () => {
      // getUserTier returns 'free' → blocked by tier gate
      mockFrom('profiles', { data: { tier: 'free' }, error: null });
      const res = await app.request('/collections/nope/export', postOpts({}), ENV);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('PDF export not available');
    });

    it('returns 404 for non-existent collection (keeper tier)', async () => {
      // getUserTier returns 'keeper' → passes tier gate
      mockFrom('profiles', { data: { tier: 'keeper' }, error: null });
      mockFrom('collections', { data: null, error: { message: 'not found' } });
      const res = await app.request('/collections/nope/export', postOpts({}), ENV);
      expect(res.status).toBe(404);
    });

    it('returns 400 when no documents in collection (keeper tier)', async () => {
      // getUserTier returns 'keeper' → passes tier gate
      mockFrom('profiles', { data: { tier: 'keeper' }, error: null });
      mockFrom('collections', { data: { id: 'c1', name: 'Empty', description: '', user_id: USER.id }, error: null });
      mockFrom('collection_items', { data: [], error: null });
      const res = await app.request('/collections/c1/export', postOpts({}), ENV);
      expect(res.status).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Share routes', () => {
  const app = createApp(shareRoutes, '/share');

  describe('POST /share', () => {
    it('returns 400 when collectionId missing', async () => {
      const res = await app.request('/share', postOpts({}), ENV);
      expect(res.status).toBe(400);
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });
      const res = await app.request('/share', postOpts({ collectionId: 'bad' }), ENV);
      expect(res.status).toBe(404);
    });

    it('creates share link', async () => {
      mockFrom('collections', { data: { id: 'c1', name: 'Recipes' }, error: null });
      mockFrom('shares', { data: { id: 'sh1', created_at: '2026-01-01' }, error: null });

      vi.stubGlobal('crypto', { randomUUID: () => '12345678-1234-1234-1234-123456789012' });

      const res = await app.request('/share', postOpts({ collectionId: 'c1' }), ENV);
      vi.unstubAllGlobals();

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.url).toContain('/shared/');
      expect(json.collectionName).toBe('Recipes');
    });
  });

  describe('GET /share', () => {
    it('returns share links', async () => {
      mockFrom('shares', {
        data: [{ id: 'sh1', token: 'abc', collection_id: 'c1', permissions: { canView: true }, expires_at: null, view_count: 5, created_at: '2026-01-01', collections: { name: 'Recipes' } }],
        error: null,
      });
      const res = await app.request('/share', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.shares[0].viewCount).toBe(5);
    });
  });

  describe('DELETE /share/:id', () => {
    it('revokes share link', async () => {
      mockFrom('shares', { data: null, error: null });
      const res = await app.request('/share/sh1', { method: 'DELETE' }, ENV);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /share/shared/:token — public', () => {
    // Public endpoint: no auth middleware
    const publicApp = new Hono();
    publicApp.route('/share', shareRoutes);

    it('returns 404 for invalid token', async () => {
      mockFrom('shares', { data: null, error: { message: 'not found' } });
      const res = await publicApp.request('/share/shared/bad', { method: 'GET' }, ENV);
      expect(res.status).toBe(404);
    });

    it('returns 410 for expired share', async () => {
      mockFrom('shares', {
        data: { id: 'sh1', token: 'expired', collection_id: 'c1', permissions: { canView: true }, expires_at: '2020-01-01T00:00:00Z', view_count: 0 },
        error: null,
      });
      const res = await publicApp.request('/share/shared/expired', { method: 'GET' }, ENV);
      expect(res.status).toBe(410);
    });

    it('returns shared collection data', async () => {
      mockFrom('shares',
        { data: { id: 'sh1', token: 'valid', collection_id: 'c1', permissions: { canView: true }, expires_at: null, view_count: 0 }, error: null },
        { data: null, error: null }, // view_count update
      );
      mockFrom('collections', { data: { id: 'c1', name: 'Recipes', description: 'Desc', cover_image_url: null }, error: null });
      mockFrom('collection_items', { data: [], error: null });

      const res = await publicApp.request('/share/shared/valid', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.collection.name).toBe('Recipes');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Books routes', () => {
  const app = createApp(booksRoutes, '/books');

  describe('POST /books', () => {
    it('returns 400 when title missing', async () => {
      const res = await app.request('/books', postOpts({ collectionId: 'c1' }), ENV);
      expect(res.status).toBe(400);
    });

    it('returns 400 when collectionId missing', async () => {
      const res = await app.request('/books', postOpts({ title: 'Book' }), ENV);
      expect(res.status).toBe(400);
    });

    it('returns 404 when collection not owned', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });
      const res = await app.request('/books', postOpts({ title: 'Book', collectionId: 'bad' }), ENV);
      expect(res.status).toBe(404);
    });

    it('creates a book project', async () => {
      mockFrom('collections', { data: { id: 'c1', name: 'Recipes' }, error: null });
      mockFrom('books', {
        data: { id: 'b1', title: 'My Book', subtitle: null, author: 'Jane', template: 'classic', collection_id: 'c1', status: 'draft', created_at: '2026-01-01' },
        error: null,
      });
      const res = await app.request('/books', postOpts({ title: 'My Book', author: 'Jane', collectionId: 'c1' }), ENV);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.status).toBe('draft');
    });
  });

  describe('GET /books/:id', () => {
    it('returns 404 for non-existent book', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });
      const res = await app.request('/books/nope', { method: 'GET' }, ENV);
      expect(res.status).toBe(404);
    });

    it('returns book details', async () => {
      mockFrom('books', {
        data: { id: 'b1', title: 'Book', subtitle: null, author: 'Jane', template: 'classic', collection_id: 'c1', status: 'ready', lulu_project_id: null, lulu_order_id: null, interior_pdf_key: 'k1', cover_pdf_key: 'k2', page_count: 20, created_at: '2026-01-01', updated_at: '2026-01-02' },
        error: null,
      });
      const res = await app.request('/books/b1', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.pageCount).toBe(20);
    });
  });

  describe('PUT /books/:id', () => {
    it('returns 404 for non-existent book', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });
      const res = await app.request('/books/nope', putOpts({ title: 'X' }), ENV);
      expect(res.status).toBe(404);
    });

    it('returns 409 when book already ordered', async () => {
      mockFrom('books', { data: { id: 'b1', status: 'ordered' }, error: null });
      const res = await app.request('/books/b1', putOpts({ title: 'X' }), ENV);
      expect(res.status).toBe(409);
    });

    it('updates book metadata', async () => {
      mockFrom('books',
        { data: { id: 'b1', status: 'draft' }, error: null },
        { data: { id: 'b1', title: 'Updated', subtitle: null, author: null, template: 'modern', status: 'draft', updated_at: '2026-01-02' }, error: null },
      );
      const res = await app.request('/books/b1', putOpts({ title: 'Updated', template: 'modern' }), ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe('Updated');
    });
  });

  describe('POST /books/:id/order', () => {
    const validAddr = { name: 'Jane', street1: '123 Main', city: 'Town', state: 'OH', postalCode: '44123', email: 'j@e.com' };

    it('returns 400 when shippingAddress missing', async () => {
      const res = await app.request('/books/b1/order', postOpts({}), ENV);
      expect(res.status).toBe(400);
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });
      const res = await app.request('/books/b1/order', postOpts({ shippingAddress: validAddr }), ENV);
      expect(res.status).toBe(404);
    });

    it('returns 400 when book not in ready status', async () => {
      mockFrom('books', { data: { id: 'b1', status: 'draft', interior_pdf_key: null, cover_pdf_key: null }, error: null });
      const res = await app.request('/books/b1/order', postOpts({ shippingAddress: validAddr }), ENV);
      expect(res.status).toBe(400);
    });

    it('returns 400 when address fields missing', async () => {
      mockFrom('books', { data: { id: 'b1', status: 'ready', interior_pdf_key: 'k1', cover_pdf_key: 'k2' }, error: null });
      const res = await app.request('/books/b1/order', postOpts({ shippingAddress: { name: 'Jane' } }), ENV);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Missing shipping address');
    });
  });

  describe('GET /books/:id/status', () => {
    it('returns 404 for non-existent book', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });
      const res = await app.request('/books/nope/status', { method: 'GET' }, ENV);
      expect(res.status).toBe(404);
    });

    it('returns message when no Lulu order', async () => {
      mockFrom('books', { data: { id: 'b1', status: 'ready', lulu_order_id: null }, error: null });
      const res = await app.request('/books/b1/status', { method: 'GET' }, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain('No Lulu order');
    });
  });
});
