/**
 * Articles routes — "Between the Pages" content hub.
 * Public endpoints for listing and reading articles.
 * Admin endpoints for creating, updating, and publishing articles.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const articles = new Hono();

function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

const VALID_CATEGORIES = ['preservation', 'family-stories', 'product-guides'];

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

/**
 * GET /articles
 * List published articles with pagination, category filter, and tag filter.
 */
articles.get('/', async (c) => {
  const supabase = getSupabase(c.env);

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '10', 10)));
  const offset = (page - 1) * limit;
  const category = c.req.query('category');
  const tag = c.req.query('tag');

  let query = supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image_url, author, tags, category, published_at', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (category && VALID_CATEGORIES.includes(category)) {
    query = query.eq('category', category);
  }

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Articles list error:', error);
    return c.json({ error: 'Failed to fetch articles' }, 500);
  }

  return c.json({
    articles: (data || []).map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      coverImageUrl: a.cover_image_url,
      author: a.author,
      tags: a.tags,
      category: a.category,
      publishedAt: a.published_at,
    })),
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

/**
 * GET /articles/rss
 * RSS 2.0 feed of the 20 most recent published articles.
 */
articles.get('/rss', async (c) => {
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('articles')
    .select('title, slug, excerpt, category, published_at, author')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('RSS feed error:', error);
    return c.text('Error generating RSS feed', 500);
  }

  const siteUrl = 'https://keptpages.com';
  const items = (data || []).map((a) => {
    const link = `${siteUrl}/between-the-pages/${a.slug}`;
    const pubDate = a.published_at ? new Date(a.published_at).toUTCString() : '';
    return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${a.excerpt || ''}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${a.author || 'KeptPages Team'}</author>
      <category>${a.category}</category>
    </item>`;
  }).join('\n');

  const lastBuildDate = data?.length ? new Date(data[0].published_at).toUTCString() : new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Between the Pages — KeptPages</title>
    <link>${siteUrl}/between-the-pages</link>
    <description>Guides, stories, and inspiration for preserving what matters most.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/api/articles/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

/**
 * GET /articles/:slug
 * Get a single published article by slug.
 */
articles.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  // Skip if this looks like an admin route (handled below after middleware)
  if (slug === 'admin') return c.notFound();

  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return c.json({ error: 'Article not found' }, 404);
  }

  return c.json({
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt,
    coverImageUrl: data.cover_image_url,
    author: data.author,
    tags: data.tags,
    category: data.category,
    publishedAt: data.published_at,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    ogImageUrl: data.og_image_url,
  });
});

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

const adminArticles = new Hono();
adminArticles.use('*', authMiddleware());
adminArticles.use('*', adminMiddleware());

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

/**
 * POST /articles/admin
 * Create a new draft article.
 */
adminArticles.post('/', async (c) => {
  const supabase = getSupabase(c.env);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { title, content, slug, excerpt, coverImageUrl, author, tags, category, seoTitle, seoDescription, ogImageUrl } = body;

  if (!title || !title.trim()) {
    return c.json({ error: 'Title is required' }, 400);
  }

  const articleSlug = slug ? slugify(slug) : slugify(title);

  if (category && !VALID_CATEGORIES.includes(category)) {
    return c.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, 400);
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({
      title: title.trim(),
      slug: articleSlug,
      content: content || '',
      excerpt: excerpt || null,
      cover_image_url: coverImageUrl || null,
      author: author || 'KeptPages Team',
      tags: tags || [],
      category: category || 'preservation',
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      og_image_url: ogImageUrl || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'An article with this slug already exists' }, 409);
    }
    console.error('Create article error:', error);
    return c.json({ error: 'Failed to create article' }, 500);
  }

  return c.json({
    id: data.id,
    title: data.title,
    slug: data.slug,
    status: data.status,
  }, 201);
});

/**
 * PUT /articles/admin/:id
 * Update an article.
 */
adminArticles.put('/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const update = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.slug !== undefined) update.slug = slugify(body.slug);
  if (body.content !== undefined) update.content = body.content;
  if (body.excerpt !== undefined) update.excerpt = body.excerpt;
  if (body.coverImageUrl !== undefined) update.cover_image_url = body.coverImageUrl;
  if (body.author !== undefined) update.author = body.author;
  if (body.tags !== undefined) update.tags = body.tags;
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return c.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, 400);
    }
    update.category = body.category;
  }
  if (body.seoTitle !== undefined) update.seo_title = body.seoTitle;
  if (body.seoDescription !== undefined) update.seo_description = body.seoDescription;
  if (body.ogImageUrl !== undefined) update.og_image_url = body.ogImageUrl;

  if (Object.keys(update).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const { data, error } = await supabase
    .from('articles')
    .update(update)
    .eq('id', id)
    .select('id, title, slug, status')
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'An article with this slug already exists' }, 409);
    }
    if (error.code === 'PGRST116') {
      return c.json({ error: 'Article not found' }, 404);
    }
    console.error('Update article error:', error);
    return c.json({ error: 'Failed to update article' }, 500);
  }

  return c.json(data);
});

/**
 * PUT /articles/admin/:id/publish
 * Publish an article.
 */
adminArticles.put('/:id/publish', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('articles')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, title, slug, status, published_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ error: 'Article not found' }, 404);
    }
    console.error('Publish article error:', error);
    return c.json({ error: 'Failed to publish article' }, 500);
  }

  return c.json(data);
});

/**
 * DELETE /articles/admin/:id
 * Soft-delete (archive) an article.
 */
adminArticles.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('articles')
    .update({ status: 'archived' })
    .eq('id', id)
    .select('id, title, status')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ error: 'Article not found' }, 404);
    }
    console.error('Archive article error:', error);
    return c.json({ error: 'Failed to archive article' }, 500);
  }

  return c.json(data);
});

// Mount admin routes
articles.route('/admin', adminArticles);

export default articles;
