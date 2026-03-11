/**
 * Tests for articles route handlers ("Between the Pages" content hub).
 * @see ../routes/articles.js
 *
 * Mocks Supabase and middleware to test all route handlers in isolation.
 */

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

/**
 * Creates a chainable query builder that resolves to the given result.
 * Every Supabase method returns `this`, and `.single()` returns the stored
 * result as a Promise. The builder itself is thenable so bare `await` works.
 */
function createQueryBuilder(result = { data: null, error: null }) {
  const builder = {
    _result: result,
    select: vi.fn(function () { return this; }),
    insert: vi.fn(function () { return this; }),
    update: vi.fn(function () { return this; }),
    delete: vi.fn(function () { return this; }),
    eq: vi.fn(function () { return this; }),
    neq: vi.fn(function () { return this; }),
    is: vi.fn(function () { return this; }),
    in: vi.fn(function () { return this; }),
    order: vi.fn(function () { return this; }),
    limit: vi.fn(function () { return this; }),
    range: vi.fn(function () { return this; }),
    contains: vi.fn(function () { return this; }),
    single: vi.fn(function () { return Promise.resolve(this._result); }),
    maybeSingle: vi.fn(function () { return Promise.resolve(this._result); }),
    then(resolve, reject) {
      return Promise.resolve(this._result).then(resolve, reject);
    },
  };
  return builder;
}

/** Per-table result queues consumed by each supabase.from(table) call. */
let supabaseFromResults;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (supabaseFromResults[table] && supabaseFromResults[table].length > 0) {
        return createQueryBuilder(supabaseFromResults[table].shift());
      }
      return createQueryBuilder({ data: null, error: null });
    }),
  })),
}));

/** Push one or more result objects into the queue for `table`. */
function mockFrom(table, ...results) {
  if (!supabaseFromResults[table]) supabaseFromResults[table] = [];
  supabaseFromResults[table].push(...results);
}

// ---------------------------------------------------------------------------
// Middleware mocks
// ---------------------------------------------------------------------------

const TEST_USER = { id: 'user-admin-1', email: 'admin@example.com' };

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: () => async (c, next) => {
    c.set('user', TEST_USER);
    await next();
  },
}));

