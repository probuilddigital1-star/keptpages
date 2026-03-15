/**
 * Books routes.
 * Manages book projects for print-on-demand via Lulu.
 * Handles creation, editing, PDF generation, ordering, and status polling.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { validate } from '../middleware/validate.js';
import { generateBookPdf, generateCoverPdf, renderBlueprintBook } from '../services/pdf.js';
import { loadAllFonts, fixCIDFontWidths } from '../services/fonts.js';
import { PDFDocument } from 'pdf-lib';
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
    template: { required: false, type: 'string', enum: ['classic', 'modern', 'minimal', 'heritage', 'garden', 'heirloom', 'parchment'] },
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
 * GET /books/orders
 * List user's paid book orders with status tracking.
 */
books.get('/orders', async (c) => {
  const user = c.get('user');
  const supabase = getSupabase(c.env);

  const { data: orders, error } = await supabase
    .from('books')
    .select('id, title, status, payment_status, lulu_order_id, quantity, shipping_address, print_options, page_count, error_message, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('payment_status', 'succeeded')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user orders:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }

  return c.json({
    orders: (orders || []).map((book) => ({
      id: book.id,
      title: book.title,
      status: book.status,
      paymentStatus: book.payment_status,
      luluOrderId: book.lulu_order_id,
      quantity: book.quantity,
      shippingAddress: book.shipping_address,
      printOptions: book.print_options,
      pageCount: book.page_count,
      errorMessage: book.error_message,
      createdAt: book.created_at,
      updatedAt: book.updated_at,
    })),
  });
});

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
    customization: book.customization || {},
    luluProjectId: book.lulu_project_id,
    luluOrderId: book.lulu_order_id,
    interiorPdfKey: book.interior_pdf_key,
    coverPdfKey: book.cover_pdf_key,
    pageCount: book.page_count,
    coverDesign: book.cover_design || {},
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
    template: { required: false, type: 'string', enum: ['classic', 'modern', 'minimal', 'heritage', 'garden', 'heirloom', 'parchment'] },
    chapterOrder: { required: false, type: 'array' },
    customization: { required: false, type: 'object' },
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
    if (body.customization !== undefined) {
      updatePayload.customization = body.customization;
      // Sync coverDesign title/subtitle/author to DB columns for consistency
      if (body.customization.coverDesign) {
        const cd = body.customization.coverDesign;
        if (cd.title) updatePayload.title = cd.title;
        if (cd.subtitle !== undefined) updatePayload.subtitle = cd.subtitle;
        if (cd.author !== undefined) updatePayload.author = cd.author;
      }
    }

    // Only reset to draft if non-customization fields changed (customization saves shouldn't reset status)
    const hasNonCustomizationChanges = body.title !== undefined || body.subtitle !== undefined ||
      body.author !== undefined || body.template !== undefined || body.chapterOrder !== undefined;
    if (hasNonCustomizationChanges) {
      updatePayload.status = 'draft';
    }

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
      customization: updated.customization || {},
      updatedAt: updated.updated_at,
    });
  }
);

/**
 * POST /books/:id/cover-photo
 * Upload a cover photo for the book.
 */
