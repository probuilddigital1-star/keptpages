/**
 * Tests for scan pipeline routes.
 * @see ../routes/scan.js
 *
 * Mocks Supabase, Gemini, Claude, and confidence services to test
 * all route handlers in isolation.
 */

import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock @supabase/supabase-js
const mockSupabaseClient = {};
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock AI services
vi.mock('../services/gemini.js', () => ({
  sendToGemini: vi.fn(),
}));

vi.mock('../services/claude.js', () => ({
  sendToClaude: vi.fn(),
}));

vi.mock('../services/confidence.js', () => ({
  calculateConfidence: vi.fn(),
}));

// Import after mocks are declared
import scan from '../routes/scan.js';
import { createClient } from '@supabase/supabase-js';
import { sendToGemini } from '../services/gemini.js';
import { sendToClaude } from '../services/claude.js';
import { calculateConfidence } from '../services/confidence.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER = { id: 'user-abc-123', email: 'test@example.com' };

/**
 * Build a fluent Supabase query-builder mock.
 * Every chaining method returns the same builder so calls like
 *   supabase.from('scans').select('*').eq('id', x).single()
 * all resolve correctly. The final method (.single(), or the last awaited
 * call) resolves with `result`.
 */
function createQueryBuilder(result = { data: null, error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    // When no .single() is called the builder itself is awaited (thenable).
    then: vi.fn((resolve) => resolve(result)),
  };
  return builder;
}

/**
 * Wire `mockSupabaseClient.from` so that each table name can return its
 * own query builder. Pass an object like:
 *   { scans: builder1, collection_items: builder2 }
 */
function setupSupabase(tableBuilders) {
  mockSupabaseClient.from = vi.fn((table) => {
    if (tableBuilders[table]) return tableBuilders[table];
    // Default fallback returns an empty builder
    return createQueryBuilder();
  });
}

/**
 * Create a mock R2 bucket with configurable get/put/delete.
 */
function createR2Bucket(objects = {}) {
  return {
    get: vi.fn(async (key) => objects[key] || null),
    put: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  };
}

/**
 * Create a mock Hono context that satisfies the routes.
 */
function createMockContext({
  user = TEST_USER,
  params = {},
  formData = null,
  jsonBody = null,
  uploads = createR2Bucket(),
  processed = createR2Bucket(),
} = {}) {
  const store = { user };

  const c = {
    get: vi.fn((key) => store[key]),
    set: vi.fn((key, val) => { store[key] = val; }),
    env: {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      UPLOADS: uploads,
      PROCESSED: processed,
    },
    req: {
      param: vi.fn((name) => params[name]),
      formData: vi.fn(async () => {
        if (formData instanceof Error) throw formData;
        return formData;
      }),
      json: vi.fn(async () => {
        if (jsonBody instanceof Error) throw jsonBody;
        return jsonBody;
      }),
    },
    json: vi.fn((data, status) => {
      return { _json: data, _status: status || 200 };
    }),
  };

  return c;
}

/**
 * Create a minimal File-like object for upload tests.
 */
