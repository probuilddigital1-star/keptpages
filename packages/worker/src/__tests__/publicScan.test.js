/**
 * Tests for public (anonymous) scan route.
 * @see ../routes/publicScan.js
 *
 * Mocks Gemini AI service and KV/R2 bindings to test the anonymous
 * scan endpoint in isolation including rate limiting, file validation,
 * R2 storage, and AI extraction.
 */

import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../services/gemini.js', () => ({
  sendToGemini: vi.fn(),
}));

import publicScan from '../routes/publicScan.js';
import { sendToGemini } from '../services/gemini.js';
import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock KV namespace with configurable get/put.
 */
function createKV(store = {}) {
  return {
    get: vi.fn(async (key, opts) => {
      const raw = store[key];
      if (!raw) return null;
      if (opts?.type === 'json') return raw;
      return JSON.stringify(raw);
    }),
    put: vi.fn(async (key, value, opts) => {
      store[key] = JSON.parse(value);
    }),
  };
}

/**
 * Create a mock R2 bucket.
 */
function createR2Bucket() {
  return {
    get: vi.fn(async () => null),
    put: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  };
}

/**
 * Build a test Hono app that mounts publicScan routes with mock env bindings.
 */
function buildTestApp({ kv, uploads, ip } = {}) {
  const app = new Hono();
  const mockKV = kv || createKV();
  const mockUploads = uploads || createR2Bucket();

  app.use('/*', async (c, next) => {
    c.env = {
      ...c.env,
      RATE_LIMIT: mockKV,
      UPLOADS: mockUploads,
      GEMINI_API_KEY: 'test-gemini-key',
    };
    await next();
  });

  app.route('/public/scan', publicScan);

  return { app, kv: mockKV, uploads: mockUploads };
}

/**
 * Convenience: call a route and parse the JSON response.
 */
async function callRoute(app, method, path, { body, headers = {} } = {}) {
  const url = `http://localhost${path}`;
  const init = { method, headers: { ...headers } };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }

  const req = new Request(url, init);
  return app.fetch(req);
}

async function callJson(app, method, path, opts) {
  const res = await callRoute(app, method, path, opts);
  const data = await res.json();
  return { status: res.status, data, response: res };
}

/**
 * Create a FormData with a valid image file attached.
 */
function createImageForm({
  name = 'photo.jpg',
  type = 'image/jpeg',
  size = 1024,
} = {}) {
  const form = new FormData();
  const file = new File([new ArrayBuffer(size)], name, { type });
  form.append('image', file);
  return form;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- POST /public/scan - basic success ----
describe('POST /public/scan - image upload and AI processing', () => {
  const geminiResult = {
    type: 'recipe',
    title: 'Banana Bread',
    ingredients: [
      { item: 'bananas', amount: '3', unit: 'whole' },
      { item: 'flour', amount: '2', unit: 'cups' },
    ],
    instructions: ['Mash bananas', 'Mix with flour', 'Bake at 350F'],
    confidence: 0.92,
    warnings: [],
  };

  it('accepts an image upload and returns AI extraction results', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app, uploads } = buildTestApp();
    const form = createImageForm();

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(200);
    expect(data.type).toBe('recipe');
    expect(data.title).toBe('Banana Bread');
    expect(data.ingredients).toHaveLength(2);
    expect(data.instructions).toHaveLength(3);
    expect(data._anonymous).toBe(true);
    expect(typeof data._remaining).toBe('number');
    expect(data._r2Key).toMatch(/^anonymous\//);
  });

  it('calls sendToGemini with buffer and mimeType array', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app } = buildTestApp();
    const form = createImageForm({ type: 'image/png', name: 'test.png' });

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    expect(sendToGemini).toHaveBeenCalledTimes(1);
    const [imagesArg, envArg] = sendToGemini.mock.calls[0];
    expect(imagesArg).toHaveLength(1);
    expect(imagesArg[0]).toHaveProperty('buffer');
    expect(imagesArg[0]).toHaveProperty('mimeType', 'image/png');
    expect(envArg).toHaveProperty('GEMINI_API_KEY', 'test-gemini-key');
  });

  it('stores image in R2 under anonymous/ prefix', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app, uploads } = buildTestApp();
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(uploads.put).toHaveBeenCalledTimes(1);
    const [r2Key, buffer, metadata] = uploads.put.mock.calls[0];
    expect(r2Key).toMatch(/^anonymous\/[a-f0-9]{16}\/\d+\.jpg$/);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(metadata).toEqual({
      httpMetadata: { contentType: 'image/jpeg' },
    });
  });

  it('uses png extension for PNG images', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app, uploads } = buildTestApp();
    const form = createImageForm({ type: 'image/png', name: 'pic.png' });

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '5.5.5.5' },
    });

    const [r2Key] = uploads.put.mock.calls[0];
    expect(r2Key).toMatch(/\.png$/);
  });

  it('uses jpg extension for non-PNG images', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app, uploads } = buildTestApp();
    const form = createImageForm({ type: 'image/webp', name: 'pic.webp' });

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '5.5.5.5' },
    });

    const [r2Key] = uploads.put.mock.calls[0];
    expect(r2Key).toMatch(/\.jpg$/);
  });

  it('returns remaining scan count in response', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kvStore = {};
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    const { data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    // After one scan, remaining should be 4 (5 - 1)
    expect(data._remaining).toBe(4);
  });

  it('returns r2Key in the response', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app } = buildTestApp();
    const form = createImageForm();

    const { data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(data._r2Key).toBeDefined();
    expect(data._r2Key).toMatch(/^anonymous\//);
    expect(data._r2Key).toMatch(/\.(jpg|png)$/);
  });
});

