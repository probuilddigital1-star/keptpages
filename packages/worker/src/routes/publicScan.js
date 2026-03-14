/**
 * Public scan routes (no auth required).
 * Allows anonymous users to scan up to 5 recipes per 24h, rate-limited by IP.
 */

import { Hono } from 'hono';
import { sendToGemini } from '../services/gemini.js';

const publicScan = new Hono();

const MAX_ANON_SCANS = 5;
const WINDOW_SECONDS = 86400; // 24 hours
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * POST /public/scan
 * Upload and process a scan without authentication.
 * Rate limited to 5 per IP per 24 hours via KV.
 */
publicScan.post('/', async (c) => {
  const env = c.env;
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'unknown';
  const kv = env.RATE_LIMIT;

  // Rate limit check
  if (kv) {
    const kvKey = `anon-scan:${ip}`;
    const existing = await kv.get(kvKey, { type: 'json' });
    const count = existing?.count || 0;

    if (count >= MAX_ANON_SCANS) {
      return c.json({
        error: 'Anonymous scan limit reached',
        message: `You've used all ${MAX_ANON_SCANS} free scans. Create a free account for 25 scans/month.`,
        limit: MAX_ANON_SCANS,
        used: count,
      }, 429);
    }

    // Increment count
    await kv.put(kvKey, JSON.stringify({ count: count + 1 }), {
      expirationTtl: WINDOW_SECONDS,
    });
  }

  // Parse multipart form data
  let formData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return c.json({ error: 'No image file provided' }, 400);
  }

  const mimeType = file.type || 'image/jpeg';
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return c.json({ error: 'Unsupported file type' }, 400);
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File too large (max 20MB)' }, 400);
  }

  const buffer = await file.arrayBuffer();

  // Store temporarily in R2 (anonymous prefix)
  const ipHash = await hashIp(ip);
  const timestamp = Date.now();
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const r2Key = `anonymous/${ipHash}/${timestamp}.${ext}`;

  if (env.UPLOADS) {
    await env.UPLOADS.put(r2Key, buffer, {
      httpMetadata: { contentType: mimeType },
    });
  }

  // Process with Gemini AI
  try {
    const result = await sendToGemini([{ buffer, mimeType }], env);

    // Get remaining scan count
    let remaining = MAX_ANON_SCANS;
    if (kv) {
      const kvKey = `anon-scan:${ip}`;
      const data = await kv.get(kvKey, { type: 'json' });
      remaining = MAX_ANON_SCANS - (data?.count || 0);
    }

    return c.json({
      ...result,
      _anonymous: true,
      _remaining: remaining,
      _r2Key: r2Key,
    });
  } catch (err) {
    console.error('Anonymous scan AI processing failed:', err);
    return c.json({ error: 'AI processing failed. Please try again.' }, 500);
  }
});

/**
 * Hash an IP address for use as an R2 key prefix.
 */
async function hashIp(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export default publicScan;