function createMockFile({
  name = 'photo.jpg',
  type = 'image/jpeg',
  size = 1024,
} = {}) {
  const buffer = new ArrayBuffer(size);
  const file = new File([buffer], name, { type });
  // Override size for large-file tests where we don't want to allocate real memory
  if (size !== file.size) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

/**
 * Helper to invoke a specific route handler on the Hono app by
 * constructing a minimal Request and using app.fetch().
 * Since we mock at the Supabase/service level, we instead extract the
 * handler directly by matching the route definitions.
 *
 * For simplicity, we call the route handlers through the Hono app's
 * internal routing. We build a real Request and override fetch on the app.
 */

// We cannot easily call Hono route handlers with a mock context directly,
// so we extract handler functions by inspecting the Hono routes.
// Instead, let's use a wrapper approach: we import the module, which
// exports a Hono sub-app, and invoke handlers by calling app.fetch()
// with crafted Request objects. But since the handlers use c.get('user'),
// c.env, etc., we need the middleware to have set those up.
//
// The cleanest approach: call the route handler functions directly.
// Hono stores routes internally. We'll use a simpler pattern: directly
// re-export helpers that call the handlers with our mock context.

// Actually, since Hono routes register handlers internally and we can't
// easily extract them, the most practical approach is to build a thin
// wrapper that mounts middleware to populate `c.env` and `c.set('user')`
// then calls `scan.fetch(request, env)`.

import { Hono } from 'hono';

/**
 * Build a test app that injects our mock env and user, then delegates to
 * the scan routes.
 */
function buildTestApp({ user = TEST_USER, uploads, processed } = {}) {
  const app = new Hono();
  const mockUploads = uploads || createR2Bucket();
  const mockProcessed = processed || createR2Bucket();

  // Middleware to inject user and env
  app.use('/*', async (c, next) => {
    c.set('user', user);
    // Hono's c.env is set from the fetch binding, so we override it here
    c.env = {
      ...c.env,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      UPLOADS: mockUploads,
      PROCESSED: mockProcessed,
    };
    await next();
  });

  app.route('/scan', scan);

  app.onError((err, c) => {
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  });

  return { app, uploads: mockUploads, processed: mockProcessed };
}

/**
 * Convenience: call a route and parse the JSON response.
 */
async function callRoute(app, method, path, { body, headers = {} } = {}) {
  const url = `http://localhost${path}`;
  const init = { method, headers: { ...headers } };

  if (body instanceof FormData) {
    init.body = body;
    // Don't set Content-Type for FormData; the runtime adds the boundary
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }

  const req = new Request(url, init);
  const res = await app.fetch(req);
  return res;
}

async function callJson(app, method, path, opts) {
  const res = await callRoute(app, method, path, opts);
  const data = await res.json();
  return { status: res.status, data, response: res };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- GET /scan ----
describe('GET /scan - list scans', () => {
  it('returns a formatted list of scans', async () => {
    const scansFromDb = [
      {
        id: 'scan-1',
        title: 'Chocolate Cake',
        document_type: 'recipe',
        confidence_score: 0.92,
        original_filename: 'cake.jpg',
        status: 'completed',
        additional_r2_keys: null,
        created_at: '2025-06-01T00:00:00Z',
      },
      {
        id: 'scan-2',
        title: 'Bread Recipe',
        document_type: 'recipe',
        confidence_score: 0.85,
        original_filename: 'bread.png',
        status: 'uploaded',
        additional_r2_keys: [{ r2Key: 'key1' }],
        created_at: '2025-05-31T00:00:00Z',
      },
    ];

    const builder = createQueryBuilder({ data: scansFromDb, error: null });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'GET', '/scan');

    expect(status).toBe(200);
    expect(data.scans).toHaveLength(2);
    expect(data.scans[0]).toEqual({
      id: 'scan-1',
      title: 'Chocolate Cake',
      documentType: 'recipe',
      confidence: 0.92,
      originalFilename: 'cake.jpg',
      status: 'completed',
      pageCount: 1,
      createdAt: '2025-06-01T00:00:00Z',
    });
    expect(data.scans[1].id).toBe('scan-2');
    expect(data.scans[1].pageCount).toBe(2);
  });

  it('returns 500 on database error', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'DB down' } });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'GET', '/scan');

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to fetch scans');
  });
});