// ---- Rate Limiting ----
describe('POST /public/scan - IP rate limiting via KV', () => {
  const geminiResult = { type: 'recipe', title: 'Test' };

  it('increments KV count on each scan', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kvStore = {};
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    // KV.put should have been called with count: 1
    expect(kv.put).toHaveBeenCalledTimes(1);
    const [key, value, opts] = kv.put.mock.calls[0];
    expect(key).toBe('anon-scan:10.0.0.1');
    expect(JSON.parse(value)).toEqual({ count: 1 });
    expect(opts).toEqual({ expirationTtl: 86400 });
  });

  it('increments existing KV count correctly', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kvStore = { 'anon-scan:10.0.0.1': { count: 3 } };
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    // Should increment from 3 to 4
    const [, value] = kv.put.mock.calls[0];
    expect(JSON.parse(value)).toEqual({ count: 4 });
  });

  it('returns 429 when limit of 5 scans is reached', async () => {
    const kvStore = { 'anon-scan:10.0.0.1': { count: 5 } };
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    expect(status).toBe(429);
    expect(data.error).toBe('Anonymous scan limit reached');
    expect(data.message).toContain('5 free scans');
    expect(data.message).toContain('Create a free account');
    expect(data.limit).toBe(5);
    expect(data.used).toBe(5);
  });

  it('returns 429 when count exceeds limit', async () => {
    const kvStore = { 'anon-scan:10.0.0.1': { count: 10 } };
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    expect(status).toBe(429);
    expect(data.used).toBe(10);
  });

  it('does not call sendToGemini when rate limited', async () => {
    const kvStore = { 'anon-scan:10.0.0.1': { count: 5 } };
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    expect(sendToGemini).not.toHaveBeenCalled();
  });

  it('does not store image in R2 when rate limited', async () => {
    const kvStore = { 'anon-scan:10.0.0.1': { count: 5 } };
    const kv = createKV(kvStore);
    const uploads = createR2Bucket();
    const { app } = buildTestApp({ kv, uploads });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    expect(uploads.put).not.toHaveBeenCalled();
  });

  it('allows scan at count 4 (one below limit)', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kvStore = { 'anon-scan:10.0.0.1': { count: 4 } };
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    expect(status).toBe(200);
    // Should increment to 5
    const [, value] = kv.put.mock.calls[0];
    expect(JSON.parse(value)).toEqual({ count: 5 });
  });

  it('rate limits different IPs independently', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    // IP1 is at limit, IP2 has no scans
    const kvStore = { 'anon-scan:1.1.1.1': { count: 5 } };
    const kv = createKV(kvStore);
    const { app } = buildTestApp({ kv });

    // IP1 should be blocked
    const form1 = createImageForm();
    const { status: status1 } = await callJson(app, 'POST', '/public/scan', {
      body: form1,
      headers: { 'CF-Connecting-IP': '1.1.1.1' },
    });
    expect(status1).toBe(429);

    // IP2 should succeed
    const form2 = createImageForm();
    const { status: status2 } = await callJson(app, 'POST', '/public/scan', {
      body: form2,
      headers: { 'CF-Connecting-IP': '2.2.2.2' },
    });
    expect(status2).toBe(200);
  });

  it('sets KV expiration TTL to 86400 seconds (24 hours)', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kv = createKV();
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    const [, , opts] = kv.put.mock.calls[0];
    expect(opts.expirationTtl).toBe(86400);
  });

  it('works without KV binding (graceful degradation)', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    // Build app with no KV
    const app = new Hono();
    const mockUploads = createR2Bucket();

    app.use('/*', async (c, next) => {
      c.env = {
        ...c.env,
        RATE_LIMIT: undefined,
        UPLOADS: mockUploads,
        GEMINI_API_KEY: 'test-gemini-key',
      };
      await next();
    });

    app.route('/public/scan', publicScan);

    const form = createImageForm();
    const res = await callRoute(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data._anonymous).toBe(true);
    // Without KV, remaining defaults to MAX_ANON_SCANS (5)
    expect(data._remaining).toBe(5);
  });
});

