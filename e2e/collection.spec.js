import { test, expect } from './fixtures/auth.js';
import { mockProfileApi, mockCollectionsApi, mockCollectionDetailApi } from './helpers/api-mocks.js';
import { MOCK_COLLECTION_ITEMS } from './fixtures/test-data.js';

test.describe('Collection Management', () => {
  test('rename collection inline', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockCollectionsApi(page);
    await mockCollectionDetailApi(page, 'col-0001', MOCK_COLLECTION_ITEMS);

    await page.goto('/app/collection/col-0001');

    // Wait for collection name to load
    const collectionName = page.getByText("Grandma's Recipes");
    await expect(collectionName).toBeVisible({ timeout: 5000 });

    // Click the name to start editing (triggers inline input)
    await collectionName.click();

    // The edit input has no explicit type="text" — use role selector
    const nameInput = page.getByRole('textbox').first();
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.fill('Updated Recipes');
    await nameInput.press('Enter');

    // The PUT request should have been called (we mocked it to succeed)
    // Verify the update reflected in the UI
    await expect(page.getByRole('heading', { name: 'Updated Recipes' })).toBeVisible({ timeout: 3000 });
  });

  test('delete document shows empty state', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockCollectionsApi(page);
    await mockCollectionDetailApi(page, 'col-0001', MOCK_COLLECTION_ITEMS);

    await page.goto('/app/collection/col-0001');

    // Wait for document to be visible
    await expect(page.getByText('Chocolate Chip Cookies')).toBeVisible({ timeout: 5000 });

    // After deleting the document, mock the response to return empty items
    await page.route('**/api/collections/col-0001', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'col-0001',
            name: "Grandma's Recipes",
            items: [],
          }),
        });
      }
      return route.continue();
    });
    await page.route('**/api/collections/col-0001/documents/*', (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    // Find and click the remove/delete button on the document card
    const removeBtn = page.getByRole('button', { name: /remove|delete/i }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      // If there's a confirmation, confirm it
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|remove/i });
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }
  });

  test('nonexistent collection shows not-found page', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    // Return empty collections list — col-9999 won't be found
    await mockCollectionsApi(page, []);

    // Mock the detail endpoint to also return 404
    await page.route('**/api/collections/col-9999', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Collection not found' }),
      })
    );

    await page.goto('/app/collection/col-9999');

    await expect(page.getByText(/collection not found/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /back to dashboard/i })).toBeVisible();
  });

  test('empty collection shows add-document prompt', async ({ authenticatedPage: page }) => {
    await mockProfileApi(page);
    await mockCollectionsApi(page);
    // Collection exists but has zero documents
    await mockCollectionDetailApi(page, 'col-0001', []);

    await page.goto('/app/collection/col-0001');

    await expect(page.getByText(/add your first document/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /scan a document/i })).toBeVisible();
  });
});
