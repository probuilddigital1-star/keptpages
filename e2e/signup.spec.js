import { test, expect } from '@playwright/test';

test.describe('Signup Page', () => {
  test('shows all form fields', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.goto('/signup');

    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/full name is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('shows error for short password', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel(/full name/i).fill('Jane Doe');
    await page.getByLabel(/email/i).fill('jane@example.com');
    await page.getByLabel(/password/i).fill('abc');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
  });

  test('successful signup shows confirmation or redirects', async ({ page }) => {
    // Mock GoTrue signup — return a user object without access_token,
    // which Supabase JS interprets as "email confirmation pending".
    // The authStore sets user (truthy) → GuestGuard may redirect to /app,
    // or the Signup component shows the "Check your email" success state.
    const fakeSignupUser = {
      id: 'e2e-signup-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: '',
      email: 'jane@example.com',
      phone: '',
      confirmation_sent_at: '2025-01-01T00:00:00.000Z',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Jane Doe' },
      identities: [],
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    };

    await page.route('**/auth/v1/signup*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSignupUser),
      })
    );

    // Mock profile API in case GuestGuard redirects to /app (dashboard fetches profile)
    await page.route('**/api/user/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: fakeSignupUser.id,
          email: fakeSignupUser.email,
          name: 'Jane Doe',
          tier: 'free',
          usage: { scans: 0, collections: 0 },
          limits: { scans: 25, collections: 5 },
          subscription: null,
          isAdmin: false,
        }),
      })
    );

    // Mock collections API in case redirected to dashboard
    await page.route('**/api/collections', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ collections: [] }),
      })
    );

    await page.goto('/signup');

    await page.getByLabel(/full name/i).fill('Jane Doe');
    await page.getByLabel(/email/i).fill('jane@example.com');
    await page.getByLabel(/password/i).fill('securepassword');
    await page.getByRole('button', { name: /create account/i }).click();

    // After successful signup, expect either:
    // - "Check your email" confirmation (success state before redirect)
    // - Redirect to /app showing dashboard content (GuestGuard kicks in)
    await expect(
      page.getByText(/check your email/i).or(page.getByText(/start preserving/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('Google sign-up button is present', async ({ page }) => {
    await page.goto('/signup');

    await expect(
      page.getByRole('button', { name: /sign up with google/i })
    ).toBeVisible();
  });

  test('link to login page works', async ({ page }) => {
    await page.goto('/signup');

    await page.getByRole('link', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('duplicate email shows server error', async ({ page }) => {
    // Mock GoTrue to return 422 with duplicate email error
    await page.route('**/auth/v1/signup*', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'user_already_exists',
          error_description: 'User already registered',
        }),
      })
    );

    await page.goto('/signup');

    await page.getByLabel(/full name/i).fill('Jane Doe');
    await page.getByLabel(/email/i).fill('existing@example.com');
    await page.getByLabel(/password/i).fill('securepassword');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show server error in the red error box
    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 5000 });
  });

  test('invalid email format shows validation error', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel(/full name/i).fill('Jane Doe');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/password/i).fill('securepassword');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
  });
});
