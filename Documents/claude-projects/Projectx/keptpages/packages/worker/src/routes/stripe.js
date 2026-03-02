/**
 * Stripe payment routes (protected, require auth).
 * Handles checkout session creation, subscription management, and billing portal.
 * Note: The webhook endpoint is registered separately in index.js as a public route.
 */

import { Hono } from 'hono';
import { validate } from '../middleware/validate.js';
import {
  createCheckoutSession,
  cancelSubscription,
  createPortalSession,
} from '../services/stripe.js';

const stripe = new Hono();

/**
 * POST /stripe/checkout
 * Create a Stripe Checkout session for a subscription or one-time purchase.
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
 * Cancel the user's subscription at the end of the current billing period.
 */
stripe.post('/cancel', async (c) => {
  const user = c.get('user');

  try {
    const result = await cancelSubscription(user.id, c.env);
    return c.json(result);
  } catch (err) {
    console.error('Subscription cancellation failed:', err);
    return c.json({ error: 'Failed to cancel subscription', details: err.message }, 500);
  }
});

/**
 * POST /stripe/portal
 * Create a Stripe Customer Portal session for managing billing.
 */
stripe.post('/portal', async (c) => {
  const user = c.get('user');

  try {
    const result = await createPortalSession(user.id, c.env);
    return c.json(result);
  } catch (err) {
    console.error('Portal session creation failed:', err);
    return c.json({ error: 'Failed to create portal session', details: err.message }, 500);
  }
});

export default stripe;
