/**
 * Stripe payment routes.
 * Handles checkout session creation and webhook processing.
 */

import { Hono } from 'hono';
import Stripe from 'stripe';
import { validate } from '../middleware/validate.js';
import {
  createCheckoutSession,
  handleWebhookEvent,
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
 * POST /stripe/webhook
 * Handle incoming Stripe webhook events.
 * This endpoint does NOT require auth middleware - it uses Stripe signature verification.
 */
stripe.post('/webhook', async (c) => {
  const stripeSecretKey = c.env.STRIPE_SECRET_KEY;
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('Stripe secrets not configured');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Get the raw body for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  let event;
  try {
    event = await stripeClient.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return c.json({ error: 'Invalid webhook signature' }, 400);
  }

  try {
    await handleWebhookEvent(event, c.env);
    return c.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Return 200 even on processing errors to prevent Stripe retries for handled events
    // Only return 500 if it's a transient error that should be retried
    return c.json({ received: true, error: err.message });
  }
});

export default stripe;
