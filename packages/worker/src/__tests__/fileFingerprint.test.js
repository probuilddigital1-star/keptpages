/**
 * Tests for file fingerprinting and deduplication in scan routes.
 * @see ../routes/scan.js
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockSupabaseClient = {};
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('../services/gemini.js', () => ({
  sendToGemini: vi.fn(),
}));

vi.mock('../services/claude.js', () => ({
  sendToClaude: vi.fn(),
}));

vi.mock('../services/confidence.js', () => ({
  calculateConfidence: vi.fn(),
}));

import scan from '../routes/scan.js';
import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER = { id: 'user-abc-123', email: 'test@example.com' };

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
    then: vi.fn((resolve) => resolve(result)),
  };
  return builder;
}

function createR2Bucket() {
  return {
    get: vi.fn(async () => null),
    put: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  };
}

/**
 * Build a Hono app that pre-populates c.env and c.set('user')
 * then mounts the scan routes.
 */
function createTestApp(env) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER);
    // Set c.env (may be undefined when using app.request() without Worker bindings)
    c.env = { ...(c.env || {}), ...env };
    await next();
  });
  app.route('/scan', scan);
  return app;
}

function createMockFile(content = 'test image data', name = 'photo.jpg', type = 'image/jpeg') {
  return new File([content], name, { type });
}

function createFormData(file) {
  const fd = new FormData();
  fd.append('image', file);
  return fd;
}

describe('File fingerprinting', () => {
  let uploads;
  let processed;
  let env;

  beforeEach(() => {
    uploads = createR2Bucket();
    processed = createR2Bucket();
    env = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      UPLOADS: uploads,
      PROCESSED: processed,
    };
    vi.clearAllMocks();
  });

  it('stores file_hash when uploading a new file', async () => {
    // First query: dedup check returns no match
    const dedupBuilder = createQueryBuilder({ data: null, error: { code: 'PGRST116' } });
    // Second query: INSERT
    const insertBuilder = createQueryBuilder({
      data: {
        id: 'scan-1',
        status: 'uploaded',
        original_filename: 'photo.jpg',
        created_at: '2026-01-01',
        r2_key: 'test-key',
      },
      error: null,
    });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return dedupBuilder; // dedup check
      return insertBuilder; // insert
    });

    const app = createTestApp(env);
    const file = createMockFile();
    const fd = createFormData(file);

    const res = await app.request('/scan', {
      method: 'POST',
      body: fd,
    });

    const json = await res.json();
    expect(json.id).toBe('scan-1');
    expect(json.status).toBe('uploaded');

    // Verify file_hash was included in the insert call
    const insertCall = insertBuilder.insert.mock.calls[0]?.[0];
    expect(insertCall).toHaveProperty('file_hash');
    expect(typeof insertCall.file_hash).toBe('string');
    expect(insertCall.file_hash.length).toBe(64); // SHA-256 hex
  });

  it('returns duplicate when same file already exists', async () => {
    // Dedup check returns an existing scan
    const dedupBuilder = createQueryBuilder({
      data: { id: 'existing-scan-1', title: 'Grandma Cookies' },
      error: null,
    });

    mockSupabaseClient.from = vi.fn(() => dedupBuilder);

    const app = createTestApp(env);
    const file = createMockFile();
    const fd = createFormData(file);

    const res = await app.request('/scan', {
      method: 'POST',
      body: fd,
    });

    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(json.existingScanId).toBe('existing-scan-1');
    expect(json.existingTitle).toBe('Grandma Cookies');

    // R2 should NOT have been called
    expect(uploads.put).not.toHaveBeenCalled();
  });

  it('ignores soft-deleted scans (not considered duplicates)', async () => {
    // Dedup check returns null (no match because deleted_at IS NULL filter)
    const dedupBuilder = createQueryBuilder({ data: null, error: { code: 'PGRST116' } });
    const insertBuilder = createQueryBuilder({
      data: { id: 'scan-new', status: 'uploaded', original_filename: 'photo.jpg', created_at: '2026-01-01', r2_key: 'key' },
      error: null,
    });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return dedupBuilder;
      return insertBuilder;
    });

    const app = createTestApp(env);
    const file = createMockFile();
    const fd = createFormData(file);

    const res = await app.request('/scan', {
      method: 'POST',
      body: fd,
    });

    const json = await res.json();
    expect(json.duplicate).toBeUndefined();
    expect(json.id).toBe('scan-new');
  });

  it('computes SHA-256 hash consistently for same content', async () => {
    // Two uploads with identical content should produce same hash
    const dedupBuilder1 = createQueryBuilder({ data: null, error: { code: 'PGRST116' } });
    const insertBuilder1 = createQueryBuilder({
      data: { id: 'scan-1', status: 'uploaded', original_filename: 'a.jpg', created_at: '2026-01-01', r2_key: 'k1' },
      error: null,
    });

    let callCount = 0;
    mockSupabaseClient.from = vi.fn(() => {
      callCount++;
      if (callCount % 2 === 1) return dedupBuilder1;
      return insertBuilder1;
    });

    const app = createTestApp(env);
    const content = 'identical content for both files';

    // First upload
    const fd1 = createFormData(createMockFile(content, 'a.jpg'));
    await app.request('/scan', { method: 'POST', body: fd1 });

    // Get the hash from the first insert
    const hash1 = insertBuilder1.insert.mock.calls[0]?.[0]?.file_hash;

    // Reset for second upload
    insertBuilder1.insert.mockClear();
    callCount = 0;

    const fd2 = createFormData(createMockFile(content, 'b.jpg'));
    await app.request('/scan', { method: 'POST', body: fd2 });

    const hash2 = insertBuilder1.insert.mock.calls[0]?.[0]?.file_hash;

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
