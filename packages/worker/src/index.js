/**
 * KeptPages API - Cloudflare Workers entry point.
 *
 * Hono-based API with R2 storage, KV rate limiting, Supabase data layer,
 * and integrations with Gemini, Claude, Stripe, and Lulu Print.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Middleware
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';

// Route modules
import scanRoutes from './routes/scan.js';
import collectionsRoutes from './routes/collections.js';
import booksRoutes from './routes/books.js';
import stripeRoutes from './routes/stripe.js';
import shareRoutes from './routes/share.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import waitlistRoutes from './routes/waitlist.js';
import articlesRoutes from './routes/articles.js';

// Stripe webhook service
import { handleWebhookEvent } from './services/stripe.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

// CORS - allow the web app origin
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://keptpages.com',
        'https://www.keptpages.com',
        'https://app.keptpages.com',
      ];
      // Also allow the configured APP_URL
      if (c.env?.APP_URL) {
        allowedOrigins.push(c.env.APP_URL);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || '*';
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Stripe-Signature'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    maxAge: 86400,
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Public routes (no auth required)
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'keptpages-api',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'unknown',
  });
});

// Waitlist - public, no auth
app.route('/api/waitlist', waitlistRoutes);

// Articles ("Between the Pages") - public listing + detail, admin sub-routes require auth
app.route('/api/articles', articlesRoutes);

// Shared collection viewer - public, no auth
// The share routes module defines GET /shared/:token which we mount here
app.get('/api/shared/:token', async (c) => {
  const token = c.req.param('token');
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // Look up the share record
  const { data: shareRecord, error: shareError } = await supabase
    .from('shares')
    .select('*')
    .eq('token', token)
    .single();

  if (shareError || !shareRecord) {
    return c.json({ error: 'Share link not found or invalid' }, 404);
  }

  // Check expiration
  if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
    return c.json({ error: 'This share link has expired' }, 410);
  }

  // Fetch the collection
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('id, name, description, cover_image_url')
    .eq('id', shareRecord.collection_id)
    .single();

  if (colError || !collection) {
    return c.json({ error: 'Shared collection not found' }, 404);
  }

  // Fetch collection items with scan data
  const { data: items, error: itemsError } = await supabase
    .from('collection_items')
    .select(`
      id,
      sort_order,
      section_title,
      scans:scan_id (
        id,
        title,
        document_type,
        extracted_data,
        original_filename,
        status
      )
    `)
    .eq('collection_id', shareRecord.collection_id)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Failed to fetch shared collection items:', itemsError);
    return c.json({ error: 'Failed to load shared collection' }, 500);
  }

  // Increment view count
  await supabase
    .from('shares')
    .update({ view_count: (shareRecord.view_count || 0) + 1 })
    .eq('id', shareRecord.id);

  const permissions = shareRecord.permissions || { canView: true };

  return c.json({
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      coverImageUrl: collection.cover_image_url,
    },
    permissions,
    items: (items || []).map((item) => ({
      id: item.id,
      position: item.sort_order,
      sectionTitle: item.section_title,
      scan: item.scans
        ? {
            id: item.scans.id,
            title: item.scans.title,
            documentType: item.scans.document_type,
            extractedData: permissions.canView ? item.scans.extracted_data : null,
            originalFilename: item.scans.original_filename,
            status: item.scans.status,
          }
        : null,
    })),
  });
});

// Stripe webhook - public (uses Stripe signature verification instead of JWT auth)
app.post('/api/stripe/webhook', async (c) => {
  const stripeSecretKey = c.env.STRIPE_SECRET_KEY;
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('Stripe secrets not configured');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const rawBody = await c.req.text();
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  let event;
  try {
    event = await stripeClient.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return c.json({ error: 'Invalid webhook signature' }, 400);
  }

  try {
    await handleWebhookEvent(event, c.env);
    return c.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return c.json({ received: false, error: err.message }, 500);
  }
});

// Public R2 file access with signed token (used by Lulu to fetch PDFs)
app.get('/api/public/files/:token/:key{.+}', async (c) => {
  const { token, key } = c.req.param();

  // Verify HMAC token: SHA-256(key + SUPABASE_SERVICE_KEY) truncated to 32 hex chars
  const encoder = new TextEncoder();
  const data = encoder.encode(key + c.env.SUPABASE_SERVICE_KEY);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);

  if (token !== expectedToken) {
    return c.json({ error: 'Invalid token' }, 403);
  }

  const object = await c.env.PROCESSED.get(key);
  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf');
  headers.set('Cache-Control', 'private, max-age=3600');
  return new Response(object.body, { headers });
});

// ---------------------------------------------------------------------------
// Protected routes (auth + rate limiting)
// ---------------------------------------------------------------------------

const protectedApi = new Hono();

// Auth middleware
protectedApi.use('*', authMiddleware());

// Rate limiting middleware
protectedApi.use('*', rateLimitMiddleware());

// Serve R2 images for book designer canvas (authenticated)
protectedApi.get('/images/*', async (c) => {
  const user = c.get('user');
  const key = c.req.path.replace(/^\/api\/images\//, '');

  if (!key) {
    return c.json({ error: 'Missing image key' }, 400);
  }

  // Verify the key belongs to this user
  if (!key.startsWith(`${user.id}/`)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Try PROCESSED bucket first (book images, cover photos), then UPLOADS (scan originals)
  let obj = await c.env.PROCESSED.get(key);
  if (!obj) {
    obj = await c.env.UPLOADS.get(key);
  }
  if (!obj) {
    return c.json({ error: 'Image not found' }, 404);
  }

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

// Mount route groups
protectedApi.route('/scan', scanRoutes);
protectedApi.route('/collections', collectionsRoutes);
protectedApi.route('/books', booksRoutes);
protectedApi.route('/stripe', stripeRoutes);
protectedApi.route('/share', shareRoutes);
protectedApi.route('/user', userRoutes);
protectedApi.route('/admin', adminRoutes);

// Mount protected routes under /api
app.route('/api', protectedApi);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  // Don't expose internal error details in production
  const isProduction = c.env.ENVIRONMENT === 'production';
  const message = isProduction ? 'Internal server error' : err.message;
  const stack = isProduction ? undefined : err.stack;

  return c.json(
    {
      error: 'Internal Server Error',
      message,
      ...(stack ? { stack } : {}),
    },
    500
  );
});

export default app;