vi.mock('../middleware/admin.js', () => ({
  adminMiddleware: () => async (c, next) => {
    await next();
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks are declared
// ---------------------------------------------------------------------------

import articles from '../routes/articles.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'test-key',
  ADMIN_EMAILS: 'admin@example.com',
};

/**
 * Call a route on the articles Hono sub-app and return parsed JSON + status.
 */
async function callJson(method, path, { body, headers = {} } = {}) {
  const url = `http://localhost${path}`;
  const init = { method, headers: { ...headers } };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }

  const req = new Request(url, init);
  const res = await articles.fetch(req, env);

  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('json')) {
    const data = await res.json();
    return { status: res.status, data, response: res };
  }
  const text = await res.text();
  return { status: res.status, text, response: res };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  supabaseFromResults = {};
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Public GET /articles
// ═══════════════════════════════════════════════════════════════════════════════

describe('Public GET /articles', () => {
  it('returns paginated published articles', async () => {
    mockFrom('articles', {
      data: [
        {
          id: 'art-1',
          title: 'Preserving Family Letters',
          slug: 'preserving-family-letters',
          excerpt: 'Learn how to preserve your family letters.',
          cover_image_url: 'https://img.co/letters.jpg',
          author: 'KeptPages Team',
          tags: ['preservation', 'letters'],
          category: 'preservation',
          published_at: '2026-01-15T10:00:00Z',
        },
        {
          id: 'art-2',
          title: 'Scanning Old Photos',
          slug: 'scanning-old-photos',
          excerpt: 'Tips for scanning old photographs.',
          cover_image_url: 'https://img.co/photos.jpg',
          author: 'Jane Doe',
          tags: ['scanning', 'photos'],
          category: 'product-guides',
          published_at: '2026-01-10T08:00:00Z',
        },
      ],
      count: 2,
      error: null,
    });

    const { status, data } = await callJson('GET', '/');

    expect(status).toBe(200);
    expect(data.articles).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
    expect(data.totalPages).toBe(1);

    // Verify camelCase field mapping
    expect(data.articles[0]).toEqual({
      id: 'art-1',
      title: 'Preserving Family Letters',
      slug: 'preserving-family-letters',
      excerpt: 'Learn how to preserve your family letters.',
      coverImageUrl: 'https://img.co/letters.jpg',
      author: 'KeptPages Team',
      tags: ['preservation', 'letters'],
      category: 'preservation',
      publishedAt: '2026-01-15T10:00:00Z',
    });

    expect(data.articles[1].id).toBe('art-2');
    expect(data.articles[1].coverImageUrl).toBe('https://img.co/photos.jpg');
  });

  it('filters by category', async () => {
    mockFrom('articles', {
      data: [
        {
          id: 'art-3',
          title: 'How to Use KeptPages',
          slug: 'how-to-use-keptpages',
          excerpt: 'A guide.',
          cover_image_url: null,
          author: 'KeptPages Team',
          tags: ['guide'],
          category: 'product-guides',
          published_at: '2026-02-01T12:00:00Z',
        },
      ],
      count: 1,
      error: null,
    });

    const { status, data } = await callJson('GET', '/?category=product-guides');

    expect(status).toBe(200);
    expect(data.articles).toHaveLength(1);
    expect(data.articles[0].category).toBe('product-guides');
    expect(data.total).toBe(1);
  });

  it('filters by tag', async () => {
    mockFrom('articles', {
      data: [
        {
          id: 'art-4',
          title: 'Digitizing Recipes',
          slug: 'digitizing-recipes',
          excerpt: 'How to digitize your family recipes.',
          cover_image_url: null,
          author: 'KeptPages Team',
          tags: ['recipes', 'preservation'],
          category: 'preservation',
          published_at: '2026-02-05T09:00:00Z',
        },
      ],
      count: 1,
      error: null,
    });

    const { status, data } = await callJson('GET', '/?tag=recipes');

    expect(status).toBe(200);
    expect(data.articles).toHaveLength(1);
    expect(data.articles[0].tags).toContain('recipes');
  });

  it('returns empty array when no articles exist', async () => {
    mockFrom('articles', {
      data: [],
      count: 0,
      error: null,
    });

    const { status, data } = await callJson('GET', '/');

    expect(status).toBe(200);
    expect(data.articles).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.totalPages).toBe(0);
  });

  it('returns 500 on database error', async () => {
    mockFrom('articles', {
      data: null,
      count: null,
      error: { message: 'DB connection failed' },
    });

    const { status, data } = await callJson('GET', '/');

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to fetch articles');
  });

  it('handles null data gracefully', async () => {
    mockFrom('articles', {
      data: null,
      count: null,
      error: null,
    });

    const { status, data } = await callJson('GET', '/');

    expect(status).toBe(200);
    expect(data.articles).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('respects pagination parameters', async () => {
    mockFrom('articles', {
      data: [
        {
          id: 'art-5',
          title: 'Page Two Article',
          slug: 'page-two-article',
          excerpt: 'On page two.',
          cover_image_url: null,
          author: 'KeptPages Team',
          tags: [],
          category: 'preservation',
          published_at: '2026-01-20T14:00:00Z',
        },
      ],
      count: 15,
      error: null,
    });

    const { status, data } = await callJson('GET', '/?page=2&limit=5');

    expect(status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(5);
    expect(data.total).toBe(15);
    expect(data.totalPages).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Public GET /articles/:slug
// ═══════════════════════════════════════════════════════════════════════════════

describe('Public GET /articles/:slug', () => {
  it('returns a published article by slug', async () => {
    mockFrom('articles', {
      data: {
        id: 'art-1',
        title: 'Preserving Family Letters',
        slug: 'preserving-family-letters',
        content: '<p>Full article content here...</p>',
        excerpt: 'Learn how to preserve your family letters.',
        cover_image_url: 'https://img.co/letters.jpg',
        author: 'KeptPages Team',
        tags: ['preservation', 'letters'],
        category: 'preservation',
        published_at: '2026-01-15T10:00:00Z',
        seo_title: 'Preserving Family Letters | KeptPages',
        seo_description: 'A comprehensive guide to preserving family letters.',
        og_image_url: 'https://img.co/og-letters.jpg',
        status: 'published',
      },
      error: null,
    });

    const { status, data } = await callJson('GET', '/preserving-family-letters');

    expect(status).toBe(200);
    expect(data.id).toBe('art-1');
    expect(data.title).toBe('Preserving Family Letters');
    expect(data.slug).toBe('preserving-family-letters');
    expect(data.content).toBe('<p>Full article content here...</p>');
    expect(data.excerpt).toBe('Learn how to preserve your family letters.');
    expect(data.coverImageUrl).toBe('https://img.co/letters.jpg');
    expect(data.author).toBe('KeptPages Team');
    expect(data.tags).toEqual(['preservation', 'letters']);
    expect(data.category).toBe('preservation');
    expect(data.publishedAt).toBe('2026-01-15T10:00:00Z');
    expect(data.seoTitle).toBe('Preserving Family Letters | KeptPages');
    expect(data.seoDescription).toBe('A comprehensive guide to preserving family letters.');
    expect(data.ogImageUrl).toBe('https://img.co/og-letters.jpg');
  });

  it('returns 404 for non-existent slug', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    const { status, data } = await callJson('GET', '/non-existent-article');

    expect(status).toBe(404);
    expect(data.error).toBe('Article not found');
  });

  it('does NOT return draft articles', async () => {
    // The route filters by status='published', so a draft would not be found
    mockFrom('articles', {
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    const { status, data } = await callJson('GET', '/my-draft-article');

    expect(status).toBe(404);
    expect(data.error).toBe('Article not found');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /articles/rss
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /articles/rss', () => {
  it('returns RSS XML with correct content-type', async () => {
    mockFrom('articles', {
      data: [
        {
          title: 'Preserving Family Letters',
          slug: 'preserving-family-letters',
          excerpt: 'Learn how to preserve your family letters.',
          category: 'preservation',
          published_at: '2026-01-15T10:00:00Z',
          author: 'KeptPages Team',
        },
        {
          title: 'Scanning Old Photos',
          slug: 'scanning-old-photos',
          excerpt: 'Tips for scanning old photographs.',
          category: 'product-guides',
          published_at: '2026-01-10T08:00:00Z',
          author: 'Jane Doe',
        },
      ],
      error: null,
    });

    const req = new Request('http://localhost/rss', { method: 'GET' });
    const res = await articles.fetch(req, env);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');

    const text = await res.text();
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(text).toContain('<rss version="2.0"');
    expect(text).toContain('<title><![CDATA[Preserving Family Letters]]></title>');
    expect(text).toContain('<title><![CDATA[Scanning Old Photos]]></title>');
    expect(text).toContain('https://keptpages.com/between-the-pages/preserving-family-letters');
    expect(text).toContain('https://keptpages.com/between-the-pages/scanning-old-photos');
  });

  it('contains channel title "Between the Pages"', async () => {
    mockFrom('articles', {
      data: [],
      error: null,
    });

    const req = new Request('http://localhost/rss', { method: 'GET' });
    const res = await articles.fetch(req, env);

    const text = await res.text();
    expect(text).toContain('<title>Between the Pages');
  });

  it('returns 500 on database error', async () => {
    mockFrom('articles', {
      data: null,
      error: { message: 'DB error' },
    });

    const req = new Request('http://localhost/rss', { method: 'GET' });
    const res = await articles.fetch(req, env);

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe('Error generating RSS feed');
  });

  it('handles empty article list without errors', async () => {
    mockFrom('articles', {
      data: [],
      error: null,
    });

    const req = new Request('http://localhost/rss', { method: 'GET' });
    const res = await articles.fetch(req, env);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<channel>');
    expect(text).not.toContain('<item>');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Admin POST /articles/admin
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin POST /articles/admin', () => {
  it('creates a draft article', async () => {
    mockFrom('articles', {
      data: {
        id: 'art-new-1',
        title: 'New Draft Article',
        slug: 'new-draft-article',
        status: 'draft',
      },
      error: null,
    });

    const { status, data } = await callJson('POST', '/admin', {
      body: {
        title: 'New Draft Article',
        content: '<p>Article content.</p>',
        excerpt: 'A new draft article for testing.',
        author: 'Test Author',
        tags: ['testing'],
        category: 'preservation',
      },
    });

    expect(status).toBe(201);
    expect(data.id).toBe('art-new-1');
    expect(data.title).toBe('New Draft Article');
    expect(data.slug).toBe('new-draft-article');
    expect(data.status).toBe('draft');
  });

  it('auto-generates slug from title when slug is not provided', async () => {
    mockFrom('articles', {
      data: {
        id: 'art-new-2',
        title: 'My Amazing Article Title',
        slug: 'my-amazing-article-title',
        status: 'draft',
      },
      error: null,
    });

    const { status, data } = await callJson('POST', '/admin', {
      body: {
        title: 'My Amazing Article Title',
      },
    });

    expect(status).toBe(201);
    expect(data.slug).toBe('my-amazing-article-title');
  });

  it('returns 400 when title is missing', async () => {
    const { status, data } = await callJson('POST', '/admin', {
      body: { content: 'No title here' },
    });

    expect(status).toBe(400);
    expect(data.error).toBe('Title is required');
  });

  it('returns 400 when title is empty string', async () => {
    const { status, data } = await callJson('POST', '/admin', {
      body: { title: '   ' },
    });

    expect(status).toBe(400);
    expect(data.error).toBe('Title is required');
  });

  it('returns 400 for invalid category', async () => {
    const { status, data } = await callJson('POST', '/admin', {
      body: {
        title: 'Test Article',
        category: 'invalid-category',
      },
    });

    expect(status).toBe(400);
    expect(data.error).toContain('Invalid category');
  });

  it('returns 409 for duplicate slug', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: '23505', message: 'unique constraint violation' },
    });

    const { status, data } = await callJson('POST', '/admin', {
      body: { title: 'Duplicate Article' },
    });

    expect(status).toBe(409);
    expect(data.error).toBe('An article with this slug already exists');
  });

  it('returns 500 on unexpected database error', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: '42000', message: 'unexpected error' },
    });

    const { status, data } = await callJson('POST', '/admin', {
      body: { title: 'Failing Article' },
    });

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to create article');
  });

  it('uses custom slug when provided', async () => {
    mockFrom('articles', {
      data: {
        id: 'art-custom',
        title: 'My Article',
        slug: 'custom-slug-here',
        status: 'draft',
      },
      error: null,
    });

    const { status, data } = await callJson('POST', '/admin', {
      body: {
        title: 'My Article',
        slug: 'Custom Slug Here!',
      },
    });

    expect(status).toBe(201);
    expect(data.slug).toBe('custom-slug-here');
  });

  it('defaults author to KeptPages Team when not provided', async () => {
    mockFrom('articles', {
      data: {
        id: 'art-default-author',
        title: 'No Author Article',
        slug: 'no-author-article',
        status: 'draft',
      },
      error: null,
    });

    const { status } = await callJson('POST', '/admin', {
      body: { title: 'No Author Article' },
    });

    expect(status).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Admin PUT /articles/admin/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin PUT /articles/admin/:id', () => {
  it('updates article fields', async () => {
    mockFrom('articles', {
      data: {
        id: 'art-1',
        title: 'Updated Title',
        slug: 'updated-title',
        status: 'draft',
      },
      error: null,
    });

    const { status, data } = await callJson('PUT', '/admin/art-1', {
      body: {
        title: 'Updated Title',
        excerpt: 'Updated excerpt.',
        tags: ['updated', 'test'],
      },
    });

    expect(status).toBe(200);
    expect(data.id).toBe('art-1');
    expect(data.title).toBe('Updated Title');
  });

  it('returns 404 for non-existent article', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    const { status, data } = await callJson('PUT', '/admin/nonexistent-id', {
      body: { title: 'Does Not Exist' },
    });

    expect(status).toBe(404);
    expect(data.error).toBe('Article not found');
  });

  it('returns 400 when no fields to update', async () => {
    const { status, data } = await callJson('PUT', '/admin/art-1', {
      body: {},
    });

    expect(status).toBe(400);
    expect(data.error).toBe('No fields to update');
  });

  it('returns 400 for invalid category in update', async () => {
    const { status, data } = await callJson('PUT', '/admin/art-1', {
      body: { category: 'not-a-real-category' },
    });

    expect(status).toBe(400);
    expect(data.error).toContain('Invalid category');
  });

  it('returns 409 for duplicate slug on update', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: '23505', message: 'unique constraint violation' },
    });

    const { status, data } = await callJson('PUT', '/admin/art-1', {
      body: { slug: 'already-taken-slug' },
    });

    expect(status).toBe(409);
    expect(data.error).toBe('An article with this slug already exists');
  });

  it('returns 500 on unexpected database error', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: '42000', message: 'unexpected error' },
    });

    const { status, data } = await callJson('PUT', '/admin/art-1', {
      body: { title: 'Failing Update' },
    });

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to update article');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Admin PUT /articles/admin/:id/publish
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin PUT /articles/admin/:id/publish', () => {
  it('sets status to published and published_at', async () => {
    const publishedAt = '2026-03-01T12:00:00.000Z';
    mockFrom('articles', {
      data: {
        id: 'art-1',
        title: 'Published Article',
        slug: 'published-article',
        status: 'published',
        published_at: publishedAt,
      },
      error: null,
    });

    const { status, data } = await callJson('PUT', '/admin/art-1/publish');

    expect(status).toBe(200);
    expect(data.id).toBe('art-1');
    expect(data.status).toBe('published');
    expect(data.published_at).toBe(publishedAt);
  });

  it('returns 404 when article does not exist', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    const { status, data } = await callJson('PUT', '/admin/nonexistent-id/publish');

    expect(status).toBe(404);
    expect(data.error).toBe('Article not found');
  });

  it('returns 500 on unexpected database error', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: '42000', message: 'unexpected error' },
    });

    const { status, data } = await callJson('PUT', '/admin/art-1/publish');

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to publish article');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Admin DELETE /articles/admin/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin DELETE /articles/admin/:id', () => {
  it('archives (soft-deletes) the article', async () => {
    mockFrom('articles', {
      data: {
        id: 'art-1',
        title: 'Archived Article',
        status: 'archived',
      },
      error: null,
    });

    const { status, data } = await callJson('DELETE', '/admin/art-1');

    expect(status).toBe(200);
    expect(data.id).toBe('art-1');
    expect(data.status).toBe('archived');
  });

  it('returns 404 when article does not exist', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    const { status, data } = await callJson('DELETE', '/admin/nonexistent-id');

    expect(status).toBe(404);
    expect(data.error).toBe('Article not found');
  });

  it('returns 500 on unexpected database error', async () => {
    mockFrom('articles', {
      data: null,
      error: { code: '42000', message: 'unexpected error' },
    });

    const { status, data } = await callJson('DELETE', '/admin/art-1');

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to archive article');
  });
});