books.post('/:id/cover-photo', async (c) => {
  const user = c.get('user');
  const bookId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  // Verify ownership
  const { data: book, error } = await supabase
    .from('books')
    .select('id, cover_design')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (error || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  const formData = await c.req.formData();
  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return c.json({ error: 'No image file provided' }, 400);
  }

  // file.type might be empty for some uploads; infer from name if needed
  const mimeType = file.type || 'image/jpeg';
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    return c.json({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const photoKey = `${user.id}/books/${bookId}/cover-photo`;

  await env.PROCESSED.put(photoKey, buffer, {
    httpMetadata: { contentType: mimeType },
  });

  // Merge photo data into existing cover_design to preserve other fields
  await supabase
    .from('books')
    .update({
      cover_design: { ...(book.cover_design || {}), photoKey, photoMimeType: mimeType },
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId);

  return c.json({ photoKey, message: 'Cover photo uploaded successfully.' });
});

/**
 * POST /books/:id/images
 * Upload an additional image for use in the book designer.
 */
books.post('/:id/images', async (c) => {
  const user = c.get('user');
  const bookId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  // Verify ownership
  const { data: book, error } = await supabase
    .from('books')
    .select('id, customization')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (error || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  // Check image count limit
  const existing = book.customization?.additionalImages || [];
  if (existing.length >= 50) {
    return c.json({ error: 'Maximum 50 additional images per book' }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return c.json({ error: 'No image file provided' }, 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: 'Image must be under 10MB' }, 400);
  }

  const mimeType = file.type || 'image/jpeg';
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    return c.json({ error: 'Unsupported image type' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const ext = mimeType.split('/')[1] === 'png' ? 'png' : 'jpg';
  const imageId = crypto.randomUUID();
  const key = `${user.id}/books/${bookId}/images/${imageId}.${ext}`;

  await env.PROCESSED.put(key, buffer, {
    httpMetadata: { contentType: mimeType },
  });

  const imageData = {
    key,
    mimeType,
    originalName: file.name || `image.${ext}`,
  };

  return c.json(imageData, 201);
});

/**
 * DELETE /books/:id/images/:key
 * Delete an additional image from the book.
 */
books.delete('/:id/images/:key', async (c) => {
  const user = c.get('user');
  const bookId = c.req.param('id');
  const imageKey = decodeURIComponent(c.req.param('key'));
  const env = c.env;
  const supabase = getSupabase(env);

  // Verify ownership
  const { data: book, error } = await supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (error || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  // Verify the key belongs to this user/book
  if (!imageKey.startsWith(`${user.id}/books/${bookId}/images/`)) {
    return c.json({ error: 'Invalid image key' }, 403);
  }

  await env.PROCESSED.delete(imageKey);

  return c.json({ message: 'Image deleted' });
});

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

  // Always allow regeneration — a stuck 'generating' from a crashed Worker
  // should not block the user from trying again.

  // Mark as generating
  const { error: updateErr } = await supabase
    .from('books')
    .update({ status: 'generating', error_message: null, updated_at: new Date().toISOString() })
    .eq('id', bookId);

  if (updateErr) {
    console.error('[generate] Failed to set generating status:', updateErr);
  }

  // Define the generation work as a promise so we can both await it
  // AND register it with waitUntil as a safety net.
  const generateWork = async () => {
    // Fetch collection items for this book's collection
    const { data: items, error: itemsError } = await supabase
      .from('collection_items')
      .select(`
        sort_order,
        scans (
          id,
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
      const reordered = [];
      for (const itemId of book.chapter_order) {
        if (itemMap.has(itemId)) {
          reordered.push(itemMap.get(itemId));
          itemMap.delete(itemId);
        }
      }
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
      return { empty: true };
    }

    const blueprint = book.customization;
    const isBlueprint = blueprint?.pages?.length > 0;

    // Fetch cover photo from R2 if available
    let coverPhotoBytes = null;
    let coverPhotoMimeType = null;
    const photoKey = book.cover_design?.photoKey || blueprint?.coverDesign?.photoKey;
    if (photoKey) {
      try {
        const photoObj = await env.PROCESSED.get(photoKey);
        if (photoObj) {
          coverPhotoBytes = new Uint8Array(await photoObj.arrayBuffer());
          coverPhotoMimeType = book.cover_design?.photoMimeType || blueprint?.coverDesign?.photoMimeType || 'image/jpeg';
        }
      } catch (err) {
        console.error('Cover photo R2 fetch failed:', err?.message || err);
      }
    }

    let interiorPdf;
    let pageCount;

    if (isBlueprint) {
      const pdfDoc = await PDFDocument.create();

      const fontFamilies = new Set([blueprint.globalSettings?.fontFamily || 'fraunces']);
      for (const bpPage of blueprint.pages) {
        for (const el of bpPage.elements || []) {
          if (el.fontFamily) fontFamilies.add(el.fontFamily);
        }
      }

      const fontMap = await loadAllFonts(pdfDoc, [...fontFamilies], env);

      const imageKeys = new Set();
      for (const bpPage of blueprint.pages) {
        for (const el of bpPage.elements || []) {
          if (el.type === 'image' && el.imageKey) imageKeys.add(el.imageKey);
        }
      }

      const imageMap = {};
      const imagePromises = [...imageKeys].map(async (key) => {
        try {
          let obj = await env.PROCESSED.get(key);
          if (!obj) {
            obj = await env.UPLOADS.get(key);
          }
          if (obj) {
            const bytes = new Uint8Array(await obj.arrayBuffer());
            const mimeType = obj.httpMetadata?.contentType || 'image/jpeg';
            imageMap[key] = { bytes, mimeType };
          }
        } catch (err) {
          console.error(`Failed to fetch image ${key}:`, err?.message || err);
        }
      });
      await Promise.all(imagePromises);

      const coverPhotoData = coverPhotoBytes
        ? { bytes: coverPhotoBytes, mimeType: coverPhotoMimeType }
        : null;
      pageCount = await renderBlueprintBook(pdfDoc, blueprint, documents, imageMap, fontMap, coverPhotoData);

      interiorPdf = await fixCIDFontWidths(pdfDoc);
    } else {
      const bookMeta = {
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        _coverPhotoBytes: coverPhotoBytes,
        _coverPhotoMimeType: coverPhotoMimeType,
      };
      const templateToUse = book.template || 'classic';
      const result = await generateBookPdf(bookMeta, documents, templateToUse, env);
      interiorPdf = result.buffer;
      pageCount = result.pageCount;
    }

    // Lulu requires minimum pages (32 for PB, 24 for CW — pad to 32 to cover all bindings)
    const LULU_MIN_PAGES = 32;
    if (pageCount < LULU_MIN_PAGES) {
      const padDoc = await PDFDocument.load(interiorPdf);
      const firstPage = padDoc.getPages()[0];
      const { width, height } = firstPage ? firstPage.getSize() : { width: 612, height: 792 };
      while (padDoc.getPageCount() < LULU_MIN_PAGES) {
        padDoc.addPage([width, height]);
      }
      interiorPdf = await padDoc.save();
      pageCount = padDoc.getPageCount();
      console.log(`[generate] Padded interior PDF to ${pageCount} pages (Lulu minimum)`);
    }

    // Generate cover PDF
    const coverPdf = await generateCoverPdf({
      title: blueprint?.coverDesign?.title || book.title,
      subtitle: blueprint?.coverDesign?.subtitle || book.subtitle,
      author: blueprint?.coverDesign?.author || book.author,
      colorScheme: blueprint?.coverDesign?.colorScheme || 'default',
      layout: blueprint?.coverDesign?.layout || 'centered',
      photoBytes: coverPhotoBytes,
      photoMimeType: coverPhotoMimeType,
      fontFamily: isBlueprint ? (blueprint.globalSettings?.fontFamily || 'fraunces') : null,
    }, pageCount, isBlueprint ? env : null, 'CW');

    // Store PDFs in R2
    const interiorKey = `${user.id}/books/${bookId}/interior.pdf`;
    const coverKey = `${user.id}/books/${bookId}/cover.pdf`;

    await env.PROCESSED.put(interiorKey, interiorPdf, {
      httpMetadata: { contentType: 'application/pdf' },
    });

    await env.PROCESSED.put(coverKey, coverPdf, {
      httpMetadata: { contentType: 'application/pdf' },
    });

    // Update book record — generation complete
    const { error: finalUpdateErr } = await supabase
      .from('books')
      .update({
        status: 'ready',
        interior_pdf_key: interiorKey,
        cover_pdf_key: coverKey,
        page_count: pageCount,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId);

    if (finalUpdateErr) {
      console.error('[generate] Failed to update book to ready:', finalUpdateErr);
      // PDFs are in R2 but DB didn't update — throw so the catch sets error status
      throw new Error('PDF generated but failed to update book status');
    }

    console.log(`[generate] Book ${bookId} PDF generation complete: ${pageCount} pages`);
    return { status: 'ready', pageCount };
  };

  // Run generation with waitUntil as a safety net:
  // If the Worker gets killed mid-response (Cloudflare timeout), the promise
  // continues executing via waitUntil for up to 30 additional seconds.
  // The frontend detects the dropped connection and polls GET /status.
  const workPromise = generateWork().catch(async (err) => {
    console.error('[generate] Book generation error:', err);
    try {
      await supabase
        .from('books')
        .update({ status: 'error', error_message: err.message, updated_at: new Date().toISOString() })
        .eq('id', bookId);
    } catch (dbErr) {
      console.error('[generate] Failed to persist error status:', dbErr);
    }
    throw err;
  });

  // Register with waitUntil so the work continues even if the response is killed.
  // c.executionCtx throws in test environments (no Worker runtime), so guard with try/catch.
  try {
    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(workPromise.catch(() => {}));
    }
  } catch {
    // No ExecutionContext available (test environment) — skip waitUntil
  }

  try {
    const result = await workPromise;

    if (result.empty) {
      return c.json({ error: 'No documents found in the collection to generate a book' }, 400);
    }

    return c.json({
      id: bookId,
      status: 'ready',
      pageCount: result.pageCount,
    });
  } catch (err) {
    return c.json({ error: err.message || 'Failed to generate book PDFs' }, 500);
  }
});

/**
 * POST /books/:id/order
 * Create a Stripe Checkout session for a book order.
 * Accepts named book tier + addons instead of raw print options.
 * The actual Lulu print job is created by the webhook after payment succeeds.
 */
const VALID_BOOK_TIERS = ['classic', 'premium', 'heirloom'];
const VALID_ADDONS = ['glossy', 'coil', 'color'];

books.post(
  '/:id/order',
  validate({
    shippingAddress: { required: true, type: 'object' },
    quantity: { required: false, type: 'number', min: 1, max: 100 },
    bookTier: { required: false, type: 'string' },
    addons: { required: false, type: 'array' },
  }),
  async (c) => {
    const user = c.get('user');
    const bookId = c.req.param('id');
    const body = c.get('body');
    const env = c.env;
    const supabase = getSupabase(env);

    const bookTier = body.bookTier || 'classic';
    const addons = body.addons || [];

    // Validate book tier
    if (!VALID_BOOK_TIERS.includes(bookTier)) {
      return c.json({ error: `Invalid book tier: ${bookTier}. Allowed: ${VALID_BOOK_TIERS.join(', ')}` }, 400);
    }

    // Validate addons
    const invalidAddons = addons.filter(a => !VALID_ADDONS.includes(a));
    if (invalidAddons.length > 0) {
      return c.json({ error: `Invalid addons: ${invalidAddons.join(', ')}. Allowed: ${VALID_ADDONS.join(', ')}` }, 400);
    }

    // Color addon only valid for classic tier
    if (addons.includes('color') && bookTier !== 'classic') {
      return c.json({ error: 'Color interior add-on is only available for the Classic tier' }, 400);
    }

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

    // Lulu page count limits vary by binding type
    const PAGE_LIMITS = { PB: { min: 32, max: 800 }, CW: { min: 24, max: 800 }, CO: { min: 2, max: 470 } };
    const binding = addons.includes('coil') ? 'CO' : (bookTier === 'classic' ? 'PB' : 'CW');
    const limits = PAGE_LIMITS[binding];
    if (book.page_count < limits.min) {
      return c.json(
        { error: `Your book has ${book.page_count} pages, but the minimum for ${binding === 'PB' ? 'softcover' : binding === 'CW' ? 'hardcover' : 'coil'} printing is ${limits.min} pages. Please add more content and regenerate.` },
        400
      );
    }
    if (book.page_count > limits.max) {
      return c.json(
        { error: `Your book has ${book.page_count} pages, but the maximum for ${binding === 'PB' ? 'softcover' : binding === 'CW' ? 'hardcover' : 'coil'} printing is ${limits.max} pages. Please split into multiple volumes.` },
        400
      );
    }

    if (!book.interior_pdf_key || !book.cover_pdf_key) {
      return c.json({ error: 'Book PDFs have not been generated yet' }, 400);
    }

    // Validate shipping address
    const addr = body.shippingAddress;
    const requiredAddressFields = ['name', 'street1', 'city', 'state', 'postalCode', 'email', 'phone'];
    const missingFields = requiredAddressFields.filter((f) => !addr[f]);
    if (missingFields.length > 0) {
      return c.json(
        { error: `Missing shipping address fields: ${missingFields.join(', ')}` },
        400
      );
    }

    try {
      const quantity = body.quantity || 1;

      // Store book tier + addons on the book record
      await supabase
        .from('books')
        .update({ print_options: { bookTier, addons } })
        .eq('id', bookId);

      // Create a Stripe Checkout session for the book order
      const session = await createBookCheckoutSession(
        user.id,
        book,
        addr,
        quantity,
        env,
        bookTier,
        addons
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
 * GET /books/:id/preview
 * Download the generated interior PDF for preview.
 * The cover PDF is a separate print-only wrap-around (front+spine+back)
 * and is not included here — the interior already has a title page.
 */
books.get('/:id/preview', async (c) => {
  const user = c.get('user');
  const bookId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  const { data: book, error } = await supabase
    .from('books')
    .select('id, user_id, interior_pdf_key, title, status')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (error || !book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  if (!book.interior_pdf_key) {
    return c.json({ error: 'PDF has not been generated yet' }, 400);
  }

  // Tier-based preview gating
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier || 'free';
  if (userTier === 'free') {
    return c.json({ error: 'PDF preview not available. Order a book or get Keeper Pass.' }, 403);
  }
  // book_purchaser: allow preview for paid books
  if (userTier === 'book_purchaser') {
    const { data: bookRecord } = await supabase
      .from('books')
      .select('payment_status')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();
    if (bookRecord?.payment_status !== 'succeeded') {
      return c.json({ error: 'PDF preview available after book purchase.' }, 403);
    }
  }

  const obj = await env.PROCESSED.get(book.interior_pdf_key);
  if (!obj) {
    return c.json({ error: 'PDF file not found in storage' }, 404);
  }

  const filename = `${(book.title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_')}_preview.pdf`;

  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
});

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

  // Base response with order details (always returned)
  const baseResponse = {
    id: book.id,
    status: book.status,
    pageCount: book.page_count || null,
    errorMessage: book.error_message || null,
    paymentStatus: book.payment_status || null,
    shippingAddress: book.shipping_address || null,
    quantity: book.quantity || null,
    printOptions: book.print_options || null,
    orderCost: book.order_cost || null,
  };

  if (!book.lulu_order_id) {
    return c.json({
      ...baseResponse,
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
      ...baseResponse,
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
    // For mock orders, return tracking info from shipping_address if available
    if (book.lulu_order_id?.startsWith('mock-')) {
      const trackingInfo = [];
      if (book.shipping_address?.trackingId) {
        trackingInfo.push({
          trackingId: book.shipping_address.trackingId,
          trackingUrl: book.shipping_address.trackingUrl || null,
        });
      }
      return c.json({
        ...baseResponse,
        luluStatus: book.status.toUpperCase(),
        statusMessage: `Mock order - status: ${book.status}`,
        trackingInfo,
      });
    }

    return c.json(
      {
        ...baseResponse,
        error: 'Failed to fetch latest status from Lulu',
        details: err.message,
      },
      502
    );
  }
});

export default books;
