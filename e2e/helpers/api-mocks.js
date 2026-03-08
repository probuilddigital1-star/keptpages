import { MOCK_PROFILE, MOCK_COLLECTIONS, MOCK_COLLECTION_ITEMS, MOCK_SCAN } from '../fixtures/test-data.js';

/**
 * Mock GET /api/user/profile
 */
export async function mockProfileApi(page, overrides = {}) {
  const profile = { ...MOCK_PROFILE, ...overrides };
  await page.route('**/api/user/profile', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

/**
 * Mock GET /api/collections and POST /api/collections
 * collectionsStore.fetchCollections expects { collections: [...] }
 */
export async function mockCollectionsApi(page, collections = MOCK_COLLECTIONS) {
  await page.route('**/api/collections', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ collections }),
      });
    }
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'col-new',
          name: 'New Collection',
          ...JSON.parse(route.request().postData() || '{}'),
          createdAt: new Date().toISOString(),
        }),
      });
    }
    return route.continue();
  });
}

/**
 * Mock collection detail endpoints:
 *   GET /api/collections/:id  — documentsStore.fetchDocuments expects { items: [...] }
 *   PUT /api/collections/:id
 *   DELETE /api/collections/:id
 *   DELETE /api/collections/:id/documents/:docId
 */
export async function mockCollectionDetailApi(page, id = 'col-0001', items = MOCK_COLLECTION_ITEMS) {
  // Collection detail — used by both collectionsStore and documentsStore
  await page.route(`**/api/collections/${id}`, (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_COLLECTIONS[0],
          id,
          items,
        }),
      });
    }
    if (method === 'PUT') {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_COLLECTIONS[0], id, ...body }),
      });
    }
    if (method === 'DELETE') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });

  // Documents — DELETE for removing a document from collection
  await page.route(`**/api/collections/${id}/documents/*`, (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
}

/**
 * Mock scan endpoints:
 *   POST /api/scan (upload via XMLHttpRequest FormData)
 *   POST /api/scan/:id/process
 *   GET  /api/scan/:id
 */
export async function mockScanApi(page, scan = MOCK_SCAN) {
  // Upload scan
  await page.route('**/api/scan', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: scan.id, status: 'uploaded' }),
      });
    }
    return route.continue();
  });

  // Process scan
  await page.route(`**/api/scan/${scan.id}/process`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(scan),
    })
  );

  // Get scan detail
  await page.route(`**/api/scan/${scan.id}`, (route) => {
    if (route.request().url().includes('/process')) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(scan),
    });
  });
}

/**
 * Mock Stripe checkout endpoint
 */
export async function mockStripeApi(page) {
  await page.route('**/api/stripe/checkout', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'https://checkout.stripe.com/test' }),
    })
  );

  await page.route('**/api/stripe/portal', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'https://billing.stripe.com/test' }),
    })
  );
}

/**
 * Mock shared collection endpoint
 */
export async function mockSharedApi(page, shareData) {
  await page.route(`**/api/shared/${shareData.token}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(shareData),
    })
  );
}
