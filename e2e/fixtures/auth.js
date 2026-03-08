import { test as base, expect } from '@playwright/test';

export const FAKE_USER = {
  id: 'e2e-user-0001-0001-0001-000000000001',
  email: 'e2e@keptpages.test',
  phone: '',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'E2E Test User', avatar_url: null },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  confirmed_at: '2025-01-01T00:00:00.000Z',
};

export const FAKE_SESSION = {
  access_token: 'e2e-fake-access-token',
  refresh_token: 'e2e-fake-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: FAKE_USER,
};

/**
 * Extended Playwright test fixture that provides `authenticatedPage`:
 * a page with Supabase session injected into localStorage and auth
 * endpoints intercepted.
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Intercept Supabase auth endpoints before navigating
    await page.route('**/auth/v1/token*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...FAKE_SESSION }),
      })
    );

    await page.route('**/auth/v1/user*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_USER),
      })
    );

    // Inject fake session into localStorage for ANY Supabase project ref.
    // The Vite dev server may reuse an existing server with real env vars,
    // so we intercept localStorage.getItem to return our fake session for
    // any key matching the sb-*-auth-token pattern.
    await page.addInitScript(() => {
      const fakeSession = JSON.stringify({
        access_token: 'e2e-fake-access-token',
        refresh_token: 'e2e-fake-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: 'e2e-user-0001-0001-0001-000000000001',
          email: 'e2e@keptpages.test',
          phone: '',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { name: 'E2E Test User', avatar_url: null },
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          confirmed_at: '2025-01-01T00:00:00.000Z',
        },
      });

      // Intercept localStorage.getItem to return fake session for Supabase auth keys
      const origGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (typeof key === 'string' && /^sb-.+-auth-token$/.test(key)) {
          return fakeSession;
        }
        return origGetItem.call(this, key);
      };
    });

    await use(page);
  },
});

export { expect };
