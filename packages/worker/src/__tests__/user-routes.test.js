/**
 * Tests for user route handlers.
 * @see ../routes/user.js
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

let supabaseFromResults;
let mockDeleteUser;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (supabaseFromResults[table] && supabaseFromResults[table].length > 0) {
        return createQueryBuilder(supabaseFromResults[table].shift());
      }
      return createQueryBuilder({ data: null, error: null });
    }),
    auth: {
      admin: {
        deleteUser: (...args) => mockDeleteUser(...args),
      },
    },
  })),
}));

vi.mock('../middleware/admin.js', () => ({
  isAdminEmail: vi.fn((email) => email === 'admin@example.com'),
}));

function mockFrom(table, ...results) {
  if (!supabaseFromResults[table]) supabaseFromResults[table] = [];
  supabaseFromResults[table].push(...results);
}

// ─── Hono context helpers ────────────────────────────────────────────────────

const TEST_USER = { id: 'user-123', email: 'test@example.com', role: 'authenticated' };

function createMockContext({ user = TEST_USER, params = {}, query = {}, body = null, formData = null } = {}) {
  const store = { user };
  if (body !== null) store.body = body;

  return {
    req: {
      param: vi.fn((key) => params[key]),
      query: vi.fn((key) => query[key]),
      json: vi.fn(() => Promise.resolve(body)),
      header: vi.fn(() => null),
      formData: vi.fn(() => {
        if (formData) return Promise.resolve(formData);
        return Promise.resolve(new FormData());
      }),
    },
    env: {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
      ADMIN_EMAILS: 'admin@example.com',
      PROCESSED: {
        put: vi.fn(() => Promise.resolve()),
        get: vi.fn(() => Promise.resolve(null)),
        delete: vi.fn(() => Promise.resolve()),
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
import userApp from '../routes/user.js';

function getHandler(method, path) {
  const matches = userApp.routes.filter(
    (r) => r.method === method && r.path === path
  );
  if (matches.length === 0) throw new Error(`No route found: ${method} ${path}`);
  return matches[matches.length - 1].handler;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  supabaseFromResults = {};
  mockDeleteUser = vi.fn(() => Promise.resolve({ error: null }));
  vi.clearAllMocks();
});

describe('User Routes', () => {
  // ───── GET /profile ───────────────────────────────────────────────────────
  describe('GET /profile - Get user profile', () => {
    it('returns profile with subscription info', async () => {
      mockFrom('profiles', {
        data: {
          id: 'user-123',
          display_name: 'Test User',
          avatar_url: '/user/avatar/user-123',
          tier: 'keeper',
          scan_count: 10,
          collection_count: 3,
          stripe_customer_id: 'cus_123',
          stripe_subscription_id: 'sub_123',
          subscription_status: 'active',
          subscription_plan: 'keeper_monthly',
          subscription_period_end: '2025-07-01T00:00:00Z',
          subscription_updated_at: '2025-06-01T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-06-01T00:00:00Z',
        },
        error: null,
      });
      mockFrom('subscriptions', {
        data: {
          id: 'sub-rec-1',
          stripe_customer_id: 'cus_123',
          stripe_subscription_id: 'sub_123',
          status: 'active',
          current_period_start: '2025-06-01T00:00:00Z',
          current_period_end: '2025-07-01T00:00:00Z',
          cancel_at_period_end: false,
          created_at: '2025-01-01T00:00:00Z',
        },
        error: null,
      });

      const c = createMockContext();
      const handler = getHandler('GET', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.displayName).toBe('Test User');
      expect(res._body.tier).toBe('keeper');
      expect(res._body.usage.scans).toBe(10);
      expect(res._body.subscription).toBeTruthy();
      expect(res._body.subscription.status).toBe('active');
      expect(res._body.stripeCustomerId).toBe('cus_123');
    });

    it('returns 404 when profile not found', async () => {
      mockFrom('profiles', { data: null, error: { message: 'not found' } });

      const c = createMockContext();
      const handler = getHandler('GET', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(404);
      expect(res._body.error).toBe('Profile not found');
    });
  });

  // ───── PUT /profile ───────────────────────────────────────────────────────
  describe('PUT /profile - Update profile', () => {
    it('updates display name', async () => {
      mockFrom('profiles', {
        data: {
          id: 'user-123',
          display_name: 'New Name',
          avatar_url: null,
          tier: 'free',
        },
        error: null,
      });

      const c = createMockContext({ body: { name: 'New Name' } });
      const handler = getHandler('PUT', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.displayName).toBe('New Name');
    });

    it('updates avatar_url with valid HTTPS URL', async () => {
      mockFrom('profiles', {
        data: {
          id: 'user-123',
          display_name: 'User',
          avatar_url: 'https://cdn.example.com/avatar.png',
          tier: 'free',
        },
        error: null,
      });

      const c = createMockContext({ body: { avatar_url: 'https://cdn.example.com/avatar.png' } });
      const handler = getHandler('PUT', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    });

    it('returns 400 for invalid avatar_url scheme (http://)', async () => {
      const c = createMockContext({ body: { avatar_url: 'http://evil.com/pic.jpg' } });
      const handler = getHandler('PUT', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('avatar_url must be an API path or HTTPS URL');
    });

    it('returns 400 for invalid avatar_url scheme (ftp://)', async () => {
      const c = createMockContext({ body: { avatar_url: 'ftp://evil.com/pic.jpg' } });
      const handler = getHandler('PUT', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('avatar_url must be an API path or HTTPS URL');
    });

    it('returns 400 for path traversal in avatar_url', async () => {
      const c = createMockContext({ body: { avatar_url: '/user/avatar/../../etc/passwd' } });
      const handler = getHandler('PUT', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('Invalid avatar_url');
    });

    it('returns 400 when no fields are provided', async () => {
      const c = createMockContext({ body: {} });
      const handler = getHandler('PUT', '/profile');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('No fields to update');
    });
  });

  // ───── POST /avatar ── Upload avatar ──────────────────────────────────────
  describe('POST /avatar - Upload avatar', () => {
    function createMockFile(name, type, size) {
      // Minimal File-like object for testing
      const content = new Uint8Array(size);
      const file = new File([content], name, { type });
      return file;
    }

    it('uploads an avatar successfully', async () => {
      const file = createMockFile('avatar.jpg', 'image/jpeg', 1024);
      const fd = new FormData();
      fd.append('image', file);

      mockFrom('profiles', { data: null, error: null });

      const c = createMockContext({ formData: fd });
      const handler = getHandler('POST', '/avatar');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.url).toBe('/api/user/avatar/user-123');
      expect(res._body.r2Key).toBe('avatars/user-123.jpg');
      expect(c.env.UPLOADS.put).toHaveBeenCalled();
    });

    it('returns 400 for invalid file type', async () => {
      const file = createMockFile('doc.pdf', 'application/pdf', 1024);
      const fd = new FormData();
      fd.append('image', file);

      const c = createMockContext({ formData: fd });
      const handler = getHandler('POST', '/avatar');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toContain('Invalid file type');
    });

    it('returns 413 for files that are too large', async () => {
      const file = createMockFile('big.jpg', 'image/jpeg', 3 * 1024 * 1024); // 3MB
      const fd = new FormData();
      fd.append('image', file);

      const c = createMockContext({ formData: fd });
      const handler = getHandler('POST', '/avatar');
      const res = await handler(c);

      expect(res._status).toBe(413);
      expect(res._body.error).toContain('File too large');
    });

    it('returns 400 when no file is provided', async () => {
      const fd = new FormData();

      const c = createMockContext({ formData: fd });
      const handler = getHandler('POST', '/avatar');
      const res = await handler(c);

      expect(res._status).toBe(400);
      expect(res._body.error).toBe('No file provided');
    });
  });

  // ───── GET /avatar/:userId ── Serve avatar ────────────────────────────────
  describe('GET /avatar/:userId - Serve avatar', () => {
    it('serves avatar image from R2', async () => {
      const mockBody = new ReadableStream();
      const c = createMockContext({ params: { userId: 'user-123' } });
      // First call for 'jpg' extension succeeds
      c.env.UPLOADS.get.mockResolvedValueOnce({
        body: mockBody,
        httpMetadata: { contentType: 'image/jpeg' },
      });

      const handler = getHandler('GET', '/avatar/:userId');
      const res = await handler(c);

      expect(res).toBeInstanceOf(Response);
      expect(res.headers.get('Content-Type')).toBe('image/jpeg');
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    });

    it('tries multiple extensions before finding the avatar', async () => {
      const mockBody = new ReadableStream();
      const c = createMockContext({ params: { userId: 'user-456' } });
      // jpg -> null, png -> found
      c.env.UPLOADS.get
        .mockResolvedValueOnce(null) // jpg
        .mockResolvedValueOnce({     // png
          body: mockBody,
          httpMetadata: { contentType: 'image/png' },
        });

      const handler = getHandler('GET', '/avatar/:userId');
      const res = await handler(c);

      expect(res).toBeInstanceOf(Response);
      expect(res.headers.get('Content-Type')).toBe('image/png');
      expect(c.env.UPLOADS.get).toHaveBeenCalledTimes(2);
    });

    it('returns 404 when no avatar exists', async () => {
      const c = createMockContext({ params: { userId: 'user-999' } });
      // All extensions return null
      c.env.UPLOADS.get.mockResolvedValue(null);

      const handler = getHandler('GET', '/avatar/:userId');
      const res = await handler(c);

      expect(res._status).toBe(404);
      expect(res._body.error).toBe('Avatar not found');
    });
  });

  // ───── POST /export ── Export user data ───────────────────────────────────
  describe('POST /export - Export user data', () => {
    it('exports all user data to R2', async () => {
      mockFrom('profiles', { data: { id: 'user-123', display_name: 'Test' }, error: null });
      mockFrom('scans', { data: [{ id: 'scan-1' }], error: null });
      mockFrom('collections', { data: [{ id: 'col-1' }], error: null });
      mockFrom('collection_items', { data: [{ id: 'item-1' }], error: null });

      const c = createMockContext();
      const handler = getHandler('POST', '/export');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.url).toContain('/user/export/');
      expect(res._body.exportedAt).toBeTruthy();
      expect(c.env.PROCESSED.put).toHaveBeenCalled();
    });
  });

  // ───── GET /export/:key ── Download export ────────────────────────────────
  describe('GET /export/:key - Download export', () => {
    it('serves an export file as a download', async () => {
      const mockBody = new ReadableStream();
      const c = createMockContext({ params: { key: 'exports/user-123/12345-export.json' } });
      c.env.PROCESSED.get.mockResolvedValue({
        body: mockBody,
        httpMetadata: { contentType: 'application/json' },
      });

      const handler = getHandler('GET', '/export/:key{.+}');
      const res = await handler(c);

      expect(res).toBeInstanceOf(Response);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      expect(res.headers.get('Content-Disposition')).toContain('keptpages-export.json');
    });

    it('returns 403 when key belongs to another user', async () => {
      const c = createMockContext({ params: { key: 'exports/other-user/data.json' } });
      const handler = getHandler('GET', '/export/:key{.+}');
      const res = await handler(c);

      expect(res._status).toBe(403);
      expect(res._body.error).toBe('Forbidden');
    });

    it('returns 403 when path traversal is attempted', async () => {
      const c = createMockContext({ params: { key: 'exports/user-123/../../etc/passwd' } });
      const handler = getHandler('GET', '/export/:key{.+}');
      const res = await handler(c);

      expect(res._status).toBe(403);
      expect(res._body.error).toBe('Forbidden');
    });

    it('returns 404 when export not found in R2', async () => {
      const c = createMockContext({ params: { key: 'exports/user-123/missing.json' } });
      c.env.PROCESSED.get.mockResolvedValue(null);

      const handler = getHandler('GET', '/export/:key{.+}');
      const res = await handler(c);

      expect(res._status).toBe(404);
      expect(res._body.error).toBe('Export not found');
    });
  });

  // ───── DELETE /account ── Delete user account ─────────────────────────────
  describe('DELETE /account - Delete user account', () => {
    it('deletes account successfully', async () => {
      mockFrom('scans', {
        data: [
          { r2_key: 'uploads/scan1.jpg', processed_key: 'processed/scan1.json' },
          { r2_key: 'uploads/scan2.jpg', processed_key: null },
        ],
        error: null,
      });

      const c = createMockContext();
      const handler = getHandler('DELETE', '/account');
      const res = await handler(c);

      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Account deleted successfully');
      expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
    });

    it('deletes R2 objects for scans and avatars', async () => {
      mockFrom('scans', {
        data: [
          { r2_key: 'uploads/scan1.jpg', processed_key: 'processed/scan1.json' },
        ],
        error: null,
      });

      const c = createMockContext();
      const handler = getHandler('DELETE', '/account');
      await handler(c);

      // Should delete scan R2 keys
      expect(c.env.UPLOADS.delete).toHaveBeenCalled();
      expect(c.env.PROCESSED.delete).toHaveBeenCalled();
      // Should attempt to delete avatar with each extension
      const uploadDeleteCalls = c.env.UPLOADS.delete.mock.calls.map((call) => call[0]);
      expect(uploadDeleteCalls).toContain('avatars/user-123.jpg');
      expect(uploadDeleteCalls).toContain('avatars/user-123.png');
      expect(uploadDeleteCalls).toContain('avatars/user-123.webp');
      expect(uploadDeleteCalls).toContain('avatars/user-123.gif');
    });

    it('deletes Supabase auth user', async () => {
      mockFrom('scans', { data: [], error: null });

      const c = createMockContext();
      const handler = getHandler('DELETE', '/account');
      await handler(c);

      expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
    });
  });
});