// ---- IP Identification ----
describe('POST /public/scan - IP identification', () => {
  const geminiResult = { type: 'recipe', title: 'Test' };

  it('uses CF-Connecting-IP header for IP identification', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kv = createKV();
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '203.0.113.50' },
    });

    const [key] = kv.put.mock.calls[0];
    expect(key).toBe('anon-scan:203.0.113.50');
  });

  it('falls back to x-forwarded-for when CF-Connecting-IP is missing', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kv = createKV();
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'x-forwarded-for': '198.51.100.10' },
    });

    const [key] = kv.put.mock.calls[0];
    expect(key).toBe('anon-scan:198.51.100.10');
  });

  it('uses "unknown" when no IP headers are present', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const kv = createKV();
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', { body: form });

    const [key] = kv.put.mock.calls[0];
    expect(key).toBe('anon-scan:unknown');
  });

  it('hashes IP for R2 key prefix', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app, uploads } = buildTestApp();
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    const [r2Key] = uploads.put.mock.calls[0];
    // Should be anonymous/<16-char-hex>/<timestamp>.<ext>
    const parts = r2Key.split('/');
    expect(parts[0]).toBe('anonymous');
    expect(parts[1]).toMatch(/^[a-f0-9]{16}$/);
    expect(parts[2]).toMatch(/^\d+\.(jpg|png)$/);
  });

  it('produces different R2 hashes for different IPs', async () => {
    sendToGemini.mockResolvedValue(geminiResult);

    const { app, uploads } = buildTestApp();

    const form1 = createImageForm();
    await callJson(app, 'POST', '/public/scan', {
      body: form1,
      headers: { 'CF-Connecting-IP': '1.1.1.1' },
    });

    const form2 = createImageForm();
    await callJson(app, 'POST', '/public/scan', {
      body: form2,
      headers: { 'CF-Connecting-IP': '2.2.2.2' },
    });

    const hash1 = uploads.put.mock.calls[0][0].split('/')[1];
    const hash2 = uploads.put.mock.calls[1][0].split('/')[1];
    expect(hash1).not.toBe(hash2);
  });
});

