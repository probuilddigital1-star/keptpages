import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('renders all key sections', async ({ page }) => {
    await page.goto('/');

    // Nav
    await expect(page.locator('nav')).toBeVisible();

    // Hero section
    await expect(page.locator('[data-hero]')).toBeVisible();

    // Pricing section
    await expect(page.locator('#pricing')).toBeVisible();

    // Footer
    await expect(page.locator('footer')).toBeVisible();
  });

  test('hero CTA navigates to /signup', async ({ page }) => {
    await page.goto('/');

    // Click the first prominent CTA in the hero area
    const heroCta = page.locator('[data-hero] button, [data-hero] a').first();
    await heroCta.click();

    await expect(page).toHaveURL(/\/signup/);
  });

  test('login link navigates to /login', async ({ page }) => {
    await page.goto('/');

    // Find a "Log in" link in the nav
    const loginLink = page.getByRole('button', { name: /log\s*in/i }).first()
      .or(page.getByRole('link', { name: /log\s*in/i }).first());
    await loginLink.click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('pricing shows free and keeper tiers', async ({ page }) => {
    await page.goto('/');

    const pricing = page.locator('#pricing');

    // Free tier
    await expect(pricing.getByText('Free Forever')).toBeVisible();
    await expect(pricing.getByText('$0')).toBeVisible();

    // Keeper tier
    await expect(pricing.getByText('Keeper Plan')).toBeVisible();
    await expect(pricing.getByText('$39.99')).toBeVisible();
  });

  test('pricing CTA navigates to /signup', async ({ page }) => {
    await page.goto('/');

    const pricingCta = page.locator('#pricing button', { hasText: /get started/i });
    await pricingCta.click();

    await expect(page).toHaveURL(/\/signup/);
  });
});
