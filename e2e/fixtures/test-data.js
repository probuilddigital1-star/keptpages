export const MOCK_PROFILE = {
  id: 'e2e-user-0001-0001-0001-000000000001',
  email: 'e2e@keptpages.test',
  name: 'E2E Test User',
  avatar_url: null,
  tier: 'free',
  usage: { scans: 3, collections: 1 },
  limits: { scans: 25, collections: 5 },
  subscription: null,
  isAdmin: false,
};

export const MOCK_PROFILE_NEAR_LIMIT = {
  ...MOCK_PROFILE,
  usage: { scans: 20, collections: 3 },
};

export const MOCK_PROFILE_AT_LIMIT = {
  ...MOCK_PROFILE,
  usage: { scans: 25, collections: 5 },
};

export const MOCK_COLLECTIONS = [
  {
    id: 'col-0001',
    name: 'Grandma\'s Recipes',
    description: 'Family recipes passed down through generations',
    userId: MOCK_PROFILE.id,
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    itemCount: 1,
  },
];

// Items in the format expected by documentsStore.fetchDocuments (res.items)
export const MOCK_COLLECTION_ITEMS = [
  {
    id: 'item-0001',
    position: 0,
    sectionTitle: null,
    scan: {
      id: 'scan-0001',
      title: 'Chocolate Chip Cookies',
      documentType: 'recipe',
      extractedData: {
        title: 'Chocolate Chip Cookies',
        content: 'Mix flour, butter, sugar, and chocolate chips. Bake at 350F for 12 minutes.',
      },
      originalFilename: 'cookies.jpg',
      status: 'completed',
      confidence: 0.92,
    },
  },
];

// Scan object in the format returned by GET /api/scan/:id (camelCase)
export const MOCK_SCAN = {
  id: 'scan-0001',
  userId: MOCK_PROFILE.id,
  title: 'Chocolate Chip Cookies',
  documentType: 'recipe',
  status: 'completed',
  confidence: 0.92,
  extractedData: {
    title: 'Chocolate Chip Cookies',
    content: 'Mix flour, butter, sugar, and chocolate chips. Bake at 350F for 12 minutes.',
  },
  originalFilename: 'cookies.jpg',
  r2Key: 'uploads/e2e-user/scan-0001.jpg',
  createdAt: '2025-06-01T00:00:00.000Z',
  updatedAt: '2025-06-01T00:00:00.000Z',
};

export const MOCK_SHARE = {
  token: 'share-token-abc123',
  collection: {
    id: 'col-0001',
    name: 'Grandma\'s Recipes',
    description: 'Family recipes passed down through generations',
  },
  items: [
    {
      id: 'item-0001',
      position: 0,
      scan: {
        id: 'scan-0001',
        title: 'Chocolate Chip Cookies',
        documentType: 'recipe',
        extractedData: {
          title: 'Chocolate Chip Cookies',
          content: 'Mix flour, butter, sugar, and chocolate chips. Bake at 350F for 12 minutes.',
        },
        originalFilename: 'cookies.jpg',
        status: 'completed',
      },
    },
  ],
};
