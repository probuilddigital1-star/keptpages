/**
 * Tests for the JWT auth middleware.
 * @see ../middleware/auth.js
 *
 * Uses the Web Crypto API available in Node 20+ for real JWT signing/verification.
 */

import { authMiddleware } from '../middleware/auth.js';

const JWT_SECRET = 'test-secret-key-for-unit-tests';

/**
 * Base64url encode a string (no padding).
 */
function base64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a real HS256 JWT using the Web Crypto API.
 */
async function createJwt(payload, secret = JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));

  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  const sigBytes = new Uint8Array(signature);
  let sigBinary = '';
  for (let i = 0; i < sigBytes.length; i++) {
    sigBinary += String.fromCharCode(sigBytes[i]);
  }
  const sigB64 = btoa(sigBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function createMockContext({ authHeader = undefined, jwtSecret = JWT_SECRET } = {}) {
  const store = {};
  const ctx = {
    req: {
      header: vi.fn((name) => {
        if (name === 'Authorization') return authHeader;
        return null;
      }),
    },
    env: {
      SUPABASE_JWT_SECRET: jwtSecret,
    },
    json: vi.fn((data, status) => ({ data, status })),
    set: vi.fn((key, value) => {
      store[key] = value;
    }),
    get: vi.fn((key) => store[key]),
    _store: store,
  };
  return ctx;
}

describe('authMiddleware', () => {
  // ---------- Missing Authorization header ----------
  describe('missing Authorization header', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const ctx = createMockContext({ authHeader: undefined });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        { error: 'Missing Authorization header' },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------- Invalid header format ----------
  describe('invalid Authorization header format', () => {
    it('returns 401 when token format is not "Bearer xxx"', async () => {
      const ctx = createMockContext({ authHeader: 'Basic abc123' });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid Authorization header format'),
        }),
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when only "Bearer" is provided without a token', async () => {
      const ctx = createMockContext({ authHeader: 'Bearer' });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid Authorization header format'),
        }),
        401
      );
    });

    it('returns 401 for completely malformed header', async () => {
      const ctx = createMockContext({ authHeader: 'just-a-token' });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid Authorization header format'),
        }),
        401
      );
    });
  });

  // ---------- Expired token ----------
  describe('expired token', () => {
    it('returns 401 when token is expired', async () => {
      const expiredPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };

      const token = await createJwt(expiredPayload);
      const ctx = createMockContext({ authHeader: `Bearer ${token}` });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        { error: 'Invalid or expired token' },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------- Invalid signature ----------
  describe('invalid signature', () => {
    it('returns 401 when signature is invalid (wrong secret)', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      // Sign with a different secret
      const token = await createJwt(payload, 'wrong-secret-key');
      const ctx = createMockContext({ authHeader: `Bearer ${token}` });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        { error: 'Invalid or expired token' },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for a tampered token', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = await createJwt(payload);
      // Tamper with the payload part
      const parts = token.split('.');
      parts[1] = base64urlEncode(JSON.stringify({ ...payload, role: 'admin' }));
      const tamperedToken = parts.join('.');

      const ctx = createMockContext({ authHeader: `Bearer ${tamperedToken}` });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        { error: 'Invalid or expired token' },
        401
      );
    });
  });

  // ---------- Valid token ----------
  describe('valid token', () => {
    it('attaches user info to context on valid token', async () => {
      const payload = {
        sub: 'user-456',
        email: 'alice@example.com',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        app_metadata: { plan: 'pro' },
        user_metadata: { name: 'Alice' },
      };

      const token = await createJwt(payload);
      const ctx = createMockContext({ authHeader: `Bearer ${token}` });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.json).not.toHaveBeenCalled();
      expect(ctx.set).toHaveBeenCalledWith('user', {
        id: 'user-456',
        email: 'alice@example.com',
        role: 'authenticated',
        appMetadata: { plan: 'pro' },
        userMetadata: { name: 'Alice' },
      });
    });

    it('extracts user id, email, and role from JWT payload', async () => {
      const payload = {
        sub: 'user-789',
        email: 'bob@test.org',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = await createJwt(payload);
      const ctx = createMockContext({ authHeader: `Bearer ${token}` });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      const userArg = ctx.set.mock.calls.find((call) => call[0] === 'user')?.[1];

      expect(userArg.id).toBe('user-789');
      expect(userArg.email).toBe('bob@test.org');
      expect(userArg.role).toBe('admin');
    });

    it('defaults role to "authenticated" when not present in token', async () => {
      const payload = {
        sub: 'user-000',
        email: 'norole@test.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = await createJwt(payload);
      const ctx = createMockContext({ authHeader: `Bearer ${token}` });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      const userArg = ctx.set.mock.calls.find((call) => call[0] === 'user')?.[1];
      expect(userArg.role).toBe('authenticated');
    });

    it('defaults appMetadata and userMetadata to empty objects', async () => {
      const payload = {
        sub: 'user-111',
        email: 'nometa@test.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = await createJwt(payload);
      const ctx = createMockContext({ authHeader: `Bearer ${token}` });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      const userArg = ctx.set.mock.calls.find((call) => call[0] === 'user')?.[1];
      expect(userArg.appMetadata).toEqual({});
      expect(userArg.userMetadata).toEqual({});
    });
  });

  // ---------- Missing JWT secret ----------
  describe('missing JWT secret', () => {
    it('returns 401 when SUPABASE_JWT_SECRET is not configured', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const ctx = createMockContext({
        authHeader: 'Bearer some.fake.token',
        jwtSecret: undefined,
      });
      const next = vi.fn();
      const middleware = authMiddleware();

      await middleware(ctx, next);

      // Without a valid secret, JWT verification fails with invalid token error
      expect(ctx.json).toHaveBeenCalledWith(
        { error: 'Invalid or expired token' },
        401
      );
      expect(next).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
