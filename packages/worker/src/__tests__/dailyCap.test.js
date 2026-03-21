/**
 * Tests for daily scan cap middleware.
 * @see ../middleware/dailyCap.js
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock @supabase/supabase-js
const mockSupabaseClient = {};
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

import { dailyCapMiddleware } from '../middleware/dailyCap.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryBuilder(result = { data: null, error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  return builder;
}

function createMockKV(store = {}) {
  return {
    get: vi.fn(async (key) => store[key] ?? null),
    put: vi.fn(async () => {}),
  };
}

function createMockContext({ user = { id: 'user-123' }, kv = createMockKV(), tier = 'keeper' } = {}) {
  const headers = {};
  const profileBuilder = createQueryBuilder({ data: { tier }, error: null });
  mockSupabaseClient.from = vi.fn(() => profileBuilder);

  const c = {
    get: vi.fn((key) => (key === 'user' ? user : undefined)),
    env: {
      RATE_LIMIT: kv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
    },
    header: vi.fn((name, value) => { headers[name] = value; }),
    json: vi.fn((data, status) => ({ _json: data, _status: status || 200 })),
    _headers: headers,
  };
  return c;
}

describe('dailyCapMiddleware', () => {
  let middleware;
  let next;

  beforeEach(() => {
    middleware = dailyCapMiddleware();
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('allows request when user is under the daily cap', async () => {
    const kv = createMockKV({ [`daily:user-123:${new Date().toISOString().slice(0, 10)}`]: '5' });
    const c = createMockContext({ kv });

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
    expect(c._headers['X-DailyCap-Limit']).toBe('100');
    expect(c._headers['X-DailyCap-Remaining']).toBe('94'); // 100 - 5 - 1
  });

  it('blocks request when at the daily cap', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const kv = createMockKV({ [`daily:user-123:${today}`]: '100' });
    const c = createMockContext({ kv });

    const result = await middleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Daily scan limit reached',
        dailyLimit: 100,
        dailyUsed: 100,
      }),
      429
    );
  });

  it('resets count on a new day (no existing key)', async () => {
    const kv = createMockKV(); // Empty — new day
    const c = createMockContext({ kv });

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
    expect(kv.put).toHaveBeenCalledWith(
      expect.stringMatching(/^daily:user-123:\d{4}-\d{2}-\d{2}$/),
      '1',
      { expirationTtl: 86400 }
    );
  });

  it('skips check for free tier users', async () => {
    const kv = createMockKV();
    const c = createMockContext({ kv, tier: 'free' });

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
    // KV should not have been read for daily key
    expect(kv.get).not.toHaveBeenCalledWith(expect.stringMatching(/^daily:/));
  });

  it('allows request through on KV error (graceful fallback)', async () => {
    const kv = {
      get: vi.fn().mockRejectedValue(new Error('KV unavailable')),
      put: vi.fn(),
    };
    const c = createMockContext({ kv });

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
  });

  it('skips when no KV is bound', async () => {
    const c = createMockContext();
    c.env.RATE_LIMIT = null;

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
  });

  it('skips when no user is authenticated', async () => {
    const c = createMockContext({ user: null });

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
  });

  it('uses reduced cap when account is throttled', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const kv = createMockKV({
      [`daily:user-123:${today}`]: '10',
      'throttle:user-123': JSON.stringify({ dailyCap: 10 }),
    });
    const c = createMockContext({ kv });

    const result = await middleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Daily scan limit reached',
        dailyLimit: 10,
        dailyUsed: 10,
      }),
      429
    );
  });

  it('sets correct headers for book_purchaser tier', async () => {
    const kv = createMockKV();
    const c = createMockContext({ kv, tier: 'book_purchaser' });

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
    expect(c._headers['X-DailyCap-Limit']).toBe('100');
  });

  it('increments the KV counter on allowed requests', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const kv = createMockKV({ [`daily:user-123:${today}`]: '50' });
    const c = createMockContext({ kv });

    await middleware(c, next);

    expect(kv.put).toHaveBeenCalledWith(
      `daily:user-123:${today}`,
      '51',
      { expirationTtl: 86400 }
    );
  });
});
