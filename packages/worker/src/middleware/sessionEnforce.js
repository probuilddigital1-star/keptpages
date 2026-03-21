/**
 * Concurrent session enforcement middleware.
 * Limits each account to one active session at a time.
 *
 * Frontend sends X-Session-Id header (UUID) on every authenticated request.
 * KV key `session:{userId}` stores `{ sessionId, lastSeen }`.
 *
 * Rules:
 * - Same sessionId → proceed, update lastSeen
 * - Different sessionId + stored lastSeen < 5min ago → 401 CONCURRENT_SESSION
 * - Different sessionId + stored lastSeen > 5min ago → new session takes over
 * - Missing header → skip enforcement (backwards compatibility)
 */

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL = 86400; // 24h KV expiry

/**
 * Hono middleware factory for session enforcement.
 * @param {{ enforce: boolean }} options - If enforce=false, logs but doesn't block
 */
export function sessionEnforceMiddleware({ enforce = false } = {}) {
  return async (c, next) => {
    const kv = c.env.RATE_LIMIT;
    if (!kv) {
      await next();
      return;
    }

    const user = c.get('user');
    if (!user?.id) {
      await next();
      return;
    }

    const sessionId = c.req.header('X-Session-Id');
    if (!sessionId) {
      // No session header — skip enforcement (backwards compatibility)
      await next();
      return;
    }

    const kvKey = `session:${user.id}`;

    try {
      const stored = await kv.get(kvKey, { type: 'json' });
      const now = Date.now();

      if (stored && stored.sessionId !== sessionId) {
        const elapsed = now - (stored.lastSeen || 0);

        if (elapsed < SESSION_TIMEOUT_MS) {
          // Another active session exists
          if (enforce) {
            return c.json(
              {
                error: 'Another session is active for this account',
                code: 'CONCURRENT_SESSION',
              },
              401
            );
          } else {
            // Log-only mode
            console.warn(`Concurrent session detected for user ${user.id}: existing=${stored.sessionId?.slice(0, 8)}, new=${sessionId.slice(0, 8)}`);
          }
        }
        // Stale session or log-only mode — new session takes over
      }

      // Update session record
      await kv.put(
        kvKey,
        JSON.stringify({ sessionId, lastSeen: now }),
        { expirationTtl: SESSION_TTL }
      );
    } catch (err) {
      // Graceful fallback — don't block on KV errors
      console.error('Session enforce KV error:', err.message);
    }

    await next();
  };
}
