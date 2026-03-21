/**
 * Daily scan cap middleware.
 * Limits keeper and book_purchaser users to 100 scans/day (or a reduced
 * throttle cap if the account has been flagged by an admin).
 *
 * Free-tier users are already monthly-capped and can never hit 100/day,
 * so we skip the KV lookup for them entirely.
 *
 * Uses the RATE_LIMIT KV namespace with keys: `daily:{userId}:{YYYY-MM-DD}`
 */

import { createClient } from '@supabase/supabase-js';

const DEFAULT_DAILY_CAP = 100;

/**
 * Hono middleware factory for daily scan cap enforcement.
 */
export function dailyCapMiddleware() {
  return async (c, next) => {
    const kv = c.env.RATE_LIMIT;
    if (!kv) {
      // No KV bound — skip (dev mode)
      await next();
      return;
    }

    const user = c.get('user');
    if (!user?.id) {
      await next();
      return;
    }

    // Look up user tier from profile
    let tier;
    try {
      const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();
      tier = profile?.tier;
    } catch {
      // If we can't determine tier, allow the request through
      await next();
      return;
    }

    // Skip for free tier — already monthly-capped at 40, can never hit 100/day
    if (!tier || tier === 'free') {
      await next();
      return;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dailyKey = `daily:${user.id}:${today}`;

    try {
      // Check if account is throttled (admin action)
      let cap = DEFAULT_DAILY_CAP;
      const throttleVal = await kv.get(`throttle:${user.id}`);
      if (throttleVal) {
        try {
          const parsed = JSON.parse(throttleVal);
          cap = parsed.dailyCap || 10;
        } catch {
          cap = 10;
        }
      }

      const currentStr = await kv.get(dailyKey);
      const currentCount = currentStr ? parseInt(currentStr, 10) : 0;

      // Set response headers
      c.header('X-DailyCap-Limit', String(cap));
      c.header('X-DailyCap-Remaining', String(Math.max(0, cap - currentCount)));

      if (currentCount >= cap) {
        return c.json(
          {
            error: 'Daily scan limit reached',
            dailyLimit: cap,
            dailyUsed: currentCount,
          },
          429
        );
      }

      // Increment count
      await kv.put(dailyKey, String(currentCount + 1), { expirationTtl: 86400 });

      // Update remaining header after increment
      c.header('X-DailyCap-Remaining', String(Math.max(0, cap - currentCount - 1)));
    } catch (err) {
      // Graceful fallback — if KV errors, allow the request through
      console.error('Daily cap KV error:', err.message);
    }

    await next();
  };
}
