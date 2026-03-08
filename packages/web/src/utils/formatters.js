/**
 * Relative time formatter.
 * Returns human-readable strings like "just now", "2 hours ago", "3 days ago".
 */
export function relativeTime(date) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Truncate a string to `maxLength` characters, appending an ellipsis if truncated.
 */
export function truncate(str, maxLength = 100) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '\u2026';
}

/**
 * Format a price given in cents to a dollar string.
 * e.g. 7900 -> "$79.00"
 */
export function formatCurrency(cents) {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Format a date to a readable string.
 * e.g. "Feb 26, 2026"
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
