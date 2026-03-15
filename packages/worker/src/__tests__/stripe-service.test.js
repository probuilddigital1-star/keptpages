/**
 * Tests for the Stripe service (services/stripe.js).
 * Mocks: stripe module, @supabase/supabase-js createClient.
 *
 * Updated for pricing restructure: subscription plans removed,
 * Keeper Pass ($59 one-time) + book tiers/addons model.
 */

// ── Stripe mock ────────────────────────────────────────────────────────────────
const mockStripeInstance = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
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
  maybeSingle: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  limit: vi.fn(),
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
  createProject: vi.fn().mockResolvedValue({ id: 'lulu_proj_1', totalCost: 2500 }),
  resolvePrintOptionsFromTier: vi.fn((tier, addons = []) => {
    const base = { classic: { binding: 'PB' }, premium: { binding: 'CW' }, heirloom: { binding: 'CW' } }[tier] || { binding: 'PB' };
    if (addons.includes('coil')) base.binding = 'CO';
    return base;
  }),
}));

// ── Dynamic import mock for pdf.js (used for cover regeneration in webhook) ──
vi.mock('../services/pdf.js', () => ({
  generateCoverPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70, 99])),
  calculateSpineWidth: vi.fn().mockReturnValue(0.25),
}));

// ── Import the module under test AFTER mocks are set up ────────────────────────
import {
  createCheckoutSession,
  createBookCheckoutSession,
  handleWebhookEvent,
} from '../services/stripe.js';

// ── Helpers ────────────────────────────────────────────────────────────────────
const baseEnv = {
  STRIPE_SECRET_KEY: 'sk_test_xxx',
  STRIPE_PRICE_KEEPER_PASS: 'price_keeper_pass_123',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'service-key',
  APP_URL: 'https://app.keptpages.com',
  PROCESSED: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  },
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
  if (overrides.maybeSingle) {
    mockSupabaseChain.maybeSingle.mockResolvedValue(overrides.maybeSingle);
  } else {
    mockSupabaseChain.maybeSingle.mockResolvedValue({ data: null, error: null });
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
});

