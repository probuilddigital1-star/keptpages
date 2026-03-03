/**
 * Books routes.
 * Manages book projects for print-on-demand via Lulu.
 * Handles creation, editing, PDF generation, ordering, and status polling.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { validate } from '../middleware/validate.js';
import { generateBookPdf, generateCoverPdf } from '../services/pdf.js';
import { getOrderStatus } from '../services/lulu.js';
import { createBookCheckoutSession } from '../services/stripe.js';

const books = new Hono();

function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * POST /books
 * Create a new book project.
 */
books.post(
  '/',
  validate({
    title: { required: true, type: 'string', maxLength: 200 },
    subtitle: { required: false, type: 'string', maxLength: 300 },
    author: { required: false, type: 'string', maxLength: 150 },
    collectionId: { required: true, type: 'string' },
    template: { required: false, type: 'string', enum: ['classic', 'modern', 'minimal'] },
  }),
  async (c) => {
    const user = c.get('user');
    const body = c.get('body');
    const supabase = getSupabase(c.env);

    // Verify the collection exists and belongs to the user
    const { data: collection, error: colError } = await supabase
      .from('collections')
      .select('id, name')
      .eq('id', body.collectionId)
      .eq('user_id', user.id)
      .single();

    if (colError || !collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    const { data: book, error: createError } = await supabase
      .from('books')
      .insert({
        user_id: user.id,
        collection_id: body.collectionId,
        title: body.title,
        subtitle: body.subtitle || null,
        author: body.author || null,
        template: body.template || 'classic',
        status: 'draft',
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create book:', createError);
      return c.json({ error: 'Failed to create book project' }, 500);
    }

    return c.json(
      {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        template: book.template,
        collectionId: book.collection_id,
        status: book.status,
        createdAt: book.created_at,
      },
      201
    );
  }
);

/**
 * GET /books/:id
 * Get a book project with its current status.
 */
books.get('/:id', async (c) => {
  const user = c.get('user');
  const bookId = c.req.param('id');
  const supabase = getSupabase(c.env);

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (error || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  return c.json({
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    template: book.template,
    collectionId: book.collection_id,
    status: book.status,
    luluProjectId: book.lulu_project_id,
    luluOrderId: book.lulu_order_id,
    interiorPdfKey: book.interior_pdf_key,
    coverPdfKey: book.cover_pdf_key,
    pageCount: book.page_count,
    createdAt: book.created_at,
    updatedAt: book.updated_at,
  });
});

/**
 * PUT /books/:id
 * Update book metadata (template, cover, title, chapters, etc.).
 */
books.put(
  '/:id',
  validate({
    title: { required: false, type: 'string', maxLength: 200 },
    subtitle: { required: false, type: 'string', maxLength: 300 },
    author: { required: false, type: 'string', maxLength: 150 },
    template: { required: false, type: 'string', enum: ['classic', 'modern', 'minimal'] },
    chapterOrder: { required: false, type: 'array' },
  }),
  async (c) => {
    const user = c.get('user');
    const bookId = c.req.param('id');
    const body = c.get('body');
    const supabase = getSupabase(c.env);

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('books')
      .select('id, status')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: 'Book not found' }, 404);
    }

    // Don't allow edits to books that are already ordered
    if (existing.status === 'ordered' || existing.status === 'shipped') {
      return c.json({ error: 'Cannot modify a book that has already been ordered' }, 409);
    }

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.subtitle !== undefined) updatePayload.subtitle = body.subtitle;
    if (body.author !== undefined) updatePayload.author = body.author;
    if (body.template !== undefined) updatePayload.template = body.template;
    if (body.chapterOrder !== undefined) updatePayload.chapter_order = body.chapterOrder;

    // If anything changes, reset to draft (need to re-generate PDF)
    updatePayload.status = 'draft';

    const { data: updated, error: updateError } = await supabase
      .from('books')
      .update(updatePayload)
      .eq('id', bookId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update book:', updateError);
      return c.json({ error: 'Failed to update book' }, 500);
    }

    return c.json({
      id: updated.id,
      title: updated.title,
      subtitle: updated.subtitle,
      author: updated.author,
      template: updated.template,
      status: updated.status,
      updatedAt: updated.updated_at,
    });
  }
);

/**
 * POST /books/:id/generate
 * Generate print-ready interior and cover PDFs.
 */
