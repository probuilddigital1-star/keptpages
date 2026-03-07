import { adminMiddleware, isAdminEmail } from '../middleware/admin.js';

describe('isAdminEmail', () => {
  it('returns true for matching admin email', () => {
    const env = { ADMIN_EMAILS: 'admin@example.com,boss@example.com' };
    expect(isAdminEmail('admin@example.com', env)).toBe(true);
  });

  it('is case-insensitive', () => {
    const env = { ADMIN_EMAILS: 'Admin@Example.COM' };
    expect(isAdminEmail('admin@example.com', env)).toBe(true);
  });

  it('returns false for non-admin email', () => {
    const env = { ADMIN_EMAILS: 'admin@example.com' };
    expect(isAdminEmail('user@example.com', env)).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is empty', () => {
    expect(isAdminEmail('admin@example.com', {})).toBe(false);
  });

  it('returns false when email is null', () => {
    const env = { ADMIN_EMAILS: 'admin@example.com' };
    expect(isAdminEmail(null, env)).toBe(false);
  });

  it('handles whitespace in ADMIN_EMAILS list', () => {
    const env = { ADMIN_EMAILS: ' admin@example.com , boss@example.com ' };
    expect(isAdminEmail('admin@example.com', env)).toBe(true);
    expect(isAdminEmail('boss@example.com', env)).toBe(true);
  });
});

describe('adminMiddleware', () => {
  function createContext(email, adminEmails) {
    const user = email ? { email } : {};
    return {
      env: adminEmails !== undefined ? { ADMIN_EMAILS: adminEmails } : {},
      get: (key) => (key === 'user' ? user : undefined),
      json: vi.fn((body, status) => ({ body, status })),
    };
  }

  it('calls next() for valid admin', async () => {
    const middleware = adminMiddleware();
    const c = createContext('admin@example.com', 'admin@example.com');
    const next = vi.fn();

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
    expect(c.json).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin user', async () => {
    const middleware = adminMiddleware();
    const c = createContext('user@example.com', 'admin@example.com');
    const next = vi.fn();

    await middleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith({ error: 'Forbidden: admin access required' }, 403);
  });

  it('returns 403 when ADMIN_EMAILS not configured', async () => {
    const middleware = adminMiddleware();
    const c = createContext('admin@example.com', undefined);
    const next = vi.fn();

    await middleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith({ error: 'Admin access not configured' }, 403);
  });

  it('returns 403 when user has no email', async () => {
    const middleware = adminMiddleware();
    const c = createContext(null, 'admin@example.com');
    const next = vi.fn();

    await middleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith({ error: 'Forbidden: admin access required' }, 403);
  });
});