// ---- POST /scan ----
describe('POST /scan - upload', () => {
  it('creates a scan record and returns 201 on success', async () => {
    const scanRecord = {
      id: 'scan-new',
      status: 'uploaded',
      r2_key: 'user-abc-123/12345-uuid.jpg',
      original_filename: 'photo.jpg',
      created_at: '2025-06-01T12:00:00Z',
    };

    // First call: dedup check (no match), second call: insert
    const dedupBuilder = createQueryBuilder({ data: null, error: { code: 'PGRST116' } });
    const insertBuilder = createQueryBuilder({ data: scanRecord, error: null });
    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return dedupBuilder;
      return insertBuilder;
    });

    const { app, uploads } = buildTestApp();

    const form = new FormData();
    const file = new File([new ArrayBuffer(1024)], 'photo.jpg', { type: 'image/jpeg' });
    form.append('image', file);

    const { status, data } = await callJson(app, 'POST', '/scan', { body: form });

    expect(status).toBe(201);
    expect(data.id).toBe('scan-new');
    expect(data.status).toBe('uploaded');
    expect(data.originalFilename).toBe('photo.jpg');
    expect(uploads.put).toHaveBeenCalledTimes(1);
    // Verify file_hash is included in the insert
    const insertCall = insertBuilder.insert.mock.calls[0]?.[0];
    expect(insertCall).toHaveProperty('file_hash');
    expect(typeof insertCall.file_hash).toBe('string');
  });

  it('returns 400 when image field is missing', async () => {
    setupSupabase({ scans: createQueryBuilder() });

    const { app } = buildTestApp();

    const form = new FormData();
    form.append('notAnImage', 'hello');

    const { status, data } = await callJson(app, 'POST', '/scan', { body: form });

    expect(status).toBe(400);
    expect(data.error).toMatch(/Missing "image" field/);
  });

  it('returns 400 for unsupported file type', async () => {
    setupSupabase({ scans: createQueryBuilder() });

    const { app } = buildTestApp();

    const form = new FormData();
    const file = new File([new ArrayBuffer(10)], 'doc.pdf', { type: 'application/pdf' });
    form.append('image', file);

    const { status, data } = await callJson(app, 'POST', '/scan', { body: form });

    expect(status).toBe(400);
    expect(data.error).toMatch(/Unsupported file type/);
    expect(data.error).toContain('application/pdf');
  });

  it('returns 400 when file is too large', async () => {
    setupSupabase({ scans: createQueryBuilder() });

    const { app } = buildTestApp();

    // Create a real file larger than 20MB. We use a Blob that reports the
    // correct size without allocating 21MB of memory.
    const twentyOneMB = 21 * 1024 * 1024;
    // Build a Blob-based File that genuinely has size > 20MB
    const chunk = new Uint8Array(1024); // 1KB
    const parts = [];
    const numChunks = Math.ceil(twentyOneMB / chunk.length);
    for (let i = 0; i < numChunks; i++) {
      parts.push(chunk);
    }
    const bigFile = new File(parts, 'huge.jpg', { type: 'image/jpeg' });
    expect(bigFile.size).toBeGreaterThan(20 * 1024 * 1024);

    const form = new FormData();
    form.append('image', bigFile);

    const { status, data } = await callJson(app, 'POST', '/scan', { body: form });

    expect(status).toBe(400);
    expect(data.error).toMatch(/File too large/);
  });

  it('rolls back R2 upload on database error and returns 500', async () => {
    // First call: dedup check (no match), second call: insert (fails)
    const dedupBuilder = createQueryBuilder({ data: null, error: { code: 'PGRST116' } });
    const insertBuilder = createQueryBuilder({ data: null, error: { message: 'insert failed' } });
    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return dedupBuilder;
      return insertBuilder;
    });

    const { app, uploads } = buildTestApp();

    const form = new FormData();
    const file = new File([new ArrayBuffer(512)], 'cake.jpg', { type: 'image/jpeg' });
    form.append('image', file);

    const { status, data } = await callJson(app, 'POST', '/scan', { body: form });

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to create scan record');
    // R2 put was called, then delete was called to roll back
    expect(uploads.put).toHaveBeenCalledTimes(1);
    expect(uploads.delete).toHaveBeenCalledTimes(1);
  });
});

