/**
 * Authentication middleware - verifies Supabase JWT tokens.
 * Supports both ES256 (new Supabase projects) and HS256 (legacy).
 * Attaches the decoded user to the Hono context for downstream handlers.
 */

// JWKS cache: { keys, fetchedAt }
let jwksCache = null;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Decode a base64url string to a Uint8Array.
 */
function base64urlToBytes(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode a base64url string to a UTF-8 string.
 */
function base64urlDecode(str) {
  return new TextDecoder().decode(base64urlToBytes(str));
}

/**
 * Fetch and cache the JWKS from Supabase.
 */
async function getJwks(supabaseUrl) {
  const now = Date.now();
  if (jwksCache && (now - jwksCache.fetchedAt) < JWKS_CACHE_TTL) {
    return jwksCache.keys;
  }

  const url = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch JWKS: ${res.status}`);
    }
    const data = await res.json();
    jwksCache = { keys: data.keys, fetchedAt: now };
    return data.keys;
  } catch (err) {
    // Stale-while-revalidate: use cached keys if refetch fails
    if (jwksCache) {
      console.warn('JWKS refetch failed, using stale cache:', err.message);
      return jwksCache.keys;
    }
    throw err;
  }
}

/**
 * Import an EC public key from a JWK for ES256 verification.
 */
async function importEcKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
}

/**
 * Import an HMAC key for HS256 verification.
 */
async function importHmacKey(secret) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Verify a JWT signature (ES256 or HS256).
 */
async function verifyJwt(token, { jwtSecret, supabaseUrl }) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64urlDecode(headerB64));
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64urlToBytes(signatureB64);

  if (header.alg === 'ES256') {
    // Fetch JWKS and find matching key
    const keys = await getJwks(supabaseUrl);
    const jwk = header.kid
      ? keys.find((k) => k.kid === header.kid)
      : keys[0];

    if (!jwk) {
      throw new Error(`No matching JWK found for kid: ${header.kid}`);
    }

    const key = await importEcKey(jwk);
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      signedData
    );
    if (!isValid) {
      throw new Error('Invalid JWT signature');
    }
  } else if (header.alg === 'HS256') {
    if (!jwtSecret) {
      throw new Error('HS256 token received but SUPABASE_JWT_SECRET is not configured');
    }
    const key = await importHmacKey(jwtSecret);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, signedData);
    if (!isValid) {
      throw new Error('Invalid JWT signature');
    }
  } else {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }

  // Decode and validate payload
  const payload = JSON.parse(base64urlDecode(payloadB64));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token has expired');
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error('Token is not yet valid');
  }

  return payload;
}

/**
 * Hono middleware that verifies the Supabase JWT and attaches the user
 * to the request context.
 */
export function authMiddleware() {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return c.json({ error: 'Invalid Authorization header format. Expected: Bearer <token>' }, 401);
    }

    const token = parts[1];

    try {
      const payload = await verifyJwt(token, {
        jwtSecret: c.env.SUPABASE_JWT_SECRET,
        supabaseUrl: c.env.SUPABASE_URL,
      });

      // Supabase JWTs include sub (user id), email, role, and metadata
      c.set('user', {
        id: payload.sub,
        email: payload.email,
        role: payload.role || 'authenticated',
        appMetadata: payload.app_metadata || {},
        userMetadata: payload.user_metadata || {},
      });

      await next();
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
  };
}
