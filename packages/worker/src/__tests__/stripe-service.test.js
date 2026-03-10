/**
 * Tests for the Stripe service (services/stripe.js).
 * Mocks: stripe module, @supabase/supabase-js createClient.
 */

// ── Stripe mock ────────────────────────────────────────────────────────────────
const mockStripeInstance = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  subscriptions: { update: vi.fn() },
  billingPortal: { sessions: { create: vi.fn() } },
};

vi.mock('stripe', () => {
  const StripeCtor = vi.fn(() => mockStripeInstance);
  StripeCtor.createFetchHttpClient = vi.fn();
  return { default: StripeCtor };
});

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockSupabaseChain = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

// Every chained method returns the chain so we can keep chaining
for (const key of Object.keys(mockSupabaseChain)) {
  mockSupabaseChain[key].mockReturnValue(mockSupabaseChain);
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseChain),
}));

// ── Dynamic import mock for lulu.js (used inside handleBookPaymentCompleted) ──
vi.mock('../services/lulu.js', () => ({
  createProject: vi.fn().mockResolvedValue({ id: 'lulu_proj_1' }),
  createOrder: vi.fn().mockResolvedValue({ id: 'lulu_order_1', totalCost: 2500 }),
}));

// ── Import the module under test AFTER mocks are set up ────────────────────────
import {
  createCheckoutSession,
  createBookCheckoutSession,
  cancelSubscription,
  createPortalSession,
  handleWebhookEvent,
} from '../services/stripe.js';

// ── Helpers ────────────────────────────────────────────────────────────────────
const baseEnv = {
  STRIPE_SECRET_KEY: 'sk_test_xxx',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'service-key',
  APP_URL: 'https://app.keptpages.com',
};

