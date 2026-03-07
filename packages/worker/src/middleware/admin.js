/**
 * Admin middleware.
 * Checks authenticated user's email against ADMIN_EMAILS env var.
 */

export function adminMiddleware() {
  return async (c, next) => {
    const adminEmails = c.env.ADMIN_EMAILS;
    if (!adminEmails) {
      return c.json({ error: 'Admin access not configured' }, 403);
    }

    const allowedEmails = adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const user = c.get('user');
    if (!user?.email || !allowedEmails.includes(user.email.toLowerCase())) {
      return c.json({ error: 'Forbidden: admin access required' }, 403);
    }

    await next();
  };
}

/**
 * Check if a user email is an admin (utility for non-middleware use).
 */
export function isAdminEmail(email, env) {
  const adminEmails = env.ADMIN_EMAILS;
  if (!adminEmails || !email) return false;
  const allowedEmails = adminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(email.toLowerCase());
}
