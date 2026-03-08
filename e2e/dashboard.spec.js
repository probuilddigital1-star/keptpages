import { test, expect } from './fixtures/auth.js';
import { mockProfileApi, mockCollectionsApi } from './helpers/api-mocks.js';
import { MOCK_PROFILE, MOCK_PROFILE_NEAR_LIMIT } from './fixtures/test-data.js';

test.describe('Dashboard Edge Cases', () => {
  test('empty collections shows empty state', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockCollectionsApi(page, []);

    await page.goto('/app');

    await expect(page.getByText(/start preserving your family/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /create your first collection/i })).toBeVisible();
  });

  test('collections API failure shows error message', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);

    // Mock collections endpoint to return 500
    await page.route('**/api/collections', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      })
    );

    await page.goto('/app');

    // Should show error box with the server message
    await expect(page.getByText(/internal server error/i)).toBeVisible({ timeout: 5000 });
  });

  test('free user at 80%+ usage sees "running low" warning', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page, MOCK_PROFILE_NEAR_LIMIT);
    await mockCollectionsApi(page);

    await page.goto('/app');

    await expect(page.getByText(/running low on scans/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/upgrade to keeper/i)).toBeVisible();
  });

  test('free user below 80% sees no warning', async ({ authenticatedPage: page }) => {
    // 3/25 = 12%, well below 80%
    await mockProfileApi(page);
    await mockCollectionsApi(page);

    await page.goto('/app');

    await expect(page.getByText(/3 of 25 scans used/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/running low/i)).not.toBeVisible();
  });

  test('keeper tier user sees no usage bar', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page, {
      tier: 'keeper',
      usage: { scans: 50, collections: 10 },
      limits: { scans: Infinity, collections: Infinity },
      subscription: { status: 'active', tier: 'keeper' },
    });
    await mockCollectionsApi(page);

    await page.goto('/app');

    await expect(page.getByText(/your collections/i)).toBeVisible({ timeout: 5000 });
    // Keeper users should not see the scan usage bar
    await expect(page.getByText(/scans used/i)).not.toBeVisible();
  });
});
