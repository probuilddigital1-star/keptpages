/**
 * Utility for highlighting search terms in text
 */

/**
 * Highlights search terms in text with a styled span
 * @param {string} text - The text to highlight
 * @param {string} searchTerm - The search term to highlight
 * @returns {JSX.Element|string} - React element with highlighted text or original text
 */
export function highlightSearchTerm(text, searchTerm) {
  if (!text || !searchTerm || searchTerm.length < 2) {
    return text || '';
  }

  // Escape special regex characters in search term
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, 'gi');

  const parts = text.split(regex);

  if (parts.length === 1) {
    return text; // No match found
  }

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <span
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900 text-gray-900 dark:text-yellow-100 px-0.5 rounded font-medium"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Check if text contains search term (case-insensitive)
 * @param {string} text - The text to search
 * @param {string} searchTerm - The search term
 * @returns {boolean} - Whether the text contains the search term
 */
export function containsSearchTerm(text, searchTerm) {
  if (!text || !searchTerm) return false;
  return text.toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * Get excerpt around search term with context
 * @param {string} text - The full text
 * @param {string} searchTerm - The search term
 * @param {number} contextLength - Number of characters to show before/after (default 50)
 * @returns {string} - Excerpt with ellipsis if truncated
 */
export function getSearchExcerpt(text, searchTerm, contextLength = 50) {
  if (!text || !searchTerm || !containsSearchTerm(text, searchTerm)) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);

  if (index === -1) return text;

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + searchTerm.length + contextLength);

  let excerpt = text.substring(start, end);

  if (start > 0) {
    excerpt = '...' + excerpt;
  }
  if (end < text.length) {
    excerpt = excerpt + '...';
  }

  return excerpt;
}