books.post('/:id/generate', async (c) => {
  const user = c.get('user');
  const bookId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  // Fetch book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (bookError || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  // Update status to generating
  await supabase.from('books').update({ status: 'generating' }).eq('id', bookId);

  try {
    // Fetch collection items for this book's collection
    const { data: items, error: itemsError } = await supabase
      .from('collection_items')
      .select(`
        sort_order,
        scans (
          title,
          document_type,
          extracted_data
        )
      `)
      .eq('collection_id', book.collection_id)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      throw new Error('Failed to fetch collection items');
    }

    // If there's a chapter order, reorder items accordingly
    let orderedItems = items || [];
    if (book.chapter_order && Array.isArray(book.chapter_order)) {
      const itemMap = new Map();
      for (const item of orderedItems) {
        if (item.scans) {
          itemMap.set(item.scans.id || item.sort_order, item);
        }
      }
      // Reorder based on chapter_order, keep rest at the end
      const reordered = [];
      for (const itemId of book.chapter_order) {
        if (itemMap.has(itemId)) {
          reordered.push(itemMap.get(itemId));
          itemMap.delete(itemId);
        }
      }
      // Append remaining items
      for (const remaining of itemMap.values()) {
        reordered.push(remaining);
      }
      orderedItems = reordered;
    }

    const documents = orderedItems
      .filter((item) => item.scans?.extracted_data)
      .map((item) => ({
        ...item.scans.extracted_data,
        title: item.scans.title || item.scans.extracted_data.title || 'Untitled',
        type: item.scans.document_type || item.scans.extracted_data.type || 'document',
      }));

    if (documents.length === 0) {
      await supabase.from('books').update({ status: 'draft' }).eq('id', bookId);
      return c.json({ error: 'No documents found in the collection to generate a book' }, 400);
    }

    // Generate interior PDF
    const interiorPdf = await generateBookPdf(
      { title: book.title, subtitle: book.subtitle, author: book.author },
      documents,
      book.template || 'classic'
    );

    // Calculate page count (title + copyright + TOC + document pages)
    const pageCount = 3 + documents.length;

    // Generate cover PDF
    const coverPdf = await generateCoverPdf(
      { title: book.title, subtitle: book.subtitle, author: book.author },
      pageCount
    );

    // Store PDFs in R2
    const interiorKey = `${user.id}/books/${bookId}/interior.pdf`;
    const coverKey = `${user.id}/books/${bookId}/cover.pdf`;

    await env.PROCESSED.put(interiorKey, interiorPdf, {
      httpMetadata: { contentType: 'application/pdf' },
    });

    await env.PROCESSED.put(coverKey, coverPdf, {
      httpMetadata: { contentType: 'application/pdf' },
    });

    // Update book record
    const { data: updated, error: updateError } = await supabase
      .from('books')
      .update({
        status: 'ready',
        interior_pdf_key: interiorKey,
        cover_pdf_key: coverKey,
        page_count: pageCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update book record after PDF generation');
    }

    return c.json({
      id: updated.id,
      status: 'ready',
      pageCount,
      interiorPdfKey: interiorKey,
      coverPdfKey: coverKey,
      message: 'PDFs generated successfully. Book is ready for ordering.',
    });
  } catch (err) {
    console.error('Book generation error:', err);

    await supabase
      .from('books')
      .update({ status: 'error', error_message: err.message })
      .eq('id', bookId);

    return c.json({ error: 'Failed to generate book PDFs', details: err.message }, 500);
  }
});

/**
 * POST /books/:id/order
 * Create a Stripe Checkout session for a book order.
 * The actual Lulu print job is created by the webhook after payment succeeds.
 */
books.post(
  '/:id/order',
  validate({
    shippingAddress: { required: true, type: 'object' },
    quantity: { required: false, type: 'number', min: 1, max: 100 },
  }),
  async (c) => {
    const user = c.get('user');
    const bookId = c.req.param('id');
    const body = c.get('body');
    const env = c.env;
    const supabase = getSupabase(env);

    // Fetch book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !book) {
      return c.json({ error: 'Book not found' }, 404);
    }

    if (book.status !== 'ready') {
      return c.json(
        { error: `Book must be in "ready" status to order. Current status: ${book.status}` },
        400
      );
    }

    if (!book.interior_pdf_key || !book.cover_pdf_key) {
      return c.json({ error: 'Book PDFs have not been generated yet' }, 400);
    }

    // Validate shipping address
    const addr = body.shippingAddress;
    const requiredAddressFields = ['name', 'street1', 'city', 'state', 'postalCode', 'email'];
    const missingFields = requiredAddressFields.filter((f) => !addr[f]);
    if (missingFields.length > 0) {
      return c.json(
        { error: `Missing shipping address fields: ${missingFields.join(', ')}` },
        400
      );
    }

    try {
      const quantity = body.quantity || 1;

      // Create a Stripe Checkout session for the book order
      const session = await createBookCheckoutSession(
        user.id,
        book,
        addr,
        quantity,
        env
      );

      // Store the checkout session ID on the book record
      await supabase
        .from('books')
        .update({
          stripe_session_id: session.sessionId,
          payment_status: 'pending',
          shipping_address: addr,
          quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);

      return c.json({
        id: bookId,
        sessionId: session.sessionId,
        url: session.url,
        message: 'Checkout session created. Complete payment to place your order.',
      });
    } catch (err) {
      console.error('Book order checkout error:', err);
      return c.json({ error: 'Failed to create checkout session', details: err.message }, 500);
    }
  }
);

/**
 * GET /books/:id/status
 * Poll Lulu for the latest order status.
 */
books.get('/:id/status', async (c) => {
  const user = c.get('user');
  const bookId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  // Fetch book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (bookError || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  if (!book.lulu_order_id) {
    return c.json({
      id: book.id,
      status: book.status,
      message: 'No Lulu order has been placed for this book.',
    });
  }

  try {
    const orderStatus = await getOrderStatus(book.lulu_order_id, env);

    // Update local status if it changed
    const luluStatus = orderStatus.status;
    let localStatus = book.status;

    if (luluStatus === 'SHIPPED') localStatus = 'shipped';
    else if (luluStatus === 'PRODUCTION') localStatus = 'printing';
    else if (luluStatus === 'CANCELLED') localStatus = 'cancelled';

    if (localStatus !== book.status) {
      await supabase
        .from('books')
        .update({ status: localStatus, updated_at: new Date().toISOString() })
        .eq('id', bookId);
    }

    return c.json({
      id: book.id,
      status: localStatus,
      luluStatus: orderStatus.status,
      statusMessage: orderStatus.statusMessage,
      lineItems: orderStatus.lineItems,
      costs: orderStatus.costs,
      trackingInfo: orderStatus.lineItems
        ?.filter((li) => li.trackingId)
        .map((li) => ({
          trackingId: li.trackingId,
          trackingUrl: li.trackingUrl,
        })) || [],
    });
  } catch (err) {
    console.error('Failed to poll Lulu status:', err);
    return c.json(
      {
        id: book.id,
        status: book.status,
        error: 'Failed to fetch latest status from Lulu',
        details: err.message,
      },
      502
    );
  }
});

export default books;
