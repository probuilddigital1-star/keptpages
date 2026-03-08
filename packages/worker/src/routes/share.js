/**
 * Share routes.
 * Handles generating share links for collections and
 * serving shared collections publicly (no auth required for viewing).
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { validate } from '../middleware/validate.js';

const share = new Hono();

function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * POST /share
 * Generate a share link with a unique token and configurable permissions.
 * Requires authentication.
 */
share.post(
  '/',
  validate({
    collectionId: { required: true, type: 'string' },
    permissions: { required: false, type: 'object' },
    expiresInDays: { required: false, type: 'number', min: 1, max: 365 },
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

    // Generate a unique share token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);

    // Whitelist allowed permissions — canView is always true (server invariant)
    const permissions = {
      canView: true,
      canDownload: body.permissions?.canDownload === true,
    };

    // Calculate expiration
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: shareRecord, error: createError } = await supabase
      .from('shares')
      .insert({
        user_id: user.id,
        collection_id: body.collectionId,
        token,
        permissions,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create share link:', createError);
      return c.json({ error: 'Failed to create share link' }, 500);
    }

    const appUrl = c.env.APP_URL || 'https://keptpages.com';
    const shareUrl = `${appUrl}/shared/${token}`;

    return c.json(
      {
        id: shareRecord.id,
        token,
        url: shareUrl,
        collectionId: body.collectionId,
        collectionName: collection.name,
        permissions,
        expiresAt,
        createdAt: shareRecord.created_at,
      },
      201
    );
  }
);

/**
 * GET /share
 * List all share links for the authenticated user.
 * Optionally filter by collectionId query param.
 */
share.get('/', async (c) => {
  const user = c.get('user');
  const supabase = getSupabase(c.env);
  const collectionId = c.req.query('collectionId');

  let query = supabase
    .from('shares')
    .select('id, token, collection_id, permissions, expires_at, view_count, created_at, collections(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (collectionId) {
    query = query.eq('collection_id', collectionId);
  }

  const { data: shares, error } = await query;

  if (error) {
    console.error('Failed to fetch shares:', error);
    return c.json({ error: 'Failed to fetch share links' }, 500);
  }

  const appUrl = c.env.APP_URL || 'https://keptpages.com';

  return c.json({
    shares: (shares || []).map((s) => ({
      id: s.id,
      token: s.token,
      url: `${appUrl}/shared/${s.token}`,
      collectionId: s.collection_id,
      collectionName: s.collections?.name || null,
      permissions: s.permissions,
      expiresAt: s.expires_at,
      viewCount: s.view_count,
      createdAt: s.created_at,
    })),
  });
});

/**
 * DELETE /share/:id
 * Revoke a share link.
 */
share.delete('/:id', async (c) => {
  const user = c.get('user');
  const shareId = c.req.param('id');
  const supabase = getSupabase(c.env);

  const { error } = await supabase
    .from('shares')
    .delete()
    .eq('id', shareId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete share:', error);
    return c.json({ error: 'Failed to revoke share link' }, 500);
  }

  return c.json({ message: 'Share link revoked' });
});

/**
 * GET /shared/:token
 * View a shared collection. This is a PUBLIC endpoint (no auth required).
 */
share.get('/shared/:token', async (c) => {
  const token = c.req.param('token');
  const supabase = getSupabase(c.env);

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

export default share;