// ---- Input Validation ----
describe('POST /public/scan - input validation', () => {
  it('returns 400 when no image file is provided', async () => {
    const { app } = buildTestApp();
    const form = new FormData();
    form.append('notAnImage', 'hello');

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(400);
    expect(data.error).toBe('No image file provided');
  });

  it('returns 400 when image field is a string instead of file', async () => {
    const { app } = buildTestApp();
    const form = new FormData();
    form.append('image', 'not-a-file');

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(400);
    expect(data.error).toBe('No image file provided');
  });

  it('returns 400 for unsupported file type (application/pdf)', async () => {
    const { app } = buildTestApp();
    const form = new FormData();
    const file = new File([new ArrayBuffer(100)], 'doc.pdf', { type: 'application/pdf' });
    form.append('image', file);

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(400);
    expect(data.error).toBe('Unsupported file type');
  });

  it('returns 400 for unsupported file type (text/plain)', async () => {
    const { app } = buildTestApp();
    const form = new FormData();
    const file = new File([new ArrayBuffer(100)], 'notes.txt', { type: 'text/plain' });
    form.append('image', file);

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(400);
    expect(data.error).toBe('Unsupported file type');
  });

  it('accepts image/jpeg files', async () => {
    sendToGemini.mockResolvedValue({ type: 'recipe', title: 'OK' });

    const { app } = buildTestApp();
    const form = createImageForm({ type: 'image/jpeg' });

    const { status } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(200);
  });

  it('accepts image/png files', async () => {
    sendToGemini.mockResolvedValue({ type: 'recipe', title: 'OK' });

    const { app } = buildTestApp();
    const form = createImageForm({ type: 'image/png', name: 'pic.png' });

    const { status } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(200);
  });

  it('accepts image/webp files', async () => {
    sendToGemini.mockResolvedValue({ type: 'recipe', title: 'OK' });

    const { app } = buildTestApp();
    const form = createImageForm({ type: 'image/webp', name: 'pic.webp' });

    const { status } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(200);
  });

  it('accepts image/gif files', async () => {
    sendToGemini.mockResolvedValue({ type: 'recipe', title: 'OK' });

    const { app } = buildTestApp();
    const form = createImageForm({ type: 'image/gif', name: 'pic.gif' });

    const { status } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(200);
  });

  it('accepts image/heic files', async () => {
    sendToGemini.mockResolvedValue({ type: 'recipe', title: 'OK' });

    const { app } = buildTestApp();
    const form = createImageForm({ type: 'image/heic', name: 'pic.heic' });

    const { status } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(200);
  });

  it('returns 400 when file exceeds 20MB', async () => {
    const { app } = buildTestApp();

    // Build a file that genuinely exceeds 20MB
    const twentyOneMB = 21 * 1024 * 1024;
    const chunk = new Uint8Array(1024);
    const parts = [];
    const numChunks = Math.ceil(twentyOneMB / chunk.length);
    for (let i = 0; i < numChunks; i++) {
      parts.push(chunk);
    }
    const bigFile = new File(parts, 'huge.jpg', { type: 'image/jpeg' });
    expect(bigFile.size).toBeGreaterThan(20 * 1024 * 1024);

    const form = new FormData();
    form.append('image', bigFile);

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(400);
    expect(data.error).toMatch(/File too large/);
  });

  it('returns 400 for invalid form data', async () => {
    const { app } = buildTestApp();

    // Send raw non-form-data body with wrong content type to trigger formData parse error
    const url = 'http://localhost/public/scan';
    const res = await app.fetch(
      new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=invalid',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: 'this is not valid multipart form data',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid form data');
  });
});

// ---- AI Processing Errors ----
describe('POST /public/scan - AI processing failures', () => {
  it('returns 500 when Gemini AI fails', async () => {
    sendToGemini.mockRejectedValue(new Error('Gemini API timeout'));

    const { app } = buildTestApp();
    const form = createImageForm();

    const { status, data } = await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(status).toBe(500);
    expect(data.error).toBe('AI processing failed. Please try again.');
  });

  it('still stores image in R2 even when AI fails', async () => {
    sendToGemini.mockRejectedValue(new Error('API error'));

    const { app, uploads } = buildTestApp();
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    // R2 upload happens before AI processing
    expect(uploads.put).toHaveBeenCalledTimes(1);
  });

  it('still increments rate limit counter even when AI fails', async () => {
    sendToGemini.mockRejectedValue(new Error('API error'));

    const kv = createKV();
    const { app } = buildTestApp({ kv });
    const form = createImageForm();

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });

    // KV put should still have been called (happens before AI)
    expect(kv.put).toHaveBeenCalledTimes(1);
  });
});

// ---- R2 Storage ----
describe('POST /public/scan - R2 storage', () => {
  it('works without UPLOADS binding (graceful degradation)', async () => {
    sendToGemini.mockResolvedValue({ type: 'recipe', title: 'Test' });

    // Build app with no UPLOADS
    const app = new Hono();
    const mockKV = createKV();

    app.use('/*', async (c, next) => {
      c.env = {
        ...c.env,
        RATE_LIMIT: mockKV,
        UPLOADS: undefined,
        GEMINI_API_KEY: 'test-gemini-key',
      };
      await next();
    });

    app.route('/public/scan', publicScan);

    const form = createImageForm();
    const res = await callRoute(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data._anonymous).toBe(true);
  });

  it('stores correct content type metadata in R2', async () => {
    sendToGemini.mockResolvedValue({ type: 'recipe', title: 'Test' });

    const { app, uploads } = buildTestApp();
    const form = createImageForm({ type: 'image/webp', name: 'photo.webp' });

    await callJson(app, 'POST', '/public/scan', {
      body: form,
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    const [, , metadata] = uploads.put.mock.calls[0];
    expect(metadata.httpMetadata.contentType).toBe('image/webp');
  });
});
