/**
 * Tests for concurrent session enforcement middleware.
 * @see ../middleware/sessionEnforce.js
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { sessionEnforceMiddleware } from '../middleware/sessionEnforce.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockKV(store = {}) {
  return {
    get: vi.fn(async (key, opts) => {
      const val = store[key] ?? null;
      if (opts?.type === 'json' && typeof val === 'string') return JSON.parse(val);
      return val;
    }),
    put: vi.fn(async () => {}),
  };
}

function createMockContext({
  user = { id: 'user-123' },
  sessionId = 'session-aaa',
  kv = createMockKV(),
} = {}) {
  return {
    get: vi.fn((key) => (key === 'user' ? user : undefined)),
    env: { RATE_LIMIT: kv },
    req: {
      header: vi.fn((name) => {
        if (name === 'X-Session-Id') return sessionId;
        return null;
      }),
    },
    json: vi.fn((data, status) => ({ _json: data, _status: status || 200 })),
  };
}

describe('sessionEnforceMiddleware', () => {
  let next;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('enforce: true', () => {
    const middleware = sessionEnforceMiddleware({ enforce: true });

    it('allows request with same session ID', async () => {
      const kv = createMockKV({
        'session:user-123': JSON.stringify({ sessionId: 'session-aaa', lastSeen: Date.now() }),
      });
      const c = createMockContext({ kv });

      await middleware(c, next);

      expect(next).toHaveBeenCalled();
      expect(kv.put).toHaveBeenCalled();
    });

    it('blocks request with different session ID when stored is recent', async () => {
      const kv = createMockKV({
        'session:user-123': JSON.stringify({
          sessionId: 'session-bbb',
          lastSeen: Date.now() - 60000, // 1 min ago — still active
        }),
      });
      const c = createMockContext({ kv, sessionId: 'session-aaa' });

      const result = await middleware(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CONCURRENT_SESSION' }),
        401
      );
    });

    it('allows new session to take over when stored session is stale (>5 min)', async () => {
      const kv = createMockKV({
        'session:user-123': JSON.stringify({
          sessionId: 'session-bbb',
          lastSeen: Date.now() - 6 * 60 * 1000, // 6 min ago
        }),
      });
      const c = createMockContext({ kv, sessionId: 'session-aaa' });

      await middleware(c, next);

      expect(next).toHaveBeenCalled();
      // Session should be updated to new ID
      const putCall = kv.put.mock.calls[0];
      expect(putCall[0]).toBe('session:user-123');
      const stored = JSON.parse(putCall[1]);
      expect(stored.sessionId).toBe('session-aaa');
    });

    it('skips enforcement when X-Session-Id header is missing', async () => {
      const c = createMockContext({ sessionId: null });

      await middleware(c, next);

      expect(next).toHaveBeenCalled();
    });

    it('skips when no user is authenticated', async () => {
      const c = createMockContext({ user: null });

      await middleware(c, next);

      expect(next).toHaveBeenCalled();
    });

    it('skips when no KV is bound', async () => {
      const c = createMockContext();
      c.env.RATE_LIMIT = null;

      await middleware(c, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows request through on KV error (graceful fallback)', async () => {
      const kv = {
        get: vi.fn().mockRejectedValue(new Error('KV down')),
        put: vi.fn(),
      };
      const c = createMockContext({ kv });

      await middleware(c, next);

      expect(next).toHaveBeenCalled();
    });

    it('creates new session record when none exists', async () => {
      const kv = createMockKV(); // Empty
      const c = createMockContext({ kv });

      await middleware(c, next);

      expect(next).toHaveBeenCalled();
      expect(kv.put).toHaveBeenCalledWith(
        'session:user-123',
        expect.stringContaining('session-aaa'),
        { expirationTtl: 86400 }
      );
    });
  });

  describe('enforce: false (logging-only)', () => {
    const middleware = sessionEnforceMiddleware({ enforce: false });

    it('logs but does not block concurrent sessions', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const kv = createMockKV({
        'session:user-123': JSON.stringify({
          sessionId: 'session-bbb',
          lastSeen: Date.now() - 60000,
        }),
      });
      const c = createMockContext({ kv, sessionId: 'session-aaa' });

      await middleware(c, next);

      expect(next).toHaveBeenCalled(); // NOT blocked
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Concurrent session detected')
      );
      consoleSpy.mockRestore();
    });
  });
});
