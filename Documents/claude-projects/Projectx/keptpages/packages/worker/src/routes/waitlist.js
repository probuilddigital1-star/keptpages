/**
 * Waitlist routes.
 * Public endpoint for collecting email signups during pre-launch.
 * No authentication required.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { validate } from '../middleware/validate.js';

const waitlist = new Hono();

function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * POST /waitlist
 * Save an email address to the waitlist table.
 */
waitlist.post(
  '/',
  validate({
    email: { required: true, type: 'email', maxLength: 320 },
    source: { required: false, type: 'string', maxLength: 50 },
    referral: { required: false, type: 'string', maxLength: 100 },
  }),
  async (c) => {
    const body = c.get('body');
    const supabase = getSupabase(c.env);

    // Normalize email
    const email = body.email.toLowerCase().trim();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, created_at')
      .eq('email', email)
      .single();

    if (existing) {
      return c.json({
        message: 'You are already on the waitlist!',
        alreadyRegistered: true,
        joinedAt: existing.created_at,
      });
    }

    // Insert new waitlist entry
    const { data: entry, error } = await supabase
      .from('waitlist')
      .insert({
        email,
        source: body.source || 'website',
        referral_code: body.referral || null,
        ip_address: c.req.header('CF-Connecting-IP') || null,
        user_agent: c.req.header('User-Agent') || null,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation gracefully
      if (error.code === '23505') {
        return c.json({
          message: 'You are already on the waitlist!',
          alreadyRegistered: true,
        });
      }

      console.error('Failed to add to waitlist:', error);
      return c.json({ error: 'Failed to join waitlist' }, 500);
    }

    // Get waitlist position (count of entries before this one)
    const { count } = await supabase
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .lte('created_at', entry.created_at);

    return c.json(
      {
        message: 'Welcome to the waitlist! We will notify you when KeptPages launches.',
        position: count || 0,
        joinedAt: entry.created_at,
      },
      201
    );
  }
);

export default waitlist;
