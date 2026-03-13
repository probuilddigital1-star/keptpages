/**
 * Collections routes.
 * Manages user collections (groups of scanned documents) with
 * free tier limit checks and PDF export functionality.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { validate } from '../middleware/validate.js';

const collections = new Hono();

// Free tier limits
const FREE_TIER_MAX_COLLECTIONS = 5;

/**
 * Helper to get a Supabase client from the worker environment.
 */
function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * Check if user is on the free tier.
 */
async function isFreeTier(supabase, userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();

  if (!profile) return true;
  return profile.tier !== 'keeper';
}

/**
 * GET /collections
 * List all collections for the authenticated user with item counts.
 */
collections.get('/', async (c) => {
  const user = c.get('user');
  const supabase = getSupabase(c.env);

  // Fetch collections with document counts
  const { data, error } = await supabase
    .from('collections')
    .select(`
      id,
      name,
      description,
      cover_image_url,
      created_at,
      updated_at,
      collection_items ( count )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch collections:', error);
    return c.json({ error: 'Failed to fetch collections' }, 500);
  }

  const result = (data || []).map((col) => ({
    id: col.id,
    name: col.name,
    description: col.description,
    coverImageUrl: col.cover_image_url,
    itemCount: col.collection_items?.[0]?.count || 0,
    createdAt: col.created_at,
    updatedAt: col.updated_at,
  }));

  return c.json({ collections: result });
});

/**
 * POST /collections
 * Create a new collection (checks free tier limits).
 */
collections.post(
  '/',
  validate({
    name: { required: true, type: 'string', maxLength: 100, minLength: 1 },
    description: { required: false, type: 'string', maxLength: 500 },
  }),
  async (c) => {
    const user = c.get('user');
    const body = c.get('body');
    const supabase = getSupabase(c.env);

    // Check free tier limits
    const freeTier = await isFreeTier(supabase, user.id);
    if (freeTier) {
      const { count, error: countError } = await supabase
        .from('collections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Failed to count collections:', countError);
        return c.json({ error: 'Failed to check collection limits', message: 'Failed to check collection limits' }, 500);
      }

      if (count >= FREE_TIER_MAX_COLLECTIONS) {
        return c.json(
          {
            error: 'Collection limit reached',
            message: `Free tier allows up to ${FREE_TIER_MAX_COLLECTIONS} collections. Upgrade to Keeper for unlimited collections.`,
            limit: FREE_TIER_MAX_COLLECTIONS,
            current: count,
          },
          403
        );
      }
    }

    const { data: collection, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create collection:', error);
      return c.json({ error: 'Failed to create collection', message: error.message || 'Failed to create collection' }, 500);
    }

    return c.json(
      {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        createdAt: collection.created_at,
      },
      201
    );
  }
);

/**
 * GET /collections/:id
 * Get a collection with its documents/scans.
 */
collections.get('/:id', async (c) => {
  const user = c.get('user');
  const collectionId = c.req.param('id');
  const supabase = getSupabase(c.env);

  // Fetch the collection
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (colError || !collection) {
    return c.json({ error: 'Collection not found' }, 404);
  }

  // Fetch items in this collection with their scan data
  const { data: items, error: itemsError } = await supabase
    .from('collection_items')
    .select(`
      id,
      sort_order,
      section_title,
      created_at,
      scans:scan_id (
        id,
        title,
        document_type,
        confidence_score,
        extracted_data,
        original_filename,
        additional_r2_keys,
        r2_key,
        status,
        created_at
      )
    `)
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Failed to fetch collection items:', itemsError);
    return c.json({ error: 'Failed to fetch collection items' }, 500);
  }

  return c.json({
    id: collection.id,
    name: collection.name,
    description: collection.description,
    coverImageUrl: collection.cover_image_url,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    items: (items || []).map((item) => {
      const pageCount = item.scans
        ? 1 + (Array.isArray(item.scans.additional_r2_keys) ? item.scans.additional_r2_keys.length : 0)
        : 1;
      return {
        id: item.id,
        position: item.sort_order,
        sectionTitle: item.section_title,
        addedAt: item.created_at,
        scan: item.scans
          ? {
              id: item.scans.id,
              title: item.scans.title,
              documentType: item.scans.document_type,
              confidence: item.scans.confidence_score,
              extractedData: item.scans.extracted_data,
              originalFilename: item.scans.original_filename,
              r2Key: item.scans.r2_key,
              status: item.scans.status,
              pageCount,
              createdAt: item.scans.created_at,
            }
          : null,
      };
    }),
  });
});

/**
 * PUT /collections/:id
 * Update a collection's name or description.
 */
collections.put(
  '/:id',
  validate({
    name: { required: false, type: 'string', maxLength: 100 },
    description: { required: false, type: 'string', maxLength: 500 },
  }),
  async (c) => {
    const user = c.get('user');
    const collectionId = c.req.param('id');
    const body = c.get('body');
    const supabase = getSupabase(c.env);

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.description !== undefined) updatePayload.description = body.description;

    const { data: updated, error: updateError } = await supabase
      .from('collections')
      .update(updatePayload)
      .eq('id', collectionId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update collection:', updateError);
      return c.json({ error: 'Failed to update collection' }, 500);
    }

    return c.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      updatedAt: updated.updated_at,
    });
  }
);

/**
 * DELETE /collections/:id
 * Delete a collection and all its items.
 */
collections.delete('/:id', async (c) => {
  const user = c.get('user');
  const collectionId = c.req.param('id');
  const supabase = getSupabase(c.env);

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) {
    return c.json({ error: 'Collection not found' }, 404);
  }

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId);

  if (error) {
    console.error('Failed to delete collection:', error);
    return c.json({ error: 'Failed to delete collection' }, 500);
  }

  return c.json({ message: 'Collection deleted' });
});

/**
 * POST /collections/:id/documents
 * Add a scan to a collection.
 * Body: { documentId: "<scan UUID>", sortOrder?: number }
 */
collections.post('/:id/documents', async (c) => {
  const user = c.get('user');
  const collectionId = c.req.param('id');
  const supabase = getSupabase(c.env);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const scanId = body.documentId;
  if (!scanId) {
    return c.json({ error: 'documentId is required' }, 400);
  }

  // Verify collection ownership
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (colError || !collection) {
    return c.json({ error: 'Collection not found' }, 404);
  }

  // Verify scan ownership
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('id')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (scanError || !scan) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  // Determine sort_order: use provided value or append at end
  let sortOrder = body.sortOrder;
  if (sortOrder === undefined || sortOrder === null) {
    const { data: maxItem } = await supabase
      .from('collection_items')
      .select('sort_order')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    sortOrder = (maxItem?.sort_order ?? -1) + 1;
  }

  const { data: item, error: insertError } = await supabase
    .from('collection_items')
    .insert({
      collection_id: collectionId,
      scan_id: scanId,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (insertError) {
    // Unique constraint violation = scan already in collection
    if (insertError.code === '23505') {
      return c.json({ error: 'Scan is already in this collection' }, 409);
    }
    console.error('Failed to add to collection:', insertError);
    return c.json({ error: 'Failed to add to collection' }, 500);
  }

  // Touch collection updated_at
  await supabase
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', collectionId);

  return c.json(
    {
      id: item.id,
      collectionId,
      scanId,
      sortOrder: item.sort_order,
      addedAt: item.created_at,
    },
    201
  );
});

/**
 * DELETE /collections/:id/documents/:scanId
 * Remove a scan from a collection.
 */
collections.delete('/:id/documents/:scanId', async (c) => {
  const user = c.get('user');
  const collectionId = c.req.param('id');
  const scanId = c.req.param('scanId');
  const supabase = getSupabase(c.env);

  // Verify collection ownership
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (colError || !collection) {
    return c.json({ error: 'Collection not found' }, 404);
  }

  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('scan_id', scanId);

  if (error) {
    console.error('Failed to remove from collection:', error);
    return c.json({ error: 'Failed to remove from collection' }, 500);
  }

  // Touch collection updated_at
  await supabase
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', collectionId);

  return c.json({ message: 'Removed from collection' });
});

/**
 * PUT /collections/:id/reorder
 * Reorder items in a collection.
 * Body: { orderedIds: ["scan-uuid-1", "scan-uuid-2", ...] }
 */
collections.put('/:id/reorder', async (c) => {
  const user = c.get('user');
  const collectionId = c.req.param('id');
  const supabase = getSupabase(c.env);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { orderedIds } = body;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return c.json({ error: 'orderedIds array is required' }, 400);
  }

  // Verify collection ownership
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (colError || !collection) {
    return c.json({ error: 'Collection not found' }, 404);
  }

  // Update sort_order for each item
  const updates = orderedIds.map((scanId, index) =>
    supabase
      .from('collection_items')
      .update({ sort_order: index })
      .eq('collection_id', collectionId)
      .eq('scan_id', scanId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) {
    console.error('Failed to reorder:', failed.error);
    return c.json({ error: 'Failed to reorder items' }, 500);
  }

  // Touch collection updated_at
  await supabase
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', collectionId);

  return c.json({ message: 'Reordered successfully' });
});

/**
 * POST /collections/:id/export
 * Generate a PDF export of the collection.
 */
collections.post('/:id/export', async (c) => {
  const user = c.get('user');
  const collectionId = c.req.param('id');
  const supabase = getSupabase(c.env);

  // Parse optional export options from request body
  let body = {};
  try {
    body = await c.req.json();
  } catch {
    // No body or invalid JSON — use defaults
  }

  const {
    template,
    fontFamily,
    includeTitlePage,
    includeCopyright,
    includeToc,
    showPageNumbers,
    includeOriginalScans,
    documentIds,
  } = body;

  // Verify ownership and fetch collection
  const { data: collection, error: colError } = await supabase
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (colError || !collection) {
    return c.json({ error: 'Collection not found' }, 404);
  }

  // Fetch items with extracted data (include r2_key/mime_type for scan image embedding)
  const { data: items, error: itemsError } = await supabase
    .from('collection_items')
    .select(`
      sort_order,
      scan_id,
      scans:scan_id (
        title,
        document_type,
        extracted_data,
        r2_key,
        mime_type
      )
    `)
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Failed to fetch items for export:', itemsError);
    return c.json({ error: 'Failed to prepare export' }, 500);
  }

  // Prepare documents for PDF generation
  let documents = (items || [])
    .filter((item) => item.scans?.extracted_data)
    .map((item) => ({
      ...item.scans.extracted_data,
      _scanId: item.scan_id,
      _r2Key: item.scans.r2_key || null,
      _mimeType: item.scans.mime_type || null,
      title: item.scans.title || item.scans.extracted_data.title || 'Untitled',
      type: item.scans.document_type || item.scans.extracted_data.type || 'document',
    }));

  // Filter and reorder by documentIds if provided
  if (Array.isArray(documentIds) && documentIds.length > 0) {
    const docMap = new Map(documents.map((d) => [d._scanId, d]));
    const filtered = documentIds
      .filter((id) => docMap.has(id))
      .map((id) => docMap.get(id));

    if (filtered.length === 0) {
      return c.json({ error: 'None of the specified documentIds match items in this collection' }, 400);
    }
    documents = filtered;
  }

  // Fetch scan images from R2 if requested (US-EXPORT-9)
  if (includeOriginalScans && c.env.UPLOADS) {
    const MAX_IMAGES = 30;
    const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB
    let totalBytes = 0;
    let imageCount = 0;

    for (const doc of documents) {
      if (!doc._r2Key || imageCount >= MAX_IMAGES || totalBytes >= MAX_TOTAL_BYTES) continue;

      // Only support JPEG and PNG (pdf-lib limitation)
      const mime = (doc._mimeType || '').toLowerCase();
      if (mime && !mime.includes('jpeg') && !mime.includes('jpg') && !mime.includes('png')) continue;

      try {
        const r2Object = await c.env.UPLOADS.get(doc._r2Key);
        if (r2Object) {
          const bytes = await r2Object.arrayBuffer();
          if (totalBytes + bytes.byteLength <= MAX_TOTAL_BYTES) {
            doc._imageBytes = new Uint8Array(bytes);
            doc._mimeType = mime.includes('png') ? 'image/png' : 'image/jpeg';
            totalBytes += bytes.byteLength;
            imageCount++;
          }
        }
      } catch {
        // Graceful fallback: skip this image and continue
      }
    }
  }

  // Remove internal ID fields before passing to PDF (_imageBytes and _mimeType are kept for PDF image embedding)
  documents = documents.map(({ _scanId, _r2Key, ...rest }) => rest);

  if (documents.length === 0) {
    return c.json({ error: 'No documents to export in this collection' }, 400);
  }

  // Build options, only including explicitly set values
  const pdfOptions = {};
  if (template !== undefined) pdfOptions.template = template;
  if (fontFamily !== undefined) pdfOptions.fontFamily = fontFamily;
  if (includeTitlePage !== undefined) pdfOptions.includeTitlePage = includeTitlePage;
  if (includeCopyright !== undefined) pdfOptions.includeCopyright = includeCopyright;
  if (includeToc !== undefined) pdfOptions.includeToc = includeToc;
  if (showPageNumbers !== undefined) pdfOptions.showPageNumbers = showPageNumbers;

  try {
    // Dynamic import to avoid loading pdf-lib unless needed
    const { generateBookPdf } = await import('../services/pdf.js');

    const { buffer: pdfBuffer } = await generateBookPdf(
      {
        title: collection.name,
        subtitle: collection.description || '',
        author: user.email,
      },
      documents,
      pdfOptions,
      c.env,
    );

    // Store the PDF in R2
    const exportKey = `${user.id}/exports/${collectionId}-${Date.now()}.pdf`;
    await c.env.PROCESSED.put(exportKey, pdfBuffer, {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: {
        userId: user.id,
        collectionId,
        collectionName: collection.name,
      },
    });

    return c.json({
      message: 'PDF export generated successfully',
      url: `/collections/${collectionId}/download/${exportKey}`,
      exportKey,
      documentCount: documents.length,
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return c.json({ error: 'Failed to generate PDF export', details: err.message }, 500);
  }
});

/**
 * GET /collections/:id/download/:key+
 * Serve a PDF export file from R2.
 */
collections.get('/:id/download/:key{.+}', async (c) => {
  const user = c.get('user');
  const key = c.req.param('key');

  // Ensure the user can only download their own exports
  // Block path traversal sequences before checking ownership
  if (key.includes('..') || key.includes('%2e') || key.includes('%2E')) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  if (!key.startsWith(`${user.id}/exports/`)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const object = await c.env.PROCESSED.get(key);
  if (!object) {
    return c.json({ error: 'Export not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `attachment; filename="keptpages-collection.pdf"`);
  return new Response(object.body, { headers });
});

export default collections;
