/**
 * Admin routes.
 * Order dashboard and dev mock status endpoint.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { adminMiddleware } from '../middleware/admin.js';

const admin = new Hono();

// Apply admin middleware to all routes
admin.use('*', adminMiddleware());

function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

// Statuses that represent actual orders (not drafts/designing)
const ORDER_STATUSES = ['ready', 'ordered', 'printing', 'shipped', 'delivered', 'cancelled', 'error'];

/**
 * GET /admin/orders
 * List all book orders with pagination and optional status filter.
 */
admin.get('/orders', async (c) => {
  const supabase = getSupabase(c.env);

  const statusParam = c.req.query('status');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  // Determine which statuses to filter by
  let statuses = ORDER_STATUSES;
  if (statusParam) {
    statuses = statusParam.split(',').map((s) => s.trim()).filter((s) => ORDER_STATUSES.includes(s));
    if (statuses.length === 0) statuses = ORDER_STATUSES;
  }

  // Get total count
  const { count, error: countError } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })
    .in('status', statuses);

  if (countError) {
    console.error('Admin order count error:', countError);
    return c.json({ error: 'Failed to count orders' }, 500);
  }

  // Get orders with user profile info
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select(`
      id, title, status, payment_status, lulu_order_id, lulu_project_id,
      stripe_session_id, quantity, price_cents, shipping_address, print_options,
      error_message, page_count, created_at, updated_at,
      profiles:user_id ( display_name, id )
    `)
    .in('status', statuses)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (booksError) {
    console.error('Admin order list error:', booksError);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }

  // We need user emails — fetch from auth via the user IDs
  const userIds = [...new Set((books || []).map((b) => b.profiles?.id).filter(Boolean))];
  let emailMap = {};
  if (userIds.length > 0) {
    // Fetch emails from profiles table (we can also join auth.users but profiles is simpler)
    // Since we already have profiles joined, we'll use the auth admin API
    for (const uid of userIds) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(uid);
        if (user?.email) emailMap[uid] = user.email;
      } catch {
        // Skip if we can't get the email
      }
    }
  }

  const orders = (books || []).map((book) => ({
    id: book.id,
    title: book.title,
    status: book.status,
    paymentStatus: book.payment_status,
    userName: book.profiles?.display_name || null,
    userEmail: emailMap[book.profiles?.id] || null,
    luluOrderId: book.lulu_order_id,
    luluProjectId: book.lulu_project_id,
    stripeSessionId: book.stripe_session_id,
    quantity: book.quantity,
    orderCost: book.price_cents,
    shippingAddress: book.shipping_address,
    printOptions: book.print_options,
    errorMessage: book.error_message,
    pageCount: book.page_count,
    createdAt: book.created_at,
    updatedAt: book.updated_at,
  }));

  return c.json({
    orders,
    total: count || 0,
    page,
    limit,
  });
});

/**
 * POST /admin/orders/:id/mock-status
 * Dev-only endpoint to manually set a book's order status for testing.
 */
admin.post('/orders/:id/mock-status', async (c) => {
  // Block in production
  if (c.env.ENVIRONMENT === 'production') {
    return c.json({ error: 'Mock status endpoint is disabled in production' }, 403);
  }

  const bookId = c.req.param('id');
  const supabase = getSupabase(c.env);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { status, trackingId, trackingUrl } = body;
  const validStatuses = ['ordered', 'printing', 'shipped', 'delivered'];
  if (!status || !validStatuses.includes(status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  // Verify the book exists
  const { data: book, error: fetchError } = await supabase
    .from('books')
    .select('id, lulu_order_id')
    .eq('id', bookId)
    .single();

  if (fetchError || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  // Build update payload
  const update = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set a fake lulu_order_id if none exists so status polling works
  if (!book.lulu_order_id) {
    update.lulu_order_id = `mock-${crypto.randomUUID()}`;
  }

  // Store tracking info in shipping_address if provided
  if (trackingId || trackingUrl) {
    const { data: fullBook } = await supabase
      .from('books')
      .select('shipping_address')
      .eq('id', bookId)
      .single();

    update.shipping_address = {
      ...(fullBook?.shipping_address || {}),
      trackingId: trackingId || null,
      trackingUrl: trackingUrl || null,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from('books')
    .update(update)
    .eq('id', bookId)
    .select()
    .single();

  if (updateError) {
    console.error('Mock status update error:', updateError);
    return c.json({ error: 'Failed to update status' }, 500);
  }

  return c.json({
    id: updated.id,
    status: updated.status,
    luluOrderId: updated.lulu_order_id,
    message: `Status updated to "${status}"`,
  });
});

export default admin;
