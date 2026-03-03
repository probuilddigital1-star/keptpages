/**
 * User routes.
 * Profile management, avatar upload, data export, account deletion.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';

const user = new Hono();

function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * GET /user/profile
 * Returns the user's profile, subscription info, and usage stats.
 * Used by subscriptionStore.fetchSubscription() and Settings page.
 */
user.get('/profile', async (c) => {
  const authUser = c.get('user');
  const supabase = getSupabase(c.env);

  // Fetch profile (including Stripe/subscription fields from migration 009)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, tier, scan_count, collection_count, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_plan, subscription_period_end, subscription_updated_at, created_at, updated_at')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    console.error('Failed to fetch profile:', profileError);
    return c.json({ error: 'Profile not found' }, 404);
  }

  // Fetch subscription (if any)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at')
    .eq('user_id', authUser.id)
    .eq('status', 'active')
    .maybeSingle();

  return c.json({
    id: profile.id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    tier: profile.tier,
    email: authUser.email,
    usage: {
      scans: profile.scan_count,
      collections: profile.collection_count,
    },
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          plan: profile.subscription_plan || null,
          tier: profile.tier,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end || profile.subscription_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : profile.subscription_status && profile.subscription_status !== 'none'
        ? {
            id: null,
            status: profile.subscription_status,
            plan: profile.subscription_plan || null,
            tier: profile.tier,
            currentPeriodEnd: profile.subscription_period_end,
            cancelAtPeriodEnd: false,
          }
        : null,
    stripeCustomerId: profile.stripe_customer_id || null,
    createdAt: profile.created_at,
  });
});

/**
 * PUT /user/profile
 * Update display name and/or avatar URL.
 */
user.put('/profile', async (c) => {
  const authUser = c.get('user');
  const supabase = getSupabase(c.env);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const updates = {};
  if (body.name !== undefined) {
    updates.display_name = body.name;
  }
  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url;
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', authUser.id)
    .select('id, display_name, avatar_url, tier')
    .single();

  if (error) {
    console.error('Failed to update profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }

  return c.json({
    id: updated.id,
    displayName: updated.display_name,
    avatarUrl: updated.avatar_url,
    tier: updated.tier,
  });
});

/**
 * POST /user/avatar
 * Upload avatar image to R2, return public URL.
 */
user.post('/avatar', async (c) => {
  const authUser = c.get('user');
  const supabase = getSupabase(c.env);

  let formData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('image') || formData.get('file');
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, 400);
  }

  // Validate file size (2MB max for avatars)
  const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_AVATAR_SIZE) {
    return c.json({ error: 'File too large. Maximum 2MB for avatars.' }, 413);
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const r2Key = `avatars/${authUser.id}.${ext}`;

  try {
    const arrayBuffer = await file.arrayBuffer();

    await c.env.UPLOADS.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    // Build a public URL for the avatar
    // In production this would use a custom domain or R2 public access
    const avatarUrl = `/api/user/avatar/${authUser.id}`;

    // Update the profile with the new avatar URL
    await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', authUser.id);

    return c.json({ url: avatarUrl, r2Key });
  } catch (err) {
    console.error('Failed to upload avatar:', err);
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

/**
 * GET /user/avatar/:userId
 * Serve avatar image from R2. Public endpoint (called by img src).
 */
user.get('/avatar/:userId', async (c) => {
  const userId = c.req.param('userId');

  // Try common extensions
  for (const ext of ['jpg', 'png', 'webp', 'gif']) {
    const key = `avatars/${userId}.${ext}`;
    const object = await c.env.UPLOADS.get(key);
    if (object) {
      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=3600');
      return new Response(object.body, { headers });
    }
  }

  return c.json({ error: 'Avatar not found' }, 404);
});

/**
 * POST /user/export
 * Export all user data as a JSON file stored in R2.
 * Returns a temporary download URL.
 */
user.post('/export', async (c) => {
  const authUser = c.get('user');
  const supabase = getSupabase(c.env);

  try {
    // Fetch all user data
    const [profileRes, scansRes, collectionsRes, itemsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single(),
      supabase
        .from('scans')
        .select('*')
        .eq('user_id', authUser.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('collections')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('collection_items')
        .select('*, collections!inner(user_id)')
        .eq('collections.user_id', authUser.id),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profileRes.data,
      scans: scansRes.data || [],
      collections: collectionsRes.data || [],
      collectionItems: itemsRes.data || [],
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const r2Key = `exports/${authUser.id}/${Date.now()}-export.json`;

    await c.env.PROCESSED.put(r2Key, jsonStr, {
      httpMetadata: { contentType: 'application/json' },
    });

    // Return a temporary download endpoint
    return c.json({
      url: `/api/user/export/${encodeURIComponent(r2Key)}`,
      size: jsonStr.length,
      exportedAt: exportData.exportedAt,
    });
  } catch (err) {
    console.error('Failed to export data:', err);
    return c.json({ error: 'Failed to export data' }, 500);
  }
});

/**
 * GET /user/export/:key+
 * Serve an export file from R2 as a download.
 */
user.get('/export/:key{.+}', async (c) => {
  const authUser = c.get('user');
  const key = c.req.param('key');

  // Ensure the user can only download their own exports
  if (!key.startsWith(`exports/${authUser.id}/`)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const object = await c.env.PROCESSED.get(key);
  if (!object) {
    return c.json({ error: 'Export not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Disposition', `attachment; filename="keptpages-export.json"`);
  return new Response(object.body, { headers });
});

/**
 * DELETE /user/account
 * Delete the user's account and all associated data.
 * Supabase cascade deletes handle most cleanup.
 */
user.delete('/account', async (c) => {
  const authUser = c.get('user');
  const supabase = getSupabase(c.env);

  try {
    // Delete scans from R2 first
    const { data: scans } = await supabase
      .from('scans')
      .select('r2_key, processed_key')
      .eq('user_id', authUser.id);

    if (scans?.length) {
      const r2Keys = scans
        .flatMap((s) => [s.r2_key, s.processed_key])
        .filter(Boolean);

      // Delete R2 objects in batches
      for (const key of r2Keys) {
        await c.env.UPLOADS.delete(key).catch(() => {});
        await c.env.PROCESSED.delete(key).catch(() => {});
      }
    }

    // Delete avatar from R2
    for (const ext of ['jpg', 'png', 'webp', 'gif']) {
      await c.env.UPLOADS.delete(`avatars/${authUser.id}.${ext}`).catch(() => {});
    }

    // Delete the user from Supabase Auth (cascades to profiles and all related data)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);

    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      return c.json({ error: 'Failed to delete account' }, 500);
    }

    return c.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Account deletion failed:', err);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default user;