// ---- POST /scan/:id/process ----
describe('POST /scan/:id/process - Gemini processing', () => {
  const scanId = 'scan-proc-1';
  const scanRecord = {
    id: scanId,
    user_id: TEST_USER.id,
    r2_key: 'user-abc-123/original.jpg',
    mime_type: 'image/jpeg',
    status: 'uploaded',
    extracted_data: null,
  };

  const extractedData = {
    type: 'recipe',
    title: 'Banana Bread',
    ingredients: ['bananas', 'flour', 'sugar'],
  };

  it('processes a scan with Gemini and returns results', async () => {
    // Step 1: fetch scan
    const fetchBuilder = createQueryBuilder({ data: scanRecord, error: null });
    // Step 2: claim (update + neq + select + single)
    const claimBuilder = createQueryBuilder({ data: { id: scanId }, error: null });
    // Step 3: final update
    const updateBuilder = createQueryBuilder({
      data: {
        id: scanId,
        status: 'completed',
        processed_at: '2025-06-01T13:00:00Z',
      },
      error: null,
    });

    // The route calls supabase.from('scans') three times.
    // We track call count to return different builders.
    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      if (callCount === 2) return claimBuilder;
      if (callCount === 3) return updateBuilder;
      return createQueryBuilder();
    });

    const imageBody = new ArrayBuffer(256);
    const r2Object = {
      body: new ReadableStream(),
      arrayBuffer: vi.fn(async () => imageBody),
    };
    const uploads = createR2Bucket({ [scanRecord.r2_key]: r2Object });
    const processed = createR2Bucket();

    sendToGemini.mockResolvedValue(extractedData);
    calculateConfidence.mockReturnValue({ score: 0.9, warnings: [] });

    const { app } = buildTestApp({ uploads, processed });
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/process`);

    expect(status).toBe(200);
    expect(data.status).toBe('completed');
    expect(data.documentType).toBe('recipe');
    expect(data.title).toBe('Banana Bread');
    expect(data.confidence).toBe(0.9);
    expect(data.aiModel).toBe('gemini-2.5-flash');
    expect(data.extractedData).toEqual(extractedData);
    expect(sendToGemini).toHaveBeenCalledWith(
      [{ buffer: imageBody, mimeType: 'image/jpeg' }],
      expect.anything()
    );
    expect(calculateConfidence).toHaveBeenCalledWith(extractedData);
    expect(processed.put).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when scan is not found', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'not found' } });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/process`);

    expect(status).toBe(404);
    expect(data.error).toBe('Scan not found');
  });

  it('returns 409 when scan is already processing', async () => {
    const fetchBuilder = createQueryBuilder({ data: scanRecord, error: null });
    const claimBuilder = createQueryBuilder({ data: null, error: { message: 'no rows' } });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      return claimBuilder;
    });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/process`);

    expect(status).toBe(409);
    expect(data.error).toBe('Scan is already being processed');
  });

  it('returns 500 when image is not in R2', async () => {
    const fetchBuilder = createQueryBuilder({ data: scanRecord, error: null });
    const claimBuilder = createQueryBuilder({ data: { id: scanId }, error: null });
    const errorUpdateBuilder = createQueryBuilder({ data: null, error: null });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      if (callCount === 2) return claimBuilder;
      return errorUpdateBuilder;
    });

    // R2 returns null for the key
    const uploads = createR2Bucket({});
    const { app } = buildTestApp({ uploads });
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/process`);

    expect(status).toBe(500);
    expect(data.error).toBe('Processing failed');
    expect(data.details).toContain('Primary image not found');
  });

  it('returns 500 and sets error status on processing error', async () => {
    const fetchBuilder = createQueryBuilder({ data: scanRecord, error: null });
    const claimBuilder = createQueryBuilder({ data: { id: scanId }, error: null });
    const errorUpdateBuilder = createQueryBuilder({ data: null, error: null });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      if (callCount === 2) return claimBuilder;
      return errorUpdateBuilder;
    });

    const r2Object = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(64)),
    };
    const uploads = createR2Bucket({ [scanRecord.r2_key]: r2Object });

    sendToGemini.mockRejectedValue(new Error('Gemini API timeout'));

    const { app } = buildTestApp({ uploads });
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/process`);

    expect(status).toBe(500);
    expect(data.error).toBe('Processing failed');
    expect(data.details).toBe('Gemini API timeout');
  });
});

// ---- POST /scan/:id/reprocess ----
describe('POST /scan/:id/reprocess - Claude reprocessing', () => {
  const scanId = 'scan-reproc-1';
  const scanRecord = {
    id: scanId,
    user_id: TEST_USER.id,
    r2_key: 'user-abc-123/original.jpg',
    mime_type: 'image/jpeg',
    status: 'completed',
    extracted_data: { type: 'recipe', title: 'Old Title' },
  };

  const newExtractedData = {
    type: 'recipe',
    title: 'Better Title',
    ingredients: ['flour', 'butter'],
  };

  it('reprocesses with Claude and returns results', async () => {
    const fetchBuilder = createQueryBuilder({ data: scanRecord, error: null });
    const claimBuilder = createQueryBuilder({ data: { id: scanId }, error: null });
    const updateBuilder = createQueryBuilder({
      data: {
        id: scanId,
        status: 'completed',
        processed_at: '2025-06-01T14:00:00Z',
      },
      error: null,
    });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      if (callCount === 2) return claimBuilder;
      if (callCount === 3) return updateBuilder;
      return createQueryBuilder();
    });

    const imageBody = new ArrayBuffer(128);
    const r2Object = {
      arrayBuffer: vi.fn(async () => imageBody),
    };
    const uploads = createR2Bucket({ [scanRecord.r2_key]: r2Object });
    const processed = createR2Bucket();

    sendToClaude.mockResolvedValue(newExtractedData);
    calculateConfidence.mockReturnValue({ score: 0.95, warnings: ['minor_warning'] });

    const { app } = buildTestApp({ uploads, processed });
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/reprocess`);

    expect(status).toBe(200);
    expect(data.status).toBe('completed');
    expect(data.title).toBe('Better Title');
    expect(data.confidence).toBe(0.95);
    expect(data.warnings).toEqual(['minor_warning']);
    expect(data.aiModel).toBe('claude-sonnet');
    expect(sendToClaude).toHaveBeenCalledWith(
      [{ buffer: imageBody, mimeType: 'image/jpeg' }],
      scanRecord.extracted_data,
      expect.anything()
    );
    expect(processed.put).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when scan is not found', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'not found' } });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/reprocess`);

    expect(status).toBe(404);
    expect(data.error).toBe('Scan not found');
  });

  it('returns 409 when scan is already processing', async () => {
    const fetchBuilder = createQueryBuilder({ data: scanRecord, error: null });
    const claimBuilder = createQueryBuilder({ data: null, error: { message: 'no match' } });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      return claimBuilder;
    });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/reprocess`);

    expect(status).toBe(409);
    expect(data.error).toBe('Scan is already being processed');
  });

  it('returns 500 on Claude processing error', async () => {
    const fetchBuilder = createQueryBuilder({ data: scanRecord, error: null });
    const claimBuilder = createQueryBuilder({ data: { id: scanId }, error: null });
    const errorUpdateBuilder = createQueryBuilder({ data: null, error: null });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      if (callCount === 2) return claimBuilder;
      return errorUpdateBuilder;
    });

    const r2Object = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(64)),
    };
    const uploads = createR2Bucket({ [scanRecord.r2_key]: r2Object });

    sendToClaude.mockRejectedValue(new Error('Claude rate limited'));

    const { app } = buildTestApp({ uploads });
    const { status, data } = await callJson(app, 'POST', `/scan/${scanId}/reprocess`);

    expect(status).toBe(500);
    expect(data.error).toBe('Reprocessing failed');
    expect(data.details).toBe('Claude rate limited');
  });
});

// ---- GET /scan/:id ----
describe('GET /scan/:id - get single scan', () => {
  const scanId = 'scan-detail-1';

  it('returns all scan fields formatted correctly', async () => {
    const scanRecord = {
      id: scanId,
      status: 'completed',
      document_type: 'recipe',
      title: 'Chocolate Cake',
      original_filename: 'cake.jpg',
      mime_type: 'image/jpeg',
      file_size: 2048,
      confidence_score: 0.88,
      warnings: ['low_contrast'],
      extracted_data: { type: 'recipe', title: 'Chocolate Cake' },
      ai_model: 'gemini-2.5-flash',
      error_message: null,
      created_at: '2025-06-01T00:00:00Z',
      processed_at: '2025-06-01T01:00:00Z',
    };

    const builder = createQueryBuilder({ data: scanRecord, error: null });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'GET', `/scan/${scanId}`);

    expect(status).toBe(200);
    expect(data).toEqual({
      id: scanId,
      status: 'completed',
      documentType: 'recipe',
      title: 'Chocolate Cake',
      originalFilename: 'cake.jpg',
      mimeType: 'image/jpeg',
      fileSize: 2048,
      confidence: 0.88,
      warnings: ['low_contrast'],
      extractedData: { type: 'recipe', title: 'Chocolate Cake' },
      aiModel: 'gemini-2.5-flash',
      errorMessage: null,
      pageCount: 1,
      createdAt: '2025-06-01T00:00:00Z',
      processedAt: '2025-06-01T01:00:00Z',
    });
  });

  it('returns 404 when scan is not found', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'not found' } });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'GET', `/scan/${scanId}`);

    expect(status).toBe(404);
    expect(data.error).toBe('Scan not found');
  });
});

// ---- GET /scan/:id/image ----
describe('GET /scan/:id/image - serve image', () => {
  const scanId = 'scan-img-1';
  const scanRecord = {
    r2_key: 'user-abc-123/photo.png',
    mime_type: 'image/png',
    additional_r2_keys: null,
  };

  it('serves the image with correct Content-Type header', async () => {
    const builder = createQueryBuilder({ data: scanRecord, error: null });
    setupSupabase({ scans: builder });

    const imageBytes = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    const r2Object = {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(imageBytes);
          controller.close();
        },
      }),
    };
    const uploads = createR2Bucket({ [scanRecord.r2_key]: r2Object });

    const { app } = buildTestApp({ uploads });
    const res = await callRoute(app, 'GET', `/scan/${scanId}/image`);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=3600');
  });

  it('returns 404 when scan is not found in DB', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'not found' } });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'GET', `/scan/${scanId}/image`);

    expect(status).toBe(404);
    expect(data.error).toBe('Scan not found');
  });

  it('returns 404 when image is not in R2', async () => {
    const builder = createQueryBuilder({ data: scanRecord, error: null });
    setupSupabase({ scans: builder });

    const uploads = createR2Bucket({}); // empty, nothing stored
    const { app } = buildTestApp({ uploads });
    const { status, data } = await callJson(app, 'GET', `/scan/${scanId}/image`);

    expect(status).toBe(404);
    expect(data.error).toBe('Image not found in storage');
  });
});

// ---- PUT /scan/:id ----
describe('PUT /scan/:id - update scan fields', () => {
  const scanId = 'scan-edit-1';

  const existing = {
    id: scanId,
    extracted_data: { type: 'recipe', title: 'Old', ingredients: ['flour'] },
  };

  it('updates scan fields and recalculates confidence', async () => {
    const fetchBuilder = createQueryBuilder({ data: existing, error: null });
    const updateBuilder = createQueryBuilder({
      data: {
        id: scanId,
        status: 'completed',
        document_type: 'recipe',
        title: 'New Title',
        confidence_score: 0.95,
        warnings: [],
        extracted_data: { type: 'recipe', title: 'New Title', ingredients: ['flour', 'sugar'] },
        updated_at: '2025-06-01T15:00:00Z',
      },
      error: null,
    });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      return updateBuilder;
    });

    calculateConfidence.mockReturnValue({ score: 0.95, warnings: [] });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'PUT', `/scan/${scanId}`, {
      body: { title: 'New Title', ingredients: ['flour', 'sugar'] },
    });

    expect(status).toBe(200);
    expect(data.id).toBe(scanId);
    expect(data.title).toBe('New Title');
    expect(data.confidence).toBe(0.95);
    expect(calculateConfidence).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recipe',
        title: 'New Title',
        ingredients: ['flour', 'sugar'],
      })
    );
  });

  it('returns 404 when scan is not found', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'not found' } });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'PUT', `/scan/${scanId}`, {
      body: { title: 'X' },
    });

    expect(status).toBe(404);
    expect(data.error).toBe('Scan not found');
  });

  it('returns 400 for invalid JSON body', async () => {
    setupSupabase({ scans: createQueryBuilder() });

    const { app } = buildTestApp();

    const res = await callRoute(app, 'PUT', `/scan/${scanId}`, {
      body: undefined,
      headers: { 'Content-Type': 'application/json' },
    });
    // Send raw invalid JSON
    const url = `http://localhost/scan/${scanId}`;
    const rawRes = await app.fetch(
      new Request(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{{{',
      })
    );
    const data = await rawRes.json();

    expect(rawRes.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });

  it('recalculates confidence after edits', async () => {
    const fetchBuilder = createQueryBuilder({ data: existing, error: null });
    const updateBuilder = createQueryBuilder({
      data: {
        id: scanId,
        status: 'completed',
        document_type: 'dessert',
        title: 'Old',
        confidence_score: 0.7,
        warnings: ['missing_instructions'],
        extracted_data: { type: 'dessert', title: 'Old', ingredients: ['flour'] },
        updated_at: '2025-06-01T15:00:00Z',
      },
      error: null,
    });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      return updateBuilder;
    });

    calculateConfidence.mockReturnValue({ score: 0.7, warnings: ['missing_instructions'] });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'PUT', `/scan/${scanId}`, {
      body: { type: 'dessert' },
    });

    expect(status).toBe(200);
    expect(data.confidence).toBe(0.7);
    expect(data.warnings).toEqual(['missing_instructions']);
    expect(calculateConfidence).toHaveBeenCalledTimes(1);
  });
});

