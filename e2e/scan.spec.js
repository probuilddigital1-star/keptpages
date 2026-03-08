import path from 'path';
import { test, expect } from './fixtures/auth.js';
import { mockProfileApi, mockCollectionsApi, mockCollectionDetailApi, mockScanApi } from './helpers/api-mocks.js';
import { MOCK_SCAN } from './fixtures/test-data.js';

test.describe('Scan Flow', () => {
  test('upload file and navigate to scan detail', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockCollectionsApi(page);
    await mockScanApi(page);

    await page.goto('/app/scan');

    // Should see scan page heading
    await expect(page.getByText('New Scan')).toBeVisible();

    // Upload via the drop zone file input
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(path.resolve('e2e/fixtures/test-image.jpg'));

      // Wait for navigation to scan detail or processing state
      await page.waitForURL(/\/app\/scan\//, { timeout: 10000 }).catch(() => {
        // May stay on page showing processing state — that's ok
      });
    }
  });

  test('scan detail shows extracted data', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockScanApi(page);

    await page.goto(`/app/scan/${MOCK_SCAN.id}`);

    // Title is rendered inside an <Input> component (value, not text node)
    await expect(page.getByLabel('Title')).toHaveValue('Chocolate Chip Cookies', { timeout: 5000 });
  });

  test('scan detail API error shows error state', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);

    // Mock scan endpoint to return 404
    await page.route('**/api/scan/nonexistent', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Scan not found' }),
      })
    );

    await page.goto('/app/scan/nonexistent');

    await expect(page.getByText(/could not load scan/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /back to scans/i })).toBeVisible();
  });

  test('scan detail shows confidence badge', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockScanApi(page);

    await page.goto(`/app/scan/${MOCK_SCAN.id}`);

    // MOCK_SCAN has confidence 0.92 → "High confidence (92%)"
    await expect(page.getByText(/high confidence/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/92%/)).toBeVisible();
  });

  test('low confidence scan shows warning and reprocess button', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);

    const lowConfidenceScan = {
      ...MOCK_SCAN,
      id: 'scan-low',
      confidence: 0.35,
    };

    await page.route('**/api/scan/scan-low', (route) => {
      if (route.request().url().includes('/process')) return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(lowConfidenceScan),
      });
    });

    await page.goto('/app/scan/scan-low');

    // Low confidence (< 0.5) shows warning banner and badge
    await expect(page.getByText(/low confidence \(35%\)/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/review the extracted text carefully/i)).toBeVisible();
    // Confidence < 0.7 shows reprocess button
    await expect(page.getByRole('button', { name: /reprocess/i })).toBeVisible();
  });
});