// ════════════════════════════════════════════════════════════════════════════════
// createCheckoutSession (Keeper Pass only)
// ════════════════════════════════════════════════════════════════════════════════
describe('createCheckoutSession', () => {
  it('creates a new Stripe customer when none exists and saves customer ID', async () => {
    resetChain({ single: { data: { stripe_customer_id: null, email: 'test@example.com' } } });

    await createCheckoutSession('user_1', 'keeper_pass', baseEnv);

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

    await createCheckoutSession('user_1', 'keeper_pass', baseEnv);

    expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
  });

  it('creates a payment-mode session for keeper_pass', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await createCheckoutSession('user_1', 'keeper_pass', baseEnv);

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment' }),
    );
  });

  it('includes keeper_pass plan in metadata', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await createCheckoutSession('user_1', 'keeper_pass', baseEnv);

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ plan: 'keeper_pass', user_id: 'user_1' }),
      }),
    );
  });

  it('uses the STRIPE_PRICE_KEEPER_PASS price ID', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await createCheckoutSession('user_1', 'keeper_pass', baseEnv);

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_keeper_pass_123', quantity: 1 }],
      }),
    );
  });

  it('throws when STRIPE_PRICE_KEEPER_PASS is not configured', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    const envWithoutPrice = { ...baseEnv, STRIPE_PRICE_KEEPER_PASS: undefined };

    await expect(createCheckoutSession('user_1', 'keeper_pass', envWithoutPrice)).rejects.toThrow(
      'STRIPE_PRICE_KEEPER_PASS env var is not configured',
    );
  });

  it('throws for an unknown plan', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await expect(createCheckoutSession('user_1', 'keeper_monthly', baseEnv)).rejects.toThrow(
      "Unknown plan: keeper_monthly. Only 'keeper_pass' is supported.",
    );
  });

  it('throws for subscription plans that no longer exist', async () => {
    resetChain({
      single: { data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } },
    });

    await expect(createCheckoutSession('user_1', 'keeper_yearly', baseEnv)).rejects.toThrow(
      "Unknown plan: keeper_yearly. Only 'keeper_pass' is supported.",
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// createBookCheckoutSession (bookTier + addons model)
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
    // First .single() = getOrCreateCustomer profile lookup
    // Second .single() = profile for keeper discount lookup
    resetChain();
    mockSupabaseChain.single
      .mockResolvedValueOnce({ data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } })
      .mockResolvedValueOnce({ data: { tier: 'free', book_discount_percent: null } });
  });

  it('uses classic tier pricing by default (40 pages → 3900 cents)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    // classic = 3900, 40 pages <= 60 free pages = no extra
    expect(arg.line_items[0].price_data.unit_amount).toBe(3900);
  });

  it('adds per-extra-page cost for pages over 60 (80 pages classic → 3900 + 20*35 = 4600)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 80 }), shippingAddress, 1, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(3900 + 20 * 35);
  });

  it('uses premium tier pricing (6900 base)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv, 'premium');

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(6900);
  });

  it('uses heirloom tier pricing (7900 base)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv, 'heirloom');

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(7900);
  });

  it('applies color addon (+1000 cents for classic tier)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv, 'classic', ['color']);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(3900 + 1000);
  });

  it('applies coil addon (+800 cents)', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv, 'classic', ['coil']);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.line_items[0].price_data.unit_amount).toBe(3900 + 800);
  });

  it('applies multiple addons together', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv, 'classic', ['color', 'coil']);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    // 3900 base + 1000 color + 800 coil = 5700
    expect(arg.line_items[0].price_data.unit_amount).toBe(3900 + 1000 + 800);
  });

  it('ignores color addon for non-classic tiers', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv, 'premium', ['color']);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    // color addon skipped for premium
    expect(arg.line_items[0].price_data.unit_amount).toBe(6900);
  });

  it('builds description with tier label', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 60 }), shippingAddress, 1, baseEnv, 'premium');

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    const desc = arg.line_items[0].price_data.product_data.description;
    expect(desc).toContain('Premium (Hardcover, Full Color)');
    expect(desc).toContain('60 pages');
  });

  it('builds description with addons listed', async () => {
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 1, baseEnv, 'classic', ['coil']);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    const desc = arg.line_items[0].price_data.product_data.description;
    expect(desc).toContain('Classic (Softcover, B&W)');
    expect(desc).toContain('coil');
  });

  it('includes correct metadata (user_id, book_id, quantity, shipping, book_tier, addons)', async () => {
    await createBookCheckoutSession('user_1', makeBook(), shippingAddress, 3, baseEnv, 'classic', ['coil']);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(arg.metadata).toEqual({
      user_id: 'user_1',
      book_id: 'book_42',
      quantity: '3',
      shipping_address: JSON.stringify(shippingAddress),
      book_tier: 'classic',
      addons: JSON.stringify(['coil']),
    });
  });

  it('creates a Stripe customer if none exists', async () => {
    resetChain();
    mockSupabaseChain.single
      .mockResolvedValueOnce({ data: { stripe_customer_id: null, email: 'new@user.com' } })
      .mockResolvedValueOnce({ data: { tier: 'free', book_discount_percent: null } });

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

  it('applies 15% multi-copy discount for 3+ copies', async () => {
    // 3 copies of classic 40 pages = 3900 * 3 = 11700 * 0.85 = 9945
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 3, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    const expectedTotal = Math.round(3900 * 3 * 0.85);
    const expectedPerUnit = Math.round(expectedTotal / 3);
    expect(arg.line_items[0].price_data.unit_amount).toBe(expectedPerUnit);
  });

  it('applies 20% multi-copy discount for 5+ copies', async () => {
    // 5 copies of classic 40 pages = 3900 * 5 = 19500 * 0.80 = 15600
    await createBookCheckoutSession('user_1', makeBook({ page_count: 40 }), shippingAddress, 5, baseEnv);

    const arg = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    const expectedTotal = Math.round(3900 * 5 * 0.80);
    const expectedPerUnit = Math.round(expectedTotal / 5);
    expect(arg.line_items[0].price_data.unit_amount).toBe(expectedPerUnit);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// calculateBookUnitPrice (tested indirectly through createBookCheckoutSession)
// ════════════════════════════════════════════════════════════════════════════════
describe('calculateBookUnitPrice (via createBookCheckoutSession)', () => {
  const shippingAddress = { street: '1 Main' };

  const getUnitAmount = async (pageCount, bookTier = 'classic', addons = []) => {
    vi.clearAllMocks();
    resetChain();
    mockSupabaseChain.single
      .mockResolvedValueOnce({ data: { stripe_customer_id: 'cus_1', email: 'a@b.com' } })
      .mockResolvedValueOnce({ data: { tier: 'free', book_discount_percent: null } });
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      id: 'cs_t', url: 'https://checkout.stripe.com/s',
    });

    await createBookCheckoutSession(
      'u1',
      { id: 'b1', title: 'T', page_count: pageCount },
      shippingAddress, 1, baseEnv,
      bookTier, addons,
    );
    return mockStripeInstance.checkout.sessions.create.mock.calls[0][0].line_items[0].price_data.unit_amount;
  };

  it('classic 40 pages → 3900 cents', async () => {
    expect(await getUnitAmount(40)).toBe(3900);
  });

  it('classic 80 pages → 3900 + 20*35 = 4600 cents', async () => {
    expect(await getUnitAmount(80)).toBe(3900 + 20 * 35);
  });

  it('premium 40 pages → 6900 cents', async () => {
    expect(await getUnitAmount(40, 'premium')).toBe(6900);
  });

  it('heirloom 40 pages → 7900 cents', async () => {
    expect(await getUnitAmount(40, 'heirloom')).toBe(7900);
  });

  it('with color addon (classic): +1000 cents', async () => {
    expect(await getUnitAmount(40, 'classic', ['color'])).toBe(3900 + 1000);
  });

  it('with coil addon: +800 cents', async () => {
    expect(await getUnitAmount(40, 'classic', ['coil'])).toBe(3900 + 800);
  });

  it('0 pages defaults to base price (no extra page cost)', async () => {
    expect(await getUnitAmount(0)).toBe(3900);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// handleWebhookEvent
// ════════════════════════════════════════════════════════════════════════════════
describe('handleWebhookEvent', () => {
  describe('checkout.session.completed (keeper_pass)', () => {
    it('activates keeper pass and sets tier to keeper', async () => {
      resetChain();

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            id: 'cs_kp_1',
            payment_intent: 'pi_kp_1',
            amount_total: 5900,
            currency: 'usd',
            metadata: { user_id: 'user_1', plan: 'keeper_pass' },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      // Should upgrade profile to keeper tier
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'keeper',
          keeper_pass_purchased_at: expect.any(String),
          book_discount_percent: 15,
        }),
      );

      // Should record the payment
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_1',
          stripe_session_id: 'cs_kp_1',
          stripe_payment_intent: 'pi_kp_1',
          amount: 5900,
          currency: 'usd',
          status: 'succeeded',
          payment_type: 'keeper_pass',
        }),
      );
    });
  });

  describe('checkout.session.completed (legacy subscription)', () => {
    it('activates subscription plan and sets tier to keeper', async () => {
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

  describe('checkout.session.completed (payment / book order)', () => {
    it('records payment in the payments table', async () => {
      resetChain();

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            id: 'cs_pay_1',
            payment_intent: 'pi_1',
            amount_total: 3900,
            currency: 'usd',
            metadata: { user_id: 'user_1' },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_1',
          stripe_session_id: 'cs_pay_1',
          stripe_payment_intent: 'pi_1',
          amount: 3900,
          currency: 'usd',
          status: 'succeeded',
          payment_type: 'one_time',
        }),
      );
    });

    it('triggers book fulfillment when book_id is present', async () => {
      const { createProject } = await import('../services/lulu.js');
      const { generateCoverPdf } = await import('../services/pdf.js');

      // handleBookPaymentCompleted calls .single() twice:
      // 1st: profile tier upgrade check, 2nd: book fetch
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { tier: 'free', first_book_purchased_at: null } })
        .mockResolvedValueOnce({
          data: {
            id: 'book_42',
            interior_pdf_key: 'interior.pdf',
            cover_pdf_key: 'cover.pdf',
            title: 'Test Book',
            page_count: 40,
            cover_design: { title: 'Test Book', colorScheme: 'default', layout: 'centered' },
          },
        });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            id: 'cs_book_1',
            payment_intent: 'pi_book_1',
            amount_total: 3900,
            currency: 'usd',
            metadata: {
              user_id: 'user_1',
              book_id: 'book_42',
              quantity: '1',
              shipping_address: JSON.stringify({ street: '1 Main' }),
              book_tier: 'classic',
              addons: JSON.stringify([]),
            },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      // Payment recorded
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_type: 'book_order',
        }),
      );

      // Cover regenerated with correct binding type
      expect(generateCoverPdf).toHaveBeenCalled();

      // Lulu fulfillment actually triggered
      expect(createProject).toHaveBeenCalled();

      // Book status updated to ordered (project_id and order_id are the same in Lulu's API)
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ordered',
          lulu_project_id: 'lulu_proj_1',
          lulu_order_id: 'lulu_proj_1',
        }),
      );
    });

    it('regenerates cover PDF with correct binding type before Lulu submission', async () => {
      const { generateCoverPdf } = await import('../services/pdf.js');
      const { resolvePrintOptionsFromTier } = await import('../services/lulu.js');

      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { tier: 'free', first_book_purchased_at: null } }) // profile check
        .mockResolvedValueOnce({  // book fetch
          data: {
            id: 'book_42',
            interior_pdf_key: 'u1/books/b1/interior.pdf',
            cover_pdf_key: 'u1/books/b1/cover.pdf',
            title: 'My Book',
            page_count: 60,
            cover_design: { title: 'My Book', subtitle: 'Sub', author: 'Auth', colorScheme: 'midnight', layout: 'centered' },
          },
        });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            id: 'cs_cover_regen',
            payment_intent: 'pi_regen',
            amount_total: 6900,
            currency: 'usd',
            metadata: {
              user_id: 'user_1',
              book_id: 'book_42',
              quantity: '1',
              shipping_address: JSON.stringify({ street: '1 Main' }),
              book_tier: 'premium',
              addons: JSON.stringify([]),
            },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      // Should resolve print options for premium → CW binding
      expect(resolvePrintOptionsFromTier).toHaveBeenCalledWith('premium', []);

      // Should regenerate cover with CW binding type
      expect(generateCoverPdf).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Book', colorScheme: 'midnight' }),
        60,
        null,  // non-blueprint book
        'CW',
      );

      // Should upload regenerated cover to R2
      expect(baseEnv.PROCESSED.put).toHaveBeenCalledWith(
        'u1/books/b1/cover.pdf',
        expect.anything(),
        expect.objectContaining({ httpMetadata: { contentType: 'application/pdf' } }),
      );
    });

    it('regenerates cover with CO binding when coil addon is selected', async () => {
      const { generateCoverPdf } = await import('../services/pdf.js');

      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { tier: 'free', first_book_purchased_at: null } }) // profile check
        .mockResolvedValueOnce({  // book fetch
          data: {
            id: 'book_42',
            interior_pdf_key: 'u1/books/b1/interior.pdf',
            cover_pdf_key: 'u1/books/b1/cover.pdf',
            title: 'Coil Book',
            page_count: 40,
            cover_design: { title: 'Coil Book', colorScheme: 'default', layout: 'centered' },
          },
        });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            id: 'cs_coil',
            payment_intent: 'pi_coil',
            amount_total: 4700,
            currency: 'usd',
            metadata: {
              user_id: 'user_1',
              book_id: 'book_42',
              quantity: '1',
              shipping_address: JSON.stringify({ street: '1 Main' }),
              book_tier: 'classic',
              addons: JSON.stringify(['coil']),
            },
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      // Should regenerate cover with CO binding type (coil addon)
      expect(generateCoverPdf).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Coil Book' }),
        40,
        null,
        'CO',
      );
    });
  });

  describe('customer.subscription.updated (legacy)', () => {
    it('updates subscription status for non-keeper-pass users', async () => {
      resetChain({ single: { data: { id: 'user_1', keeper_pass_purchased_at: null } } });

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
        }),
      );
    });

    it('does not update tier to keeper for active status (legacy handler is minimal)', async () => {
      resetChain({ single: { data: { id: 'user_1', keeper_pass_purchased_at: null } } });

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

      // Legacy handler only sets subscription_status, does NOT set tier for active
      const updateCall = mockSupabaseChain.update.mock.calls.find(
        (c) => c[0]?.subscription_status === 'active'
      );
      expect(updateCall).toBeTruthy();
      expect(updateCall[0].tier).toBeUndefined();
    });

    it('does not downgrade keeper_pass holders', async () => {
      resetChain({ single: { data: { id: 'user_1', keeper_pass_purchased_at: '2026-01-01T00:00:00Z' } } });

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

      // Should NOT call update since keeper_pass_purchased_at is set
      expect(mockSupabaseChain.update).not.toHaveBeenCalled();
    });

    it('sets tier to free for canceled status (non-keeper-pass user)', async () => {
      resetChain({ single: { data: { id: 'user_1', keeper_pass_purchased_at: null } } });

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

  describe('customer.subscription.deleted (legacy)', () => {
    it('sets status to canceled and tier to free for non-keeper-pass users', async () => {
      resetChain({ single: { data: { id: 'user_1', keeper_pass_purchased_at: null } } });

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

    it('does not downgrade keeper_pass holders on subscription deletion', async () => {
      resetChain({ single: { data: { id: 'user_1', keeper_pass_purchased_at: '2026-01-15T00:00:00Z' } } });

      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_1',
          },
        },
      };

      await handleWebhookEvent(event, baseEnv);

      expect(mockSupabaseChain.update).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('records payment in the payments table', async () => {
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