// ---- DELETE /scan/:id ----
describe('DELETE /scan/:id - soft delete', () => {
  const scanId = 'scan-del-1';

  it('soft-deletes a scan successfully', async () => {
    const fetchBuilder = createQueryBuilder({
      data: { id: scanId, r2_key: 'user-abc-123/file.jpg', additional_r2_keys: null },
      error: null,
    });
    const collectionBuilder = createQueryBuilder({ data: null, error: null });
    const deleteBuilder = createQueryBuilder({ error: null });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn((table) => {
      callCount++;
      if (callCount === 1) return fetchBuilder;       // scans select
      if (table === 'collection_items') return collectionBuilder;
      return deleteBuilder;                            // scans update (soft delete)
    });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'DELETE', `/scan/${scanId}`);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('removes scan from collections before deleting', async () => {
    const fetchBuilder = createQueryBuilder({
      data: { id: scanId, r2_key: 'user-abc-123/file.jpg', additional_r2_keys: null },
      error: null,
    });
    const collectionBuilder = createQueryBuilder({ data: null, error: null });
    const deleteBuilder = createQueryBuilder({ error: null });

    const fromCalls = [];
    let callCount = 0;
    mockSupabaseClient.from = vi.fn((table) => {
      callCount++;
      fromCalls.push(table);
      if (callCount === 1) return fetchBuilder;
      if (table === 'collection_items') return collectionBuilder;
      return deleteBuilder;
    });

    const { app } = buildTestApp();
    await callJson(app, 'DELETE', `/scan/${scanId}`);

    // Verify collection_items was accessed before the final scans update
    const collectionIdx = fromCalls.indexOf('collection_items');
    const lastScansIdx = fromCalls.lastIndexOf('scans');
    expect(collectionIdx).toBeGreaterThan(-1);
    expect(collectionIdx).toBeLessThan(lastScansIdx);
  });

  it('returns 404 when scan is not found', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'not found' } });
    setupSupabase({ scans: builder });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'DELETE', `/scan/${scanId}`);

    expect(status).toBe(404);
    expect(data.error).toBe('Scan not found');
  });

  it('returns 500 on database error during soft-delete', async () => {
    const fetchBuilder = createQueryBuilder({
      data: { id: scanId, r2_key: 'user-abc-123/file.jpg', additional_r2_keys: null },
      error: null,
    });
    const collectionBuilder = createQueryBuilder({ data: null, error: null });
    const deleteBuilder = createQueryBuilder({ error: { message: 'DB error' } });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn((table) => {
      callCount++;
      if (callCount === 1) return fetchBuilder;
      if (table === 'collection_items') return collectionBuilder;
      return deleteBuilder;
    });

    const { app } = buildTestApp();
    const { status, data } = await callJson(app, 'DELETE', `/scan/${scanId}`);

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to delete scan');
  });
});
