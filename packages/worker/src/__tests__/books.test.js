/**
 * Tests for books route handlers.
 * @see ../routes/books.js
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
    is: vi.fn(function () { return this; }),
    order: vi.fn(function () { return this; }),
    limit: vi.fn(function () { return this; }),
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
        const result = supabaseFromResults[table].shift();
        return createQueryBuilder(result);
      }
      return createQueryBuilder({ data: null, error: null });
    }),
  })),
}));

function mockFrom(table, ...results) {
  if (!supabaseFromResults[table]) supabaseFromResults[table] = [];
  supabaseFromResults[table].push(...results);
}

// ─── Service mocks ───────────────────────────────────────────────────────────

vi.mock('../services/pdf.js', () => ({
  generateBookPdf: vi.fn(() =>
    Promise.resolve({ buffer: new Uint8Array([37, 80, 68, 70]), pageCount: 24 })
  ),
  generateCoverPdf: vi.fn(() =>
    Promise.resolve(new Uint8Array([37, 80, 68, 70, 99]))
  ),
  renderBlueprintBook: vi.fn(() => Promise.resolve(12)),
}));

vi.mock('../services/fonts.js', () => ({
  loadAllFonts: vi.fn(() => Promise.resolve(new Map())),
  fixCIDFontWidths: vi.fn((pdfDoc) => pdfDoc.save()),
}));

vi.mock('../services/lulu.js', () => ({
  getOrderStatus: vi.fn(() =>
    Promise.resolve({ status: 'PRODUCTION', statusMessage: 'In production', lineItems: [], costs: {} })
  ),
}));

vi.mock('../services/stripe.js', () => ({
  createBookCheckoutSession: vi.fn(() =>
    Promise.resolve({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/test' })
  ),
}));

vi.mock('pdf-lib', () => {
  const mockPdfDoc = {
    save: vi.fn(() => Promise.resolve(new Uint8Array([37, 80, 68, 70]))),
    getPages: vi.fn(() => [{ getSize: () => [612, 792] }]),
    getPageCount: vi.fn(() => 24),
    addPage: vi.fn(),
  };
  return {
    PDFDocument: {
      create: vi.fn(() => Promise.resolve(mockPdfDoc)),
      load: vi.fn(() => Promise.resolve(mockPdfDoc)),
    },
  };
});

// ─── Import routes ───────────────────────────────────────────────────────────

import { Hono } from 'hono';
import booksRoutes from '../routes/books.js';
import { getOrderStatus } from '../services/lulu.js';
import { generateBookPdf, generateCoverPdf, renderBlueprintBook } from '../services/pdf.js';
import { createBookCheckoutSession } from '../services/stripe.js';

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
  PROCESSED: {
    put: vi.fn(),
    get: vi.fn(() => null),
    delete: vi.fn(),
  },
  APP_URL: 'https://keptpages.com',
  LULU_API_KEY: 'test-lulu-key',
  STRIPE_SECRET_KEY: 'test-stripe-key',
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
  // Reset PROCESSED.get to default (return null)
  ENV.PROCESSED.get = vi.fn(() => null);
  ENV.PROCESSED.put = vi.fn();
  ENV.PROCESSED.delete = vi.fn();
});

describe('Books routes', () => {
  const app = createApp(booksRoutes, '/books');

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /books/orders - List user's paid orders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /books/orders', () => {
    it('returns user orders with payment_status succeeded', async () => {
      mockFrom('books', {
        data: [
          {
            id: 'b1', title: 'My Book', status: 'ordered', payment_status: 'succeeded',
            lulu_order_id: 'lulu_1', quantity: 1, shipping_address: { name: 'Jane' },
            print_options: { bookTier: 'classic' }, page_count: 40,
            error_message: null, created_at: '2026-03-14T00:00:00Z', updated_at: '2026-03-14T00:00:00Z',
          },
        ],
        error: null,
      });

      const res = await app.request('/books/orders', {}, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orders).toHaveLength(1);
      expect(json.orders[0].id).toBe('b1');
      expect(json.orders[0].status).toBe('ordered');
      expect(json.orders[0].luluOrderId).toBe('lulu_1');
    });

    it('returns empty array when no orders exist', async () => {
      mockFrom('books', { data: [], error: null });

      const res = await app.request('/books/orders', {}, ENV);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orders).toEqual([]);
    });

    it('returns 500 on database error', async () => {
      mockFrom('books', { data: null, error: { message: 'db error' } });

      const res = await app.request('/books/orders', {}, ENV);
      expect(res.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /books - Create book
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /books', () => {
    it('creates a book project successfully', async () => {
      mockFrom('collections', { data: { id: 'c1', name: 'Recipes' }, error: null });
      mockFrom('books', {
        data: {
          id: 'b1', title: 'My Book', subtitle: null, author: 'Jane',
          template: 'classic', collection_id: 'c1', status: 'draft',
          created_at: '2026-01-01',
        },
        error: null,
      });

      const res = await app.request('/books', postOpts({
        title: 'My Book', author: 'Jane', collectionId: 'c1',
      }), ENV);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe('b1');
      expect(json.title).toBe('My Book');
      expect(json.status).toBe('draft');
      expect(json.collectionId).toBe('c1');
    });

    it('returns 404 when collection not found', async () => {
      mockFrom('collections', { data: null, error: { message: 'not found' } });

      const res = await app.request('/books', postOpts({
        title: 'Book', collectionId: 'bad-id',
      }), ENV);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Collection not found');
    });

    it('returns 500 when book creation fails', async () => {
      mockFrom('collections', { data: { id: 'c1', name: 'Recipes' }, error: null });
      mockFrom('books', { data: null, error: { message: 'db error' } });

      const res = await app.request('/books', postOpts({
        title: 'Book', collectionId: 'c1',
      }), ENV);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to create book project');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /books/:id - Get book
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /books/:id', () => {
    it('returns book details successfully', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', title: 'Book', subtitle: 'Sub', author: 'Jane',
          template: 'modern', collection_id: 'c1', status: 'ready',
          customization: { fontSize: 14 }, lulu_project_id: 'lp1',
          lulu_order_id: 'lo1', interior_pdf_key: 'k1', cover_pdf_key: 'k2',
          page_count: 20, cover_design: { colorScheme: 'warm' },
          created_at: '2026-01-01', updated_at: '2026-01-02',
        },
        error: null,
      });

      const res = await app.request('/books/b1', { method: 'GET' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe('b1');
      expect(json.pageCount).toBe(20);
      expect(json.customization).toEqual({ fontSize: 14 });
      expect(json.coverDesign).toEqual({ colorScheme: 'warm' });
      expect(json.luluOrderId).toBe('lo1');
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const res = await app.request('/books/nope', { method: 'GET' }, ENV);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Book not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUT /books/:id - Update book
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PUT /books/:id', () => {
    it('updates book metadata successfully', async () => {
      mockFrom('books',
        { data: { id: 'b1', status: 'draft' }, error: null },
        {
          data: {
            id: 'b1', title: 'Updated', subtitle: null, author: null,
            template: 'modern', status: 'draft', customization: {},
            updated_at: '2026-01-02',
          },
          error: null,
        },
      );

      const res = await app.request('/books/b1', putOpts({ title: 'Updated', template: 'modern' }), ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe('Updated');
      expect(json.template).toBe('modern');
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const res = await app.request('/books/nope', putOpts({ title: 'X' }), ENV);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Book not found');
    });

    it('returns 409 when book is already ordered', async () => {
      mockFrom('books', { data: { id: 'b1', status: 'ordered' }, error: null });

      const res = await app.request('/books/b1', putOpts({ title: 'X' }), ENV);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('already been ordered');
    });

    it('returns 409 when book is shipped', async () => {
      mockFrom('books', { data: { id: 'b1', status: 'shipped' }, error: null });

      const res = await app.request('/books/b1', putOpts({ title: 'X' }), ENV);

      expect(res.status).toBe(409);
    });

    it('syncs coverDesign title/subtitle/author from customization', async () => {
      mockFrom('books',
        { data: { id: 'b1', status: 'draft' }, error: null },
        {
          data: {
            id: 'b1', title: 'Cover Title', subtitle: 'Cover Sub',
            author: 'Cover Author', template: 'classic', status: 'draft',
            customization: {
              coverDesign: { title: 'Cover Title', subtitle: 'Cover Sub', author: 'Cover Author' },
            },
            updated_at: '2026-01-02',
          },
          error: null,
        },
      );

      const res = await app.request('/books/b1', putOpts({
        customization: {
          coverDesign: { title: 'Cover Title', subtitle: 'Cover Sub', author: 'Cover Author' },
        },
      }), ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe('Cover Title');
      expect(json.subtitle).toBe('Cover Sub');
      expect(json.author).toBe('Cover Author');
    });

    it('does not reset status when only customization changes', async () => {
      mockFrom('books',
        { data: { id: 'b1', status: 'ready' }, error: null },
        {
          data: {
            id: 'b1', title: 'Book', subtitle: null, author: null,
            template: 'classic', status: 'ready', customization: { fontSize: 16 },
            updated_at: '2026-01-02',
          },
          error: null,
        },
      );

      const res = await app.request('/books/b1', putOpts({
        customization: { fontSize: 16 },
      }), ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
    });

    it('resets status to draft when non-customization fields change', async () => {
      mockFrom('books',
        { data: { id: 'b1', status: 'ready' }, error: null },
        {
          data: {
            id: 'b1', title: 'New Title', subtitle: null, author: null,
            template: 'classic', status: 'draft', customization: {},
            updated_at: '2026-01-02',
          },
          error: null,
        },
      );

      const res = await app.request('/books/b1', putOpts({ title: 'New Title' }), ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('draft');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /books/:id/cover-photo - Upload cover photo
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /books/:id/cover-photo', () => {
    function buildFormData(file) {
      const form = new FormData();
      if (file) form.append('image', file);
      return form;
    }

    it('uploads cover photo successfully', async () => {
      mockFrom('books', { data: { id: 'b1', cover_design: {} }, error: null });
      // update call
      mockFrom('books', { data: null, error: null });

      const file = new File([new Uint8Array([0xFF, 0xD8])], 'photo.jpg', { type: 'image/jpeg' });
      const form = buildFormData(file);

      const res = await app.request('/books/b1/cover-photo', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.photoKey).toBe('user-123/books/b1/cover-photo');
      expect(json.message).toContain('uploaded successfully');
      expect(ENV.PROCESSED.put).toHaveBeenCalled();
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const file = new File([new Uint8Array([0xFF, 0xD8])], 'photo.jpg', { type: 'image/jpeg' });
      const form = buildFormData(file);

      const res = await app.request('/books/nope/cover-photo', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(404);
    });

    it('returns 400 when no file provided', async () => {
      mockFrom('books', { data: { id: 'b1', cover_design: {} }, error: null });

      const form = new FormData();
      const res = await app.request('/books/b1/cover-photo', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('No image file');
    });

    it('returns 400 for unsupported image type', async () => {
      mockFrom('books', { data: { id: 'b1', cover_design: {} }, error: null });

      const file = new File([new Uint8Array([0x00])], 'photo.gif', { type: 'image/gif' });
      const form = buildFormData(file);

      const res = await app.request('/books/b1/cover-photo', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Unsupported image type');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /books/:id/images - Upload image
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /books/:id/images', () => {
    it('uploads image successfully', async () => {
      mockFrom('books', {
        data: { id: 'b1', customization: { additionalImages: [] } },
        error: null,
      });

      const file = new File([new Uint8Array(100)], 'pic.jpg', { type: 'image/jpeg' });
      const form = new FormData();
      form.append('image', file);

      const res = await app.request('/books/b1/images', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.key).toContain('user-123/books/b1/images/');
      expect(json.mimeType).toBe('image/jpeg');
      expect(ENV.PROCESSED.put).toHaveBeenCalled();
    });

    it('returns 400 when image limit reached (50)', async () => {
      const fiftyImages = Array(50).fill({ key: 'k' });
      mockFrom('books', {
        data: { id: 'b1', customization: { additionalImages: fiftyImages } },
        error: null,
      });

      const file = new File([new Uint8Array(100)], 'pic.jpg', { type: 'image/jpeg' });
      const form = new FormData();
      form.append('image', file);

      const res = await app.request('/books/b1/images', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Maximum 50');
    });

    it('returns 400 for oversized image (>10MB)', async () => {
      mockFrom('books', {
        data: { id: 'b1', customization: { additionalImages: [] } },
        error: null,
      });

      // Create a mock file object with size > 10MB
      const largeContent = new Uint8Array(11 * 1024 * 1024);
      const file = new File([largeContent], 'huge.jpg', { type: 'image/jpeg' });
      const form = new FormData();
      form.append('image', file);

      const res = await app.request('/books/b1/images', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('under 10MB');
    });

    it('returns 400 for unsupported image type', async () => {
      mockFrom('books', {
        data: { id: 'b1', customization: { additionalImages: [] } },
        error: null,
      });

      const file = new File([new Uint8Array(100)], 'pic.bmp', { type: 'image/bmp' });
      const form = new FormData();
      form.append('image', file);

      const res = await app.request('/books/b1/images', {
        method: 'POST',
        body: form,
      }, ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Unsupported image type');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /books/:id/images/:key - Delete image
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /books/:id/images/:key', () => {
    it('deletes image successfully', async () => {
      mockFrom('books', { data: { id: 'b1' }, error: null });

      const imageKey = encodeURIComponent('user-123/books/b1/images/abc.jpg');
      const res = await app.request(`/books/b1/images/${imageKey}`, {
        method: 'DELETE',
      }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('Image deleted');
      expect(ENV.PROCESSED.delete).toHaveBeenCalled();
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const imageKey = encodeURIComponent('user-123/books/nope/images/abc.jpg');
      const res = await app.request(`/books/nope/images/${imageKey}`, {
        method: 'DELETE',
      }, ENV);

      expect(res.status).toBe(404);
    });

    it('returns 403 when image key does not belong to user/book', async () => {
      mockFrom('books', { data: { id: 'b1' }, error: null });

      const wrongKey = encodeURIComponent('other-user/books/b1/images/abc.jpg');
      const res = await app.request(`/books/b1/images/${wrongKey}`, {
        method: 'DELETE',
      }, ENV);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Invalid image key');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /books/:id/generate - Generate PDFs
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /books/:id/generate', () => {
    const baseBook = {
      id: 'b1', title: 'Book', subtitle: 'Sub', author: 'Jane',
      template: 'classic', collection_id: 'c1', status: 'draft',
      customization: null, cover_design: null, chapter_order: null,
    };

    const collectionItems = [
      {
        sort_order: 0,
        scans: {
          id: 's1', title: 'Recipe 1', document_type: 'recipe',
          extracted_data: { type: 'recipe', title: 'Recipe 1', content: 'Mix things' },
        },
      },
    ];

    it('generates PDFs successfully (legacy path)', async () => {
      // books select
      mockFrom('books', { data: { ...baseBook }, error: null });
      // collection_items select
      mockFrom('collection_items', { data: collectionItems, error: null });
      // books update (status: generating)
      mockFrom('books', { data: null, error: null });
      // books update (final with PDF keys)
      mockFrom('books', { data: null, error: null });
      // books select (sync fallback reads final status)
      mockFrom('books', {
        data: {
          id: 'b1', status: 'ready',
          interior_pdf_key: 'user-123/books/b1/interior.pdf',
          cover_pdf_key: 'user-123/books/b1/cover.pdf',
          page_count: 24,
        },
        error: null,
      });

      const res = await app.request('/books/b1/generate', { method: 'POST' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
      expect(json.pageCount).toBe(24);
      expect(generateBookPdf).toHaveBeenCalled();
      expect(generateCoverPdf).toHaveBeenCalled();
      // Should pass 'CW' as 4th arg (widest spine for safe preview)
      const coverCall = generateCoverPdf.mock.calls[0];
      expect(coverCall[3]).toBe('CW'); // 4th arg is binding type for widest spine preview
      expect(ENV.PROCESSED.put).toHaveBeenCalledTimes(2);
    });

    it('generates PDFs successfully (blueprint path)', async () => {
      const blueprintBook = {
        ...baseBook,
        customization: {
          pages: [
            {
              elements: [
                { type: 'text', fontFamily: 'roboto', content: 'Hello' },
                { type: 'image', imageKey: 'user-123/books/b1/images/img1.jpg' },
              ],
            },
          ],
          globalSettings: { fontFamily: 'fraunces' },
          coverDesign: { title: 'Blueprint Title', subtitle: 'Sub', author: 'Author' },
        },
      };

      // books select
      mockFrom('books', { data: blueprintBook, error: null });
      // collection_items
      mockFrom('collection_items', { data: collectionItems, error: null });
      // books update (status: generating)
      mockFrom('books', { data: null, error: null });
      // books update (final)
      mockFrom('books', { data: null, error: null });
      // books select (sync fallback reads final status)
      mockFrom('books', {
        data: {
          id: 'b1', status: 'ready',
          interior_pdf_key: 'user-123/books/b1/interior.pdf',
          cover_pdf_key: 'user-123/books/b1/cover.pdf',
          page_count: 12,
        },
        error: null,
      });

      // Mock R2 get for images
      ENV.PROCESSED.get = vi.fn((key) => {
        if (key.includes('images/')) {
          return Promise.resolve({
            arrayBuffer: () => Promise.resolve(new Uint8Array([0xFF, 0xD8]).buffer),
            httpMetadata: { contentType: 'image/jpeg' },
          });
        }
        return null;
      });

      const res = await app.request('/books/b1/generate', { method: 'POST' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
      expect(renderBlueprintBook).toHaveBeenCalled();
    });

    it('returns 400 when no documents in collection', async () => {
      // books select
      mockFrom('books', { data: { ...baseBook }, error: null });
      // empty collection_items (fetched before going async)
      mockFrom('collection_items', { data: [], error: null });

      const res = await app.request('/books/b1/generate', { method: 'POST' }, ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('No documents found');
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const res = await app.request('/books/nope/generate', { method: 'POST' }, ENV);

      expect(res.status).toBe(404);
    });

    it('regenerates when book status is stuck at generating', async () => {
      const stuckBook = { ...baseBook, status: 'generating' };
      // books select (returns stuck book)
      mockFrom('books', { data: stuckBook, error: null });
      // collection_items
      mockFrom('collection_items', { data: collectionItems, error: null });
      // books update (status: generating — no-op but still called)
      mockFrom('books', { data: null, error: null });
      // books update (final: ready)
      mockFrom('books', { data: null, error: null });

      const res = await app.request('/books/b1/generate', { method: 'POST' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
      expect(json.pageCount).toBe(24);
      expect(generateBookPdf).toHaveBeenCalled();
    });

    it('regenerates when book status is error from previous attempt', async () => {
      const errorBook = { ...baseBook, status: 'error', error_message: 'Previous failure' };
      mockFrom('books', { data: errorBook, error: null });
      mockFrom('collection_items', { data: collectionItems, error: null });
      mockFrom('books', { data: null, error: null });
      mockFrom('books', { data: null, error: null });

      const res = await app.request('/books/b1/generate', { method: 'POST' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
    });

    it('returns 500 and sets error status on generation failure', async () => {
      // books select
      mockFrom('books', { data: { ...baseBook }, error: null });
      // collection_items (fetched before going async)
      mockFrom('collection_items', { data: collectionItems, error: null });
      // books update (generating)
      mockFrom('books', { data: null, error: null });

      generateBookPdf.mockRejectedValueOnce(new Error('PDF engine crashed'));

      // books update (error status set by catch in generateWork)
      mockFrom('books', { data: null, error: null });
      // books select (sync fallback reads final status)
      mockFrom('books', {
        data: { id: 'b1', status: 'error', error_message: 'PDF engine crashed' },
        error: null,
      });

      const res = await app.request('/books/b1/generate', { method: 'POST' }, ENV);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain('PDF engine crashed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /books/:id/order - Order book
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /books/:id/order', () => {
    const validAddr = {
      name: 'Jane', street1: '123 Main', city: 'Town',
      state: 'OH', postalCode: '44123', email: 'j@e.com', phone: '555-123-4567',
    };

    const readyBook = {
      id: 'b1', title: 'Book', status: 'ready',
      interior_pdf_key: 'k1', cover_pdf_key: 'k2', page_count: 24,
    };

    it('creates checkout session successfully', async () => {
      // books select
      mockFrom('books', { data: readyBook, error: null });
      // books update (print_options with bookTier + addons)
      mockFrom('books', { data: null, error: null });
      // books update (session info)
      mockFrom('books', { data: null, error: null });

      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
        quantity: 2,
      }), ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sessionId).toBe('cs_test_123');
      expect(json.url).toContain('checkout.stripe.com');
      // New signature: (userId, book, addr, qty, env, bookTier, addons)
      expect(createBookCheckoutSession).toHaveBeenCalledWith(
        'user-123', readyBook, validAddr, 2, ENV, 'classic', []
      );
    });

    it('passes bookTier and addons to checkout session', async () => {
      mockFrom('books', { data: readyBook, error: null });
      mockFrom('books', { data: null, error: null });
      mockFrom('books', { data: null, error: null });

      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
        quantity: 1,
        bookTier: 'premium',
        addons: ['coil'],
      }), ENV);

      expect(res.status).toBe(200);
      expect(createBookCheckoutSession).toHaveBeenCalledWith(
        'user-123', readyBook, validAddr, 1, ENV, 'premium', ['coil']
      );
    });

    it('returns 400 when book not in ready status', async () => {
      mockFrom('books', {
        data: { ...readyBook, status: 'draft' },
        error: null,
      });

      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
      }), ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('ready');
    });

    it('returns 400 when PDFs missing', async () => {
      mockFrom('books', {
        data: { ...readyBook, interior_pdf_key: null, cover_pdf_key: null },
        error: null,
      });

      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
      }), ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('PDFs have not been generated');
    });

    it('returns 400 when shipping address fields are missing', async () => {
      mockFrom('books', { data: readyBook, error: null });

      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: { name: 'Jane' },
      }), ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Missing shipping address');
      expect(json.error).toContain('street1');
    });

    it('returns 400 with invalid book tier', async () => {
      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
        bookTier: 'ultra_deluxe',
      }), ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid book tier');
    });

    it('returns 400 with invalid addons', async () => {
      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
        addons: ['laser_etching'],
      }), ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid addons');
    });

    it('returns 400 when color addon used with non-classic tier', async () => {
      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
        bookTier: 'premium',
        addons: ['color'],
      }), ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Color interior add-on');
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
      }), ENV);

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /books/:id/preview - Preview PDF
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /books/:id/preview', () => {
    it('returns 403 for free tier users', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', user_id: 'user-123', title: 'My Book',
          interior_pdf_key: 'user-123/books/b1/interior.pdf', status: 'ready',
        },
        error: null,
      });
      // getUserTier → free
      mockFrom('profiles', { data: { tier: 'free' }, error: null });

      const res = await app.request('/books/b1/preview', { method: 'GET' }, ENV);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('PDF preview not available');
    });

    it('returns the interior PDF for preview (keeper tier)', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', user_id: 'user-123', title: 'My Book',
          interior_pdf_key: 'user-123/books/b1/interior.pdf', status: 'ready',
        },
        error: null,
      });
      // getUserTier → keeper
      mockFrom('profiles', { data: { tier: 'keeper' }, error: null });

      const pdfBody = new Uint8Array([37, 80, 68, 70]);
      ENV.PROCESSED.get = vi.fn(() => Promise.resolve({
        body: pdfBody,
      }));

      const res = await app.request('/books/b1/preview', { method: 'GET' }, ENV);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('My_Book_preview.pdf');
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const res = await app.request('/books/nope/preview', { method: 'GET' }, ENV);

      expect(res.status).toBe(404);
    });

    it('returns 400 when PDF not generated yet (keeper tier)', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', user_id: 'user-123', title: 'My Book',
          interior_pdf_key: null, status: 'draft',
        },
        error: null,
      });

      const res = await app.request('/books/b1/preview', { method: 'GET' }, ENV);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('not been generated');
    });

    it('returns 404 when PDF file not found in storage (keeper tier)', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', user_id: 'user-123', title: 'My Book',
          interior_pdf_key: 'user-123/books/b1/interior.pdf', status: 'ready',
        },
        error: null,
      });
      // getUserTier → keeper
      mockFrom('profiles', { data: { tier: 'keeper' }, error: null });

      ENV.PROCESSED.get = vi.fn(() => null);

      const res = await app.request('/books/b1/preview', { method: 'GET' }, ENV);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('PDF file not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /books/:id/status - Status polling
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /books/:id/status', () => {
    it('returns message when no lulu order exists', async () => {
      mockFrom('books', {
        data: { id: 'b1', status: 'ready', lulu_order_id: null },
        error: null,
      });

      const res = await app.request('/books/b1/status', { method: 'GET' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain('No Lulu order');
      expect(json.status).toBe('ready');
    });

    it('updates local status when lulu reports SHIPPED', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', status: 'ordered', lulu_order_id: 'lulu-123',
          payment_status: 'paid', shipping_address: null,
          quantity: 1, print_options: null, order_cost: null,
        },
        error: null,
      });
      // books update (status change to shipped)
      mockFrom('books', { data: null, error: null });

      getOrderStatus.mockResolvedValueOnce({
        status: 'SHIPPED',
        statusMessage: 'Your book has shipped!',
        lineItems: [{ trackingId: 'TRK123', trackingUrl: 'https://track.example.com/TRK123' }],
        costs: { total: '19.99' },
      });

      const res = await app.request('/books/b1/status', { method: 'GET' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('shipped');
      expect(json.luluStatus).toBe('SHIPPED');
      expect(json.trackingInfo).toHaveLength(1);
      expect(json.trackingInfo[0].trackingId).toBe('TRK123');
    });

    it('falls back to mock order info when lulu API fails for mock orders', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', status: 'ordered', lulu_order_id: 'mock-order-123',
          payment_status: 'paid',
          shipping_address: { trackingId: 'MOCK-TRK', trackingUrl: 'https://mock-track.com' },
          quantity: 1, print_options: null, order_cost: null,
        },
        error: null,
      });

      getOrderStatus.mockRejectedValueOnce(new Error('API not reachable'));

      const res = await app.request('/books/b1/status', { method: 'GET' }, ENV);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.statusMessage).toContain('Mock order');
      expect(json.trackingInfo).toHaveLength(1);
      expect(json.trackingInfo[0].trackingId).toBe('MOCK-TRK');
    });

    it('returns 502 when lulu API fails for real orders', async () => {
      mockFrom('books', {
        data: {
          id: 'b1', status: 'ordered', lulu_order_id: 'real-lulu-order-456',
          payment_status: 'paid', shipping_address: null,
          quantity: 1, print_options: null, order_cost: null,
        },
        error: null,
      });

      getOrderStatus.mockRejectedValueOnce(new Error('Lulu service down'));

      const res = await app.request('/books/b1/status', { method: 'GET' }, ENV);

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain('Failed to fetch latest status');
    });

    it('returns 404 when book not found', async () => {
      mockFrom('books', { data: null, error: { message: 'not found' } });

      const res = await app.request('/books/nope/status', { method: 'GET' }, ENV);

      expect(res.status).toBe(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// bookTier + addons validation (via order route behavior)
// ═══════════════════════════════════════════════════════════════════════════════

describe('bookTier + addons validation (via order route)', () => {
  const app = createApp(booksRoutes, '/books');
  const validAddr = {
    name: 'Jane', street1: '123 Main', city: 'Town',
    state: 'OH', postalCode: '44123', email: 'j@e.com', phone: '555-123-4567',
  };
  const readyBook = {
    id: 'b1', title: 'Book', status: 'ready',
    interior_pdf_key: 'k1', cover_pdf_key: 'k2',
  };

  function createApp(routes, basePath = '/') {
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('user', USER);
      await next();
    });
    app.route(basePath, routes);
    return app;
  }

  it('accepts each valid book tier', async () => {
    for (const bookTier of ['classic', 'premium', 'heirloom']) {
      supabaseFromResults = {};
      mockFrom('books', { data: readyBook, error: null });
      mockFrom('books', { data: null, error: null });
      mockFrom('books', { data: null, error: null });

      const res = await app.request('/books/b1/order', postOpts({
        shippingAddress: validAddr,
        bookTier,
      }), ENV);

      expect(res.status).toBe(200);
    }
  });

  it('rejects invalid book tier', async () => {
    const res = await app.request('/books/b1/order', postOpts({
      shippingAddress: validAddr,
      bookTier: 'platinum',
    }), ENV);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid book tier');
  });

  it('accepts valid addons', async () => {
    mockFrom('books', { data: readyBook, error: null });
    mockFrom('books', { data: null, error: null });
    mockFrom('books', { data: null, error: null });

    const res = await app.request('/books/b1/order', postOpts({
      shippingAddress: validAddr,
      bookTier: 'classic',
      addons: ['glossy', 'coil', 'color'],
    }), ENV);

    expect(res.status).toBe(200);
  });

  it('rejects invalid addons', async () => {
    const res = await app.request('/books/b1/order', postOpts({
      shippingAddress: validAddr,
      addons: ['gold_leaf'],
    }), ENV);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid addons');
  });

  it('rejects color addon with non-classic tier', async () => {
    const res = await app.request('/books/b1/order', postOpts({
      shippingAddress: validAddr,
      bookTier: 'heirloom',
      addons: ['color'],
    }), ENV);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Color interior add-on');
  });

  it('defaults to classic tier when no bookTier provided', async () => {
    mockFrom('books', { data: readyBook, error: null });
    mockFrom('books', { data: null, error: null });
    mockFrom('books', { data: null, error: null });

    const res = await app.request('/books/b1/order', postOpts({
      shippingAddress: validAddr,
    }), ENV);

    expect(res.status).toBe(200);
    // Verify classic was used as default
    expect(createBookCheckoutSession).toHaveBeenCalledWith(
      'user-123', readyBook, validAddr, 1, ENV, 'classic', []
    );
  });
});
