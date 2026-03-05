/**
 * Lightweight analytics utility.
 * Tracks page views and events via a pluggable backend.
 *
 * Currently logs to console in dev. To enable an analytics provider:
 * - Set VITE_ANALYTICS_ID in .env
 * - Or integrate with any provider (Plausible, Fathom, GA) by
 *   extending the `send()` function below.
 */

const ANALYTICS_ID = import.meta.env.VITE_ANALYTICS_ID;
const isDev = import.meta.env.DEV;

/**
 * Track a page view.
 * @param {string} path - The page path (e.g. '/app/scan')
 */
export function trackPageView(path) {
  if (isDev) {
    console.debug('[analytics] pageview:', path);
    return;
  }
  send('pageview', { path });
}

/**
 * Track a custom event.
 * @param {string} name  - Event name (e.g. 'scan_upload', 'export_pdf')
 * @param {object} [props] - Optional event properties
 */
export function trackEvent(name, props = {}) {
  if (isDev) {
    console.debug('[analytics] event:', name, props);
    return;
  }
  send('event', { name, props });
}

function send(type, data) {
  if (!ANALYTICS_ID) return;

  // Plausible-compatible event API
  try {
    const url = document.location;
    navigator.sendBeacon?.(
      'https://plausible.io/api/event',
      JSON.stringify({
        n: type === 'pageview' ? 'pageview' : data.name,
        u: type === 'pageview' ? `${url.origin}${data.path}` : url.href,
        d: url.hostname,
        p: data.props ? JSON.stringify(data.props) : undefined,
      }),
    );
  } catch {
    // Analytics should never crash the app
  }
}
