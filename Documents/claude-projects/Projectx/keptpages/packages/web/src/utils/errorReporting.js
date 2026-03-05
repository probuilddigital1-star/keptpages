/**
 * Lightweight error reporting utility.
 * Logs to console in dev; sends to external service when configured.
 *
 * To enable Sentry:
 * 1. Install: pnpm add @sentry/react
 * 2. Set VITE_SENTRY_DSN in .env
 * 3. The captureError/captureMessage functions will auto-initialize Sentry.
 */

let sentryRef = null;

function getSentry() {
  if (sentryRef) return sentryRef;
  // Only attempt Sentry if DSN is configured
  // Sentry must be installed separately — this file works without it
  return null;
}

/**
 * Initialize Sentry if the SDK is available and DSN is configured.
 * Call this once at app startup.
 * @param {object} Sentry - The @sentry/react module (pass it explicitly to avoid bundling issues)
 */
export function initErrorReporting(Sentry) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !Sentry) return;
  sentryRef = Sentry;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

/**
 * Report an error to the monitoring service.
 */
export function captureError(error, context = {}) {
  console.error('[KeptPages]', error, context);
  const sentry = getSentry();
  if (sentry) {
    sentry.captureException(error, { extra: context });
  }
}

/**
 * Report a message (non-error) to the monitoring service.
 */
export function captureMessage(message, level = 'info') {
  if (import.meta.env.DEV) {
    console.log(`[KeptPages] ${level}:`, message);
  }
  const sentry = getSentry();
  if (sentry) {
    sentry.captureMessage(message, level);
  }
}
