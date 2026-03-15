/**
 * Tests for the email service (services/email.js).
 */

import { sendEmail, buildOrderConfirmationEmail, buildShippingNotificationEmail, buildOrderFailureEmail } from '../services/email.js';

// ── sendEmail ─────────────────────────────────────────────────────────────────

describe('sendEmail', () => {
  const env = { RESEND_API_KEY: 'test-key-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  it('calls Resend API with correct parameters', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email_123' }),
    });

    await sendEmail('user@example.com', 'Test Subject', '<p>Hello</p>', env);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key-123',
        },
      }),
    );

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.from).toContain('KeptPages');
    expect(body.to).toEqual(['user@example.com']);
    expect(body.subject).toBe('Test Subject');
    expect(body.html).toBe('<p>Hello</p>');
  });

  it('returns null when RESEND_API_KEY is not configured', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendEmail('user@example.com', 'Test', '<p>Hi</p>', {});

    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('throws on Resend API error', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Invalid email'),
    });

    await expect(sendEmail('bad', 'Test', '<p>Hi</p>', env)).rejects.toThrow(
      'Resend API error (422): Invalid email',
    );
  });

  it('returns the Resend response on success', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email_abc' }),
    });

    const result = await sendEmail('user@example.com', 'Test', '<p>Hi</p>', env);
    expect(result).toEqual({ id: 'email_abc' });
  });
});

// ── buildOrderConfirmationEmail ───────────────────────────────────────────────

describe('buildOrderConfirmationEmail', () => {
  it('returns subject and html with order details', () => {
    const { subject, html } = buildOrderConfirmationEmail({
      title: 'Family Recipes',
      tierLabel: 'Premium (Hardcover, Full Color)',
      quantity: 2,
      totalCents: 13800,
      shippingAddress: {
        name: 'Jane Doe',
        street1: '123 Main St',
        city: 'Portland',
        state: 'OR',
        postalCode: '97201',
      },
      appUrl: 'https://app.keptpages.com',
    });

    expect(subject).toBe('Order Confirmed: Family Recipes');
    expect(html).toContain('Family Recipes');
    expect(html).toContain('Premium (Hardcover, Full Color)');
    expect(html).toContain('Qty: 2');
    expect(html).toContain('$138.00');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Portland');
    expect(html).toContain('/app/orders');
    expect(html).toContain('KeptPages');
  });

  it('handles missing optional fields gracefully', () => {
    const { subject, html } = buildOrderConfirmationEmail({});

    expect(subject).toContain('Your KeptPages Book');
    expect(html).toContain('Untitled Book');
    expect(html).toContain('Classic');
    expect(html).toContain('Qty: 1');
  });
});

// ── buildShippingNotificationEmail ────────────────────────────────────────────

describe('buildShippingNotificationEmail', () => {
  it('returns subject and html with tracking info', () => {
    const { subject, html } = buildShippingNotificationEmail(
      { title: 'Family Recipes', appUrl: 'https://app.keptpages.com' },
      { trackingId: 'TRACK123', trackingUrl: 'https://ups.com/track/TRACK123' },
    );

    expect(subject).toBe('Your book has shipped: Family Recipes');
    expect(html).toContain('Family Recipes');
    expect(html).toContain('TRACK123');
    expect(html).toContain('https://ups.com/track/TRACK123');
    expect(html).toContain('/app/orders');
  });

  it('handles missing tracking URL', () => {
    const { html } = buildShippingNotificationEmail(
      { title: 'My Book' },
      { trackingId: 'ABC123' },
    );

    expect(html).toContain('ABC123');
    // Should not contain a link tag around it when there's no URL
    expect(html).not.toContain('href="undefined"');
  });

  it('handles completely missing tracking info', () => {
    const { html } = buildShippingNotificationEmail({ title: 'My Book' }, {});

    expect(html).toContain('Not yet available');
  });
});

// ── buildOrderFailureEmail ────────────────────────────────────────────────

describe('buildOrderFailureEmail', () => {
  it('returns subject and html with error details', () => {
    const { subject, html } = buildOrderFailureEmail({
      title: 'Family Recipes',
      errorMessage: 'Address validation failed',
      appUrl: 'https://app.keptpages.com',
    });

    expect(subject).toBe('Issue with your order: Family Recipes');
    expect(html).toContain('Family Recipes');
    expect(html).toContain('Address validation failed');
    expect(html).toContain('/app/orders');
    expect(html).toContain('will not be charged again');
  });

  it('handles missing fields gracefully', () => {
    const { subject, html } = buildOrderFailureEmail({});

    expect(subject).toContain('KeptPages Book');
    expect(html).toContain('unable to fulfill');
  });
});
