/**
 * KV-based rate limiting middleware for Cloudflare Workers.
 * Uses the RATE_LIMIT KV namespace to track request counts per user per endpoint.
 */

// Rate limit configurations by route pattern
const RATE_LIMITS = {
  'scan:upload': { maxRequests: 10, windowSeconds: 60 },
  'scan:reprocess': { maxRequests: 3, windowSeconds: 60 },
  default: { maxRequests: 30, windowSeconds: 60 },
};

/**
 * Determine the rate limit bucket for a given request path and method.
 */
function getBucket(path, method) {
  if (method === 'POST' && path.match(/^\/api\/scan$/)) {
    return 'scan:upload';
  }
  if (method === 'POST' && path.match(/\/reprocess$/)) {
    return 'scan:reprocess';
  }
  return 'default';
}

/**
 * Hono middleware factory for rate limiting.
 * Requires the RATE_LIMIT KV binding on the environment.
 */
export function rateLimitMiddleware() {
  return async (c, next) => {
    const kv = c.env.RATE_LIMIT;
    if (!kv) {
      // If KV is not configured, skip rate limiting (dev mode)
      console.warn('RATE_LIMIT KV namespace not bound, skipping rate limiting');
      await next();
      return;
    }

    // Identify the user - use authenticated user ID or fall back to IP
    const user = c.get('user');
    const userId = user?.id || c.req.header('CF-Connecting-IP') || 'anonymous';

    const bucket = getBucket(c.req.path, c.req.method);
    const config = RATE_LIMITS[bucket];
    const kvKey = `rate:${userId}:${bucket}`;

    try {
      const existing = await kv.get(kvKey, { type: 'json' });
      const now = Math.floor(Date.now() / 1000);

      if (existing) {
        const { count, windowStart } = existing;
        const elapsed = now - windowStart;

        if (elapsed < config.windowSeconds) {
          // Still within the window
          if (count >= config.maxRequests) {
            const retryAfter = config.windowSeconds - elapsed;
            c.header('Retry-After', String(retryAfter));
            c.header('X-RateLimit-Limit', String(config.maxRequests));
            c.header('X-RateLimit-Remaining', '0');
            c.header('X-RateLimit-Reset', String(windowStart + config.windowSeconds));
            return c.json(
              {
                error: 'Rate limit exceeded',
                retryAfter,
                limit: config.maxRequests,
                window: config.windowSeconds,
              },
              429
            );
          }

          // Increment count
          await kv.put(
            kvKey,
            JSON.stringify({ count: count + 1, windowStart }),
            { expirationTtl: config.windowSeconds }
          );

          c.header('X-RateLimit-Limit', String(config.maxRequests));
          c.header('X-RateLimit-Remaining', String(config.maxRequests - count - 1));
          c.header('X-RateLimit-Reset', String(windowStart + config.windowSeconds));
        } else {
          // Window expired, start new window
          await kv.put(
            kvKey,
            JSON.stringify({ count: 1, windowStart: now }),
            { expirationTtl: config.windowSeconds }
          );

          c.header('X-RateLimit-Limit', String(config.maxRequests));
          c.header('X-RateLimit-Remaining', String(config.maxRequests - 1));
          c.header('X-RateLimit-Reset', String(now + config.windowSeconds));
        }
      } else {
        // No existing record, start new window
        await kv.put(
          kvKey,
          JSON.stringify({ count: 1, windowStart: now }),
          { expirationTtl: config.windowSeconds }
        );

        c.header('X-RateLimit-Limit', String(config.maxRequests));
        c.header('X-RateLimit-Remaining', String(config.maxRequests - 1));
        c.header('X-RateLimit-Reset', String(now + config.windowSeconds));
      }
    } catch (err) {
      // If rate limiting fails, log but don't block the request
      console.error('Rate limiting error:', err.message);
    }

    await next();
  };
}
