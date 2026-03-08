import { test, expect } from '@playwright/test';
import { mockSharedApi } from './helpers/api-mocks.js';
import { MOCK_SHARE } from './fixtures/test-data.js';

test.describe('Shared Collection', () => {
  test('shared link shows collection read-only with CTA', async ({ page }) => {
    await mockSharedApi(page, MOCK_SHARE);

    await page.goto(`/shared/${MOCK_SHARE.token}`);

    // Collection name visible
    await expect(page.getByText("Grandma's Recipes")).toBeVisible({ timeout: 5000 });

    // Document is shown
    await expect(page.getByText('Chocolate Chip Cookies')).toBeVisible();

    // Document count badge
    await expect(page.getByText(/1 document/i)).toBeVisible();

    // No edit controls should be present (no rename input, no delete button)
    await expect(page.getByRole('button', { name: /delete|remove|edit/i })).toHaveCount(0);

    // CTA to join KeptPages (multiple links/buttons exist — check the main content area)
    const mainCta = page.getByRole('main').getByRole('link', { name: /join keptpages/i });
    await expect(mainCta).toBeVisible();
  });

  test('invalid share token shows not-found error', async ({ page }) => {
    // Mock the shared endpoint to return 404
    await page.route('**/api/shared/bad-token-xyz', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'This link is invalid or has expired.' }),
      })
    );

    await page.goto('/shared/bad-token-xyz');

    await expect(page.getByText(/collection not found/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /go to keptpages/i })).toBeVisible();
  });
});
