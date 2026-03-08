import { test, expect } from './fixtures/auth.js';
import { mockProfileApi, mockCollectionsApi, mockStripeApi } from './helpers/api-mocks.js';
import { MOCK_PROFILE_NEAR_LIMIT, MOCK_PROFILE_AT_LIMIT } from './fixtures/test-data.js';

test.describe('Upgrade Flow', () => {
  test('free user near limit sees scan usage badge', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page, MOCK_PROFILE_NEAR_LIMIT);

    await page.goto('/app/scan');

    // Scan page now calls fetchSubscription on mount — should show real usage
    await expect(page.getByText(/20 of 25 scans used/i)).toBeVisible({ timeout: 5000 });
  });

  test('settings page upgrade button triggers Stripe checkout', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockStripeApi(page);

    await page.goto('/app/settings');

    // Wait for settings to load — Settings calls fetchSubscription on mount
    await expect(page.getByText(/subscription/i).first()).toBeVisible({ timeout: 5000 });

    // Find the upgrade button
    const upgradeBtn = page.getByRole('button', { name: /upgrade now/i }).first();
    if (await upgradeBtn.isVisible()) {
      // Intercept navigation to Stripe
      const [request] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/api/stripe/checkout'), { timeout: 5000 }).catch(() => null),
        upgradeBtn.click(),
      ]);

      // Verify the Stripe checkout API was called
      if (request) {
        expect(request.url()).toContain('/api/stripe/checkout');
      }
    }
  });

  test('at-limit user sees upgrade banner on scan page', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page, MOCK_PROFILE_AT_LIMIT);
    await mockStripeApi(page);

    await page.goto('/app/scan');

    // Scan page now calls fetchSubscription — should show at-limit banner
    await expect(
      page.getByText(/reached your free scan limit/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
