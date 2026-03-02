/**
 * Stripe integration service for subscription and one-time payments.
 * Handles checkout session creation and webhook event processing.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * Initialize the Stripe client.
 */
function getStripe(env) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Get a Supabase client for server-side operations.
 */
function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

// Price IDs - these should match what's configured in your Stripe dashboard
const PRICE_IDS = {
  keeper_monthly: 'price_keeper_monthly',
  keeper_yearly: 'price_keeper_yearly',
  book_order: 'price_book_order',
};

/**
 * Create a Stripe Checkout session for a subscription or one-time payment.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} plan - Plan identifier (e.g., 'keeper_monthly', 'keeper_yearly', 'book_order')
 * @param {object} env - Worker environment bindings
 * @param {object} [metadata] - Additional metadata (e.g., bookId for book orders)
 * @returns {Promise<{ sessionId: string, url: string }>}
 */
export async function createCheckoutSession(userId, plan, env, metadata = {}) {
  const stripe = getStripe(env);
  const supabase = getSupabase(env);

  // Look up or create a Stripe customer for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      metadata: { supabase_user_id: userId },
      email: profile?.email || undefined,
    });
    customerId = customer.id;

    // Save the Stripe customer ID
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  const priceId = PRICE_IDS[plan] || env[`STRIPE_PRICE_${plan.toUpperCase()}`];
  if (!priceId) {
    throw new Error(`Unknown plan: ${plan}`);
  }

  const isSubscription = plan.includes('monthly') || plan.includes('yearly');
  const successUrl = `${env.APP_URL || 'https://keptpages.com'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${env.APP_URL || 'https://keptpages.com'}/checkout/cancel`;

  const sessionParams = {
    customer: customerId,
    mode: isSubscription ? 'subscription' : 'payment',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plan,
      ...metadata,
    },
  };

  // Allow promo codes for subscriptions
  if (isSubscription) {
    sessionParams.allow_promotion_codes = true;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Handle incoming Stripe webhook events.
 * Updates subscription status and records in Supabase.
 *
 * @param {object} event - The verified Stripe event object
 * @param {object} env - Worker environment bindings
 */
export async function handleWebhookEvent(event, env) {
  const supabase = getSupabase(env);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.user_id;

      if (!userId) {
        console.error('No user_id in checkout session metadata');
        return;
      }

      if (session.mode === 'subscription') {
        // Subscription checkout completed
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_plan: session.metadata.plan,
            stripe_subscription_id: session.subscription,
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } else if (session.mode === 'payment') {
        // One-time payment (e.g., book order)
        await supabase.from('payments').insert({
          user_id: userId,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          amount: session.amount_total,
          currency: session.currency,
          status: 'completed',
          metadata: session.metadata,
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Find the user by Stripe customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_plan: subscription.items?.data?.[0]?.price?.lookup_key || null,
            subscription_updated_at: new Date().toISOString(),
            subscription_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          })
          .eq('id', profile.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_plan: 'free',
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        // Record the successful payment
        await supabase.from('payments').insert({
          user_id: profile.id,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent: invoice.payment_intent,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          metadata: {
            subscription_id: invoice.subscription,
            billing_reason: invoice.billing_reason,
          },
        });

        // Ensure subscription status is active after successful payment
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}
