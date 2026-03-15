/**
 * Tests for the order poller service (services/orderPoller.js).
 */

// ── Supabase mock ────────────────────────────────────────────────────────────
const mockSupabase = {
  from: vi.fn(),
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
};

function createChain(result = { data: null, error: null }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
    then(resolve) { return Promise.resolve(result).then(resolve); },
  };
  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ── Lulu mock ────────────────────────────────────────────────────────────────
vi.mock('../services/lulu.js', () => ({
  getOrderStatus: vi.fn(),
}));

// ── Email mock ───────────────────────────────────────────────────────────────
vi.mock('../services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email_1' }),
  buildShippingNotificationEmail: vi.fn(() => ({
    subject: 'Your book has shipped',
    html: '<p>Shipped!</p>',
  })),
  buildOrderFailureEmail: vi.fn(() => ({
    subject: 'Issue with your order',
    html: '<p>Failed!</p>',
  })),
}));

import { pollOrderStatuses } from '../services/orderPoller.js';
import { getOrderStatus } from '../services/lulu.js';
import { sendEmail, buildShippingNotificationEmail } from '../services/email.js';

const ENV = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'test-key',
  APP_URL: 'https://app.keptpages.com',
  RESEND_API_KEY: 'test-resend-key',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pollOrderStatuses', () => {
  it('returns early when no active orders exist', async () => {
    const chain = createChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await pollOrderStatuses(ENV);

    expect(result).toEqual({ polled: 0, updated: 0, errors: 0 });
    expect(getOrderStatus).not.toHaveBeenCalled();
  });

  it('returns early with error count on DB failure', async () => {
    const chain = createChain({ data: null, error: { message: 'db error' } });
    mockSupabase.from.mockReturnValue(chain);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await pollOrderStatuses(ENV);

    expect(result).toEqual({ polled: 0, updated: 0, errors: 1 });
    consoleSpy.mockRestore();
  });

  it('polls Lulu and updates status when changed', async () => {
    const books = [
      {
        id: 'b1',
        status: 'ordered',
        lulu_order_id: 'lulu_123',
        title: 'My Book',
        shipping_address: { email: 'user@test.com' },
        user_id: 'u1',
        email_notifications_sent: {},
      },
    ];

    // First call: books query, subsequent: update call
    const booksChain = createChain({ data: books, error: null });
    const updateChain = createChain({ data: null, error: null });
    mockSupabase.from
      .mockReturnValueOnce(booksChain)  // books query
      .mockReturnValue(updateChain);    // update calls

    getOrderStatus.mockResolvedValue({
      status: 'PRODUCTION',
      lineItems: [],
    });

    const result = await pollOrderStatuses(ENV);

    expect(result.polled).toBe(1);
    expect(result.updated).toBe(1);
    expect(getOrderStatus).toHaveBeenCalledWith('lulu_123', ENV);
  });

  it('skips mock orders', async () => {
    const books = [
      {
        id: 'b1',
        status: 'ordered',
        lulu_order_id: 'mock-abc-123',
        title: 'Mock Book',
        shipping_address: {},
        user_id: 'u1',
        email_notifications_sent: {},
      },
    ];

    const booksChain = createChain({ data: books, error: null });
    mockSupabase.from.mockReturnValue(booksChain);

    const result = await pollOrderStatuses(ENV);

    expect(result.polled).toBe(1);
    expect(result.updated).toBe(0);
    expect(getOrderStatus).not.toHaveBeenCalled();
  });

  it('sends shipping email when status transitions to shipped', async () => {
    const books = [
      {
        id: 'b2',
        status: 'printing',
        lulu_order_id: 'lulu_456',
        title: 'Shipped Book',
        shipping_address: { email: 'recipient@test.com', name: 'Jane' },
        user_id: 'u1',
        email_notifications_sent: {},
      },
    ];

    const booksChain = createChain({ data: books, error: null });
    const updateChain = createChain({ data: null, error: null });
    mockSupabase.from
      .mockReturnValueOnce(booksChain)
      .mockReturnValue(updateChain);

    getOrderStatus.mockResolvedValue({
      status: 'SHIPPED',
      lineItems: [{ trackingId: 'TRACK123', trackingUrl: 'https://ups.com/TRACK123' }],
    });

    await pollOrderStatuses(ENV);

    expect(buildShippingNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Shipped Book' }),
      expect.objectContaining({ trackingId: 'TRACK123' }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      'recipient@test.com',
      'Your book has shipped',
      '<p>Shipped!</p>',
      ENV,
    );
  });

  it('does not send duplicate shipping email (idempotency)', async () => {
    const books = [
      {
        id: 'b3',
        status: 'printing',
        lulu_order_id: 'lulu_789',
        title: 'Already Notified',
        shipping_address: { email: 'user@test.com' },
        user_id: 'u1',
        email_notifications_sent: { shipping: '2026-03-14T00:00:00Z' },
      },
    ];

    const booksChain = createChain({ data: books, error: null });
    const updateChain = createChain({ data: null, error: null });
    mockSupabase.from
      .mockReturnValueOnce(booksChain)
      .mockReturnValue(updateChain);

    getOrderStatus.mockResolvedValue({
      status: 'SHIPPED',
      lineItems: [{ trackingId: 'TRACK999' }],
    });

    await pollOrderStatuses(ENV);

    // Status should still update
    expect(mockSupabase.from).toHaveBeenCalled();
    // But email should NOT be sent again
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not update when Lulu status has not changed', async () => {
    const books = [
      {
        id: 'b4',
        status: 'ordered',
        lulu_order_id: 'lulu_same',
        title: 'No Change',
        shipping_address: {},
        user_id: 'u1',
        email_notifications_sent: {},
      },
    ];

    const booksChain = createChain({ data: books, error: null });
    mockSupabase.from.mockReturnValue(booksChain);

    getOrderStatus.mockResolvedValue({
      status: 'CREATED',
      lineItems: [],
    });

    const result = await pollOrderStatuses(ENV);

    expect(result.updated).toBe(0);
  });

  it('handles Lulu API errors gracefully', async () => {
    const books = [
      {
        id: 'b5',
        status: 'ordered',
        lulu_order_id: 'lulu_err',
        title: 'Error Book',
        shipping_address: {},
        user_id: 'u1',
        email_notifications_sent: {},
      },
    ];

    const booksChain = createChain({ data: books, error: null });
    mockSupabase.from.mockReturnValue(booksChain);

    getOrderStatus.mockRejectedValue(new Error('Lulu API timeout'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await pollOrderStatuses(ENV);

    expect(result.errors).toBe(1);
    expect(result.updated).toBe(0);
    consoleSpy.mockRestore();
  });
});
