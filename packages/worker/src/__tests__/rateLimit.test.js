/**
 * Tests for the rate limiting middleware.
 * @see ../middleware/rateLimit.js
 */

import { rateLimitMiddleware } from '../middleware/rateLimit.js';

function createMockKV() {
  const store = {};
  return {
    get: vi.fn(async (key) => store[key] || null),
    put: vi.fn(async (key, value, opts) => {
      store[key] = value;
    }),
    _store: store,
  };
}

function createMockContext({
  path = '/api/something',
  method = 'GET',
  userId = null,
  ip = '192.168.1.1',
  kv = null,
} = {}) {
  const headers = {};
  const ctx = {
    req: {
      path,
      method,
      header: vi.fn((name) => {
        if (name === 'CF-Connecting-IP') return ip;
        return null;
      }),
    },
    env: {
      RATE_LIMIT: kv,
    },
    get: vi.fn((key) => {
      if (key === 'user' && userId) return { id: userId };
      return null;
    }),
    set: vi.fn(),
    header: vi.fn((name, value) => {
      headers[name] = value;
    }),
    json: vi.fn((data, status) => ({ data, status })),
    _headers: headers,
  };
  return ctx;
}

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------- allows requests under the limit ----------
  describe('requests under the limit', () => {
    it('allows the first request and calls next', async () => {
      const kv = createMockKV();
      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.json).not.toHaveBeenCalled();
    });

    it('allows multiple requests below the limit', async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);

      // Simulate 5 existing requests in the current window
      kv._store['rate:192.168.1.1:default'] = JSON.stringify({
        count: 5,
        windowStart: now,
      });
      // Override get to parse JSON
      kv.get = vi.fn(async (key, opts) => {
        const raw = kv._store[key];
        if (!raw) return null;
        if (opts?.type === 'json') return JSON.parse(raw);
        return raw;
      });

      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx._headers['X-RateLimit-Remaining']).toBe('24'); // 30 - 5 - 1 = 24
    });
  });

  // ---------- returns 429 when limit exceeded ----------
  describe('rate limit exceeded', () => {
    it('returns 429 when the request count exceeds the limit', async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);

      // Simulate 30 requests in current window (default limit = 30)
      kv._store['rate:192.168.1.1:default'] = JSON.stringify({
        count: 30,
        windowStart: now,
      });
      kv.get = vi.fn(async (key, opts) => {
        const raw = kv._store[key];
        if (!raw) return null;
        if (opts?.type === 'json') return JSON.parse(raw);
        return raw;
      });

      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          limit: 30,
          window: 60,
        }),
        429
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------- X-RateLimit headers ----------
  describe('X-RateLimit headers', () => {
    it('sets correct X-RateLimit headers on allowed requests', async () => {
      const kv = createMockKV();
      kv.get = vi.fn(async () => null); // No existing record

      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '30');
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '29');
      expect(ctx.header).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String)
      );
    });

    it('sets X-RateLimit-Remaining to 0 on 429', async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);
      kv._store['rate:192.168.1.1:default'] = JSON.stringify({
        count: 30,
        windowStart: now,
      });
      kv.get = vi.fn(async (key, opts) => {
        const raw = kv._store[key];
        if (!raw) return null;
        if (opts?.type === 'json') return JSON.parse(raw);
        return raw;
      });

      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
  });

  // ---------- Retry-After header on 429 ----------
  describe('Retry-After header', () => {
    it('sets Retry-After header on 429 response', async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);

      // Window started 20 seconds ago
      kv._store['rate:192.168.1.1:default'] = JSON.stringify({
        count: 30,
        windowStart: now - 20,
      });
      kv.get = vi.fn(async (key, opts) => {
        const raw = kv._store[key];
        if (!raw) return null;
        if (opts?.type === 'json') return JSON.parse(raw);
        return raw;
      });

      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      // Retry-After should be windowSeconds - elapsed = 60 - 20 = 40
      expect(ctx.header).toHaveBeenCalledWith('Retry-After', '40');
    });
  });

  // ---------- Different limits per endpoint ----------
  describe('endpoint-specific limits', () => {
    it('uses scan:upload limit (10/min) for POST /api/scan', async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);

      kv._store['rate:192.168.1.1:scan:upload'] = JSON.stringify({
        count: 10,
        windowStart: now,
      });
      kv.get = vi.fn(async (key, opts) => {
        const raw = kv._store[key];
        if (!raw) return null;
        if (opts?.type === 'json') return JSON.parse(raw);
        return raw;
      });

      const ctx = createMockContext({ path: '/api/scan', method: 'POST', kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          limit: 10,
        }),
        429
      );
    });

    it('uses scan:reprocess limit (3/min) for POST /api/scan/:id/reprocess', async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);

      kv._store['rate:192.168.1.1:scan:reprocess'] = JSON.stringify({
        count: 3,
        windowStart: now,
      });
      kv.get = vi.fn(async (key, opts) => {
        const raw = kv._store[key];
        if (!raw) return null;
        if (opts?.type === 'json') return JSON.parse(raw);
        return raw;
      });

      const ctx = createMockContext({
        path: '/api/scan/abc123/reprocess',
        method: 'POST',
        kv,
      });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          limit: 3,
        }),
        429
      );
    });

    it('uses default limit (30/min) for GET requests', async () => {
      const kv = createMockKV();
      kv.get = vi.fn(async () => null);

      const ctx = createMockContext({ path: '/api/documents', method: 'GET', kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '30');
    });
  });

  // ---------- KV not bound fallback ----------
  describe('KV not bound', () => {
    it('falls back gracefully when KV is not bound (skips rate limiting)', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ctx = createMockContext({ kv: null });
      ctx.env.RATE_LIMIT = undefined;
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.json).not.toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('RATE_LIMIT KV namespace not bound')
      );

      consoleWarn.mockRestore();
    });
  });

  // ---------- Window expiry ----------
  describe('window expiry', () => {
    it('starts a new window when the previous window has expired', async () => {
      const kv = createMockKV();
      const now = Math.floor(Date.now() / 1000);

      // Window started 120 seconds ago - well past the 60-second window
      kv._store['rate:192.168.1.1:default'] = JSON.stringify({
        count: 30,
        windowStart: now - 120,
      });
      kv.get = vi.fn(async (key, opts) => {
        const raw = kv._store[key];
        if (!raw) return null;
        if (opts?.type === 'json') return JSON.parse(raw);
        return raw;
      });

      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      // Should NOT be rate limited because the window expired
      expect(next).toHaveBeenCalled();
      expect(ctx.json).not.toHaveBeenCalled();
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '29');
    });
  });

  // ---------- User identification ----------
  describe('user identification', () => {
    it('uses authenticated user ID when available', async () => {
      const kv = createMockKV();
      kv.get = vi.fn(async () => null);

      const ctx = createMockContext({ kv, userId: 'user-abc', ip: '10.0.0.1' });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      // Should use user ID in the KV key, not IP
      expect(kv.put).toHaveBeenCalledWith(
        'rate:user-abc:default',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('falls back to IP address when no authenticated user', async () => {
      const kv = createMockKV();
      kv.get = vi.fn(async () => null);

      const ctx = createMockContext({ kv, ip: '10.20.30.40' });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      expect(kv.put).toHaveBeenCalledWith(
        'rate:10.20.30.40:default',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ---------- KV error handling ----------
  describe('KV error handling', () => {
    it('does not block requests when KV throws an error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const kv = {
        get: vi.fn(async () => {
          throw new Error('KV unavailable');
        }),
        put: vi.fn(),
      };

      const ctx = createMockContext({ kv });
      const next = vi.fn();
      const middleware = rateLimitMiddleware();

      await middleware(ctx, next);

      // Request should still proceed
      expect(next).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        'Rate limiting error:',
        'KV unavailable'
      );

      consoleError.mockRestore();
    });
  });
});
