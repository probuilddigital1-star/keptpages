import { relativeTime, truncate, formatCurrency, formatDate } from './formatters';

describe('relativeTime', () => {
  it('returns "just now" for dates within the last minute', () => {
    const now = new Date();
    expect(relativeTime(now)).toBe('just now');

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    expect(relativeTime(thirtySecondsAgo)).toBe('just now');
  });

  it('returns "X minutes ago" for dates within the last hour', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(relativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('returns "1 minute ago" (singular) for exactly 1 minute', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    expect(relativeTime(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('returns "X hours ago" for dates within the last day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(relativeTime(threeHoursAgo)).toBe('3 hours ago');
  });

  it('returns "1 hour ago" (singular) for exactly 1 hour', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(relativeTime(oneHourAgo)).toBe('1 hour ago');
  });

  it('returns "1 day ago" for dates 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(relativeTime(oneDayAgo)).toBe('1 day ago');
  });

  it('returns "X days ago" for dates within the last month', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(relativeTime(tenDaysAgo)).toBe('10 days ago');
  });

  it('returns "X months ago" for dates within the last year', () => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(relativeTime(threeMonthsAgo)).toBe('3 months ago');
  });

  it('returns "1 month ago" (singular) for exactly 1 month', () => {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(relativeTime(oneMonthAgo)).toBe('1 month ago');
  });

  it('returns "X years ago" for older dates', () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    expect(relativeTime(twoYearsAgo)).toBe('2 years ago');
  });

  it('returns "1 year ago" (singular) for exactly 1 year', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    expect(relativeTime(oneYearAgo)).toBe('1 year ago');
  });

  it('handles string date input', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('handles Date object input', () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(relativeTime(date)).toBe('2 hours ago');
  });

  it('handles null/undefined gracefully (returns NaN-based string or "just now")', () => {
    // null becomes epoch 0, which is decades ago -- function still returns a string
    const result = relativeTime(null);
    expect(typeof result).toBe('string');
  });
});

describe('truncate', () => {
  it('returns original string if shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns original string if exactly maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and adds ellipsis at maxLength', () => {
    const result = truncate('hello world this is a long string', 10);
    expect(result).toBe('hello worl\u2026');
    expect(result.length).toBe(11); // 10 chars + ellipsis
  });

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('handles null', () => {
    expect(truncate(null, 10)).toBe('');
  });

  it('handles undefined', () => {
    expect(truncate(undefined, 10)).toBe('');
  });

  it('defaults maxLength to 100 if not provided', () => {
    const longString = 'a'.repeat(150);
    const result = truncate(longString);
    // 100 chars + ellipsis
    expect(result).toBe('a'.repeat(100) + '\u2026');
  });

  it('returns original string if under default maxLength', () => {
    const shortString = 'a'.repeat(50);
    expect(truncate(shortString)).toBe(shortString);
  });
});

describe('formatCurrency', () => {
  it('formats 7900 as "$79.00"', () => {
    expect(formatCurrency(7900)).toBe('$79.00');
  });

  it('formats 0 as "$0.00"', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats 1499 as "$14.99"', () => {
    expect(formatCurrency(1499)).toBe('$14.99');
  });

  it('formats 3999 as "$39.99"', () => {
    expect(formatCurrency(3999)).toBe('$39.99');
  });
});

describe('formatDate', () => {
  it('formats date as "Feb 26, 2026" style', () => {
    const result = formatDate('2026-02-26T12:00:00Z');
    expect(result).toBe('Feb 26, 2026');
  });

  it('handles string input', () => {
    // Use ISO string with time to avoid UTC→local timezone shift
    const result = formatDate('2025-01-15T12:00:00');
    expect(result).toMatch(/Jan\s+15,\s+2025/);
  });

  it('handles Date object input', () => {
    const date = new Date(2024, 11, 25); // Dec 25, 2024
    const result = formatDate(date);
    expect(result).toMatch(/Dec\s+25,\s+2024/);
  });
});
