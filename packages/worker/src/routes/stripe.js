/**
 * Stripe payment routes (protected, require auth).
 * Handles Keeper Pass checkout. Legacy subscription routes return errors.
 * Note: The webhook endpoint is registered separately in index.js as a public route.
 */

import { Hono } from 'hono';
import { validate } from '../middleware/validate.js';
import { createCheckoutSession } from '../services/stripe.js';

const stripe = new Hono();

/**
 * POST /stripe/checkout
 * Create a Stripe Checkout session for a Keeper Pass purchase.
 */
stripe.post(
  '/checkout',
  validate({
    plan: { required: true, type: 'string' },
    metadata: { required: false, type: 'object' },
  }),
  async (c) => {
    const user = c.get('user');
    const body = c.get('body');

    try {
      const session = await createCheckoutSession(
        user.id,
        body.plan,
        c.env,
        body.metadata || {}
      );

      return c.json({
        sessionId: session.sessionId,
        url: session.url,
      });
    } catch (err) {
      console.error('Checkout session creation failed:', err);
      return c.json({ error: 'Failed to create checkout session', details: err.message }, 500);
    }
  }
);

/**
 * POST /stripe/cancel
 * Legacy subscription cancel — no longer supported.
 */
stripe.post('/cancel', async (c) => {
  return c.json({ error: 'Subscription cancellation is no longer supported. KeptPages now uses one-time purchases.' }, 400);
});

/**
 * POST /stripe/portal
 * Legacy billing portal — no longer supported.
 */
stripe.post('/portal', async (c) => {
  return c.json({ error: 'Billing portal is no longer supported. KeptPages now uses one-time purchases.' }, 400);
});

export default stripe;