function resetChain(overrides = {}) {
  for (const fn of Object.values(mockSupabaseChain)) {
    fn.mockReset().mockReturnValue(mockSupabaseChain);
  }
  // Apply overrides for .single() which typically terminates a chain
  if (overrides.single) {
    mockSupabaseChain.single.mockResolvedValue(overrides.single);
  } else {
    mockSupabaseChain.single.mockResolvedValue({ data: null, error: null });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  resetChain();
  mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_new_123' });
  mockStripeInstance.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test_session',
    url: 'https://checkout.stripe.com/session',
  });
  mockStripeInstance.subscriptions.update.mockResolvedValue({});
  mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
    url: 'https://billing.stripe.com/portal',
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// createCheckoutSession
// ════════════════════════════════════════════════════════════════════════════════
describe('createCheckoutSession', () => {
  it('creates a new Stripe customer when none exists and saves customer ID', async () => {
    resetChain({ single: { data: { stripe_customer_id: null, email: 'test@example.com' } } });

    await createCheckoutSession('user_1', 'keeper_monthly', baseEnv);

    expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
      metadata: { supabase_user_id: 'user_1' },
      email: 'test@example.com',
    });

    // Should update profile with new customer id
    expect(mockSupabaseChain.update).toHaveBeenCalledWith({ stripe_customer_id: 'cus_new_123' });
  });

  it('uses existing customer ID when available', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_existing', email: 'a@b.com' } },
    });

    await createCheckoutSession('user_1', 'keeper_monthly', baseEnv);

    expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
  });

  it('creates a subscription-mode session for monthly plan', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await createCheckoutSession('user_1', 'keeper_monthly', baseEnv);

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription' }),
    );
  });

  it('creates a subscription-mode session for yearly plan', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await createCheckoutSession('user_1', 'keeper_yearly', baseEnv);

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription' }),
    );
  });

  it('creates a payment-mode session for non-subscription plans', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await createCheckoutSession('user_1', 'book_order', baseEnv);

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment' }),
    );
  });

  it('enables promo codes for subscriptions only', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    // Subscription plan → promo codes allowed
    await createCheckoutSession('user_1', 'keeper_monthly', baseEnv);
    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ allow_promotion_codes: true }),
    );

    vi.clearAllMocks();
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test', url: 'https://checkout.stripe.com/session',
    });

    // Non-subscription plan → no promo codes
    await createCheckoutSession('user_1', 'book_order', baseEnv);
    const callArg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(callArg.allow_promotion_codes).toBeUndefined();
  });

  it('throws for an unknown plan', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await expect(createCheckoutSession('user_1', 'unknown_plan', baseEnv)).rejects.toThrow(
      'Unknown plan: unknown_plan',
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// createBookCheckoutSession
// ════════════════════════════════════════════════════════════════════════════════
describe('createBookCheckoutSession', () => {
  const makeBook = (overrides = {}) => ({
    id: 'book_42',
    title: 'My Great Book',
    page_count: 40,
    ...overrides,
  });

  const shippingAddress = { street: '123 Main', city: 'Anytown', state: 'CA', zip: '90210' };

  beforeEach(() => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });
  });

  it('calculates correct base price for 40 pages ($79 = 7900 cents)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(7900);
  });

  it('adds $0.50/page over 40 pages (60 pages → 8900 cents)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 60 }), shippingAddress, 1, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(8900);
  });

  it('caps base price at $149 (200 pages → 14900 cents)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 200 }), shippingAddress, 1, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(14900);
  });

  it('applies hardcover modifier (+$15 = +1500 cents)', async () => {
    await createBookCheckoutSession(
      'user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv,
      { binding: 'CW' },
    );

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(7900 + 1500);
  });

  it('applies full-color modifier (+$20 = +2000 cents)', async () => {
    await createBookCheckoutSession(
      'user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv,
      { interior: 'FC' },
    );

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(7900 + 2000);
  });

  it('applies multiple print option modifiers together', async () => {
    await createBookCheckoutSession(
      'user_1', makeBook({ page_count: 60 }), shippingAddress, 1, baseEnv,
      { binding: 'CW', interior: 'FC', paper: '080CW444' },
    );

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    // 8900 base + 1500 hardcover + 2000 full color + 800 premium paper
    expect(arg.line_items[0].price_data.unit_amount).toBe(8900 + 1500 + 2000 + 800);
  });

  it('builds correct description with binding and interior labels', async () => {
    await createBookCheckoutSession(
      'user_1', makeBook({ page_count: 100 }), shippingAddress, 1, baseEnv,
      { binding: 'CW', interior: 'FC' },
    );

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    const desc = arg.line_items[0].price_data.product_data.description;
    expect(desc).toContain('Hardcover');
    expect(desc).toContain('Full Color');
    expect(desc).toContain('100 pages');
  });

  it('uses default labels when no print options provided', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 50 }), shippingAddress, 1, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    const desc = arg.line_items[0].price_data.product_data.description;
    expect(desc).toContain('Paperback');
    expect(desc).toContain('B&W');
  });

  it('includes correct metadata (user_id, book_id, quantity, shipping, print options)', async () => {
    const printOpts = { binding: 'PB', interior: 'BW' };
    await createBookCheckoutSession('user_1', makeBook(), shippingAddress, 3, baseEnv, printOpts);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.metadata).toEqual({
      user_id: 'user_1',
      book_id: 'book_42',
      quantity: '3',
      shipping_address: JSON.stringify(shippingAddress),
      print_options: JSON.stringify(printOpts),
    });
  });

  it('creates a Stripe customer if none exists', async () => {
    resetChain({
      single: { data: { stripe_customer_id: null, email: 'new@user.com' } },
    });

    await createBookCheckoutSession('user_1', makeBook(), shippingAddress, 1, baseEnv);

    expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
      metadata: { supabase_user_id: 'user_1' },
      email: 'new@user.com',
    });
    expect(mockSupabaseChain.update).toHaveBeenCalledWith({ stripe_customer_id: 'cus_new_123' });
  });

  it('sets mode to payment', async () => {
    await createBookCheckoutSession('user_1', makeBook(), shippingAddress, 1, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.mode).toBe('payment');
  });

  it('passes quantity to line_items', async () => {
    await createBookCheckoutSession('user_1', makeBook(), shippingAddress, 5, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].quantity).toBe(5);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// calculateBookUnitPrice (tested indirectly through createBookCheckoutSession)
// ════════════════════════════════════════════════════════════════════════════════
describe('calculateBookUnitPrice (via createBookCheckoutSession)', () => {
  const shippingAddress = { street: '1 Main' };

  beforeEach(() => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });
  });

  const getUnitAmount = async (pageCount, printOptions = {}) => {
    vi.clearAllMocks();
    resetChain({ single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } } });
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      id: 'cs_t', url: 'https://checkout.stripe.com/s',
    });

    await createBookCheckoutSession(
      'u1',
      { id: 'b1', title: 'T', page_count: pageCount },
      shippingAddress, 1, baseEnv,
      printOptions,
    );
    return mockStripeInstance.checkout.sessions.create.mock.calls[0][0].line_items[0].price_data.unit_amount;
  };

  it('40 pages → 7900 cents ($79.00)', async () => {
    expect(await getUnitAmount(40)).toBe(7900);
  });

  it('60 pages → 8900 cents (7900 + 20*50)', async () => {
    expect(await getUnitAmount(60)).toBe(8900);
  });

  it('200 pages → 14900 cents (capped at $149)', async () => {
    expect(await getUnitAmount(200)).toBe(14900);
  });

  it('with hardcover (CW): +1500 cents', async () => {
    expect(await getUnitAmount(40, { binding: 'CW' })).toBe(7900 + 1500);
  });

  it('with full color (FC): +2000 cents', async () => {
    expect(await getUnitAmount(40, { interior: 'FC' })).toBe(7900 + 2000);
  });

  it('0 pages defaults to base price', async () => {
    expect(await getUnitAmount(0)).toBe(7900);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// cancelSubscription
// ════════════════════════════════════════════════════════════════════════════════
describe('cancelSubscription', () => {
  it('sets cancel_at_period_end on the Stripe subscription', async () => {
    resetChain({
      single: { data: { stripe_subscription_id: 'sub_123', stripe_customer_id: 'cus_1' } },
    });

    await cancelSubscription('user_1', baseEnv);

    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      cancel_at_period_end: true,
    });
  });

  it('updates profile to canceling status', async () => {
    resetChain({
      single: { data: { stripe_subscription_id: 'sub_123', stripe_customer_id: 'cus_1' } },
    });

    await cancelSubscription('user_1', baseEnv);

    expect(mockSupabaseChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: 'canceling',
      }),
    );
  });

  it('updates subscriptions table with cancel_at_period_end', async () => {
    resetChain({
      single: { data: { stripe_subscription_id: 'sub_123', stripe_customer_id: 'cus_1' } },
    });

    await cancelSubscription('user_1', baseEnv);

    expect(mockSupabaseChain.update).toHaveBeenCalledWith({ cancel_at_period_end: true });
  });

  it('throws when no active subscription found', async () => {
    resetChain({ single: { data: { stripe_subscription_id: null } } });

    await expect(cancelSubscription('user_1', baseEnv)).rejects.toThrow(
      'No active subscription found',
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// createPortalSession
// ════════════════════════════════════════════════════════════════════════════════
describe('createPortalSession', () => {
  it('creates a portal session with correct return URL', async () => {
    resetChain({ single: { data: { stripe_customer_id: 'cus_portal' } } });

    const result = await createPortalSession('user_1', baseEnv);

    expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_portal',
      return_url: 'https://app.keptpages.com/app/settings',
    });
    expect(result).toEqual({ url: 'https://billing.stripe.com/portal' });
  });

  it('throws when no Stripe customer exists', async () => {
    resetChain({ single: { data: { stripe_customer_id: null } } });

    await expect(createPortalSession('user_1', baseEnv)).rejects.toThrow(
      'No Stripe customer found',
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// handleWebhookEvent
// ════════════════════════════════════════════════════════════════════════════════
describe('handleWebhookEvent', () => {
  describe('checkout.session.completed (subscription)', () => {
    it('activates plan and sets tier to keeper', async () => {
      resetChain();

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'subscription',
            subscription: 'sub_new_1',
            metadata: { user_id: 'user_1', plan: 'keeper_monthly' },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'active',
          subscription_plan: 'keeper_monthly',
          stripe_subscription_id: 'sub_new_1',
          tier: 'keeper',
        }),
      );
    });
  });

  describe('checkout.session.completed (payment)', () => {
    it('records payment in the payments table', async () => {
      resetChain();

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            id: 'cs_pay_1',
            payment_intent: 'pi_1',
            amount_total: 7900,
            currency: 'usd',
            metadata: { user_id: 'user_1', plan: 'book_order' },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_1',
          stripe_session_id: 'cs_pay_1',
          stripe_payment_intent: 'pi_1',
          amount: 7900,
          currency: 'usd',
          status: 'succeeded',
          payment_type: 'one_time',
        }),
      );
    });

    it('triggers book fulfillment when book_id is present', async () => {
      // For handleBookPaymentCompleted we need special chain behavior:
      // first .single() call returns for the initial query, subsequent calls
      // are for the book fetch inside handleBookPaymentCompleted.
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: null }) // initial (not used for payment mode)
        .mockResolvedValueOnce({
          data: {
            id: 'book_42',
            interior_pdf_key: 'interior.pdf',
            cover_pdf_key: 'cover.pdf',
            title: 'Test Book',
          },
        });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            id: 'cs_book_1',
            payment_intent: 'pi_book_1',
            amount_total: 7900,
            currency: 'usd',
            metadata: {
              user_id: 'user_1',
              book_id: 'book_42',
              quantity: '1',
              shipping_address: JSON.stringify({ street: '1 Main' }),
              print_options: JSON.stringify({ binding: 'PB' }),
            },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_type: 'book_order',
        }),
      );
    });
  });

  describe('customer.subscription.updated', () => {
    it('updates subscription status and sets tier to keeper for active', async () => {
      resetChain({ single: { data: { id: 'user_1' } } });

      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_1',
            status: 'active',
            current_period_end: 1700000000,
            items: { data: [{ price: { lookup_key: 'keeper_monthly' } }] },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'active',
          tier: 'keeper',
        }),
      );
    });

    it('sets tier to keeper for trialing status', async () => {
      resetChain({ single: { data: { id: 'user_1' } } });

      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_1',
            status: 'trialing',
            current_period_end: 1700000000,
            items: { data: [{ price: { lookup_key: 'keeper_monthly' } }] },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'keeper',
        }),
      );
    });

    it('sets tier to free for canceled status', async () => {
      resetChain({ single: { data: { id: 'user_1' } } });

      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_1',
            status: 'canceled',
            current_period_end: null,
            items: { data: [{ price: { lookup_key: null } }] },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'canceled',
          tier: 'free',
        }),
      );
    });
  });

  describe('customer.subscription.deleted', () => {
    it('sets status to canceled and tier to free', async () => {
      resetChain({ single: { data: { id: 'user_1' } } });

      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_1',
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'canceled',
          subscription_plan: null,
          tier: 'free',
        }),
      );
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('records payment and ensures active status', async () => {
      resetChain({ single: { data: { id: 'user_1' } } });

      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_1',
            customer: 'cus_1',
            payment_intent: 'pi_inv_1',
            amount_paid: 999,
            currency: 'usd',
            subscription: 'sub_1',
            billing_reason: 'subscription_cycle',
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_1',
          stripe_invoice_id: 'inv_1',
          stripe_payment_intent: 'pi_inv_1',
          amount: 999,
          currency: 'usd',
          status: 'succeeded',
        }),
      );

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'active',
        }),
      );
    });
  });

  describe('invoice.payment_failed', () => {
    it('sets status to past_due', async () => {
      resetChain({ single: { data: { id: 'user_1' } } });

      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_1',
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'past_due',
        }),
      );
    });
  });

  describe('missing user_id in session metadata', () => {
    it('returns early without updating anything', async () => {
      resetChain();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'subscription',
            metadata: {},
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(consoleSpy).toHaveBeenCalledWith('No user_id in checkout session metadata');
      expect(mockSupabaseChain.update).not.toHaveBeenCalled();
      expect(mockSupabaseChain.insert).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('unknown event types', () => {
    it('logs but does not throw', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const event = { type: 'some.unknown.event', data: { object: {} } };

      await expect(handleWebhookEvent(event, baseEnv)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled Stripe event type: some.unknown.event');

      consoleSpy.mockRestore();
    });
  });
});
