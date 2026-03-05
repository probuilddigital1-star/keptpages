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
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Get a Supabase client for server-side operations.
 */
function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * Get price IDs, preferring env-configured values over defaults.
 * Allows Stripe price IDs to be set via env vars without code changes.
 */
function getPriceIds(env) {
  return {
    keeper_monthly: env.STRIPE_PRICE_KEEPER_MONTHLY || 'price_keeper_monthly',
    keeper_yearly: env.STRIPE_PRICE_KEEPER_YEARLY || 'price_keeper_yearly',
    book_order: env.STRIPE_PRICE_BOOK_ORDER || 'price_book_order',
  };
}

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

  const priceIds = getPriceIds(env);
  const priceId = priceIds[plan];
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
 * Create a Stripe Checkout session for a book order (one-time payment).
 * Uses dynamic pricing based on page count and quantity.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {object} book - The book record from the database
 * @param {object} shippingAddress - Shipping address for the order
 * @param {number} quantity - Number of copies to order
 * @param {object} env - Worker environment bindings
 * @returns {Promise<{ sessionId: string, url: string }>}
 */
export async function createBookCheckoutSession(userId, book, shippingAddress, quantity, env) {
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
    const customer = await stripe.customers.create({
      metadata: { supabase_user_id: userId },
      email: profile?.email || undefined,
    });
    customerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  // Calculate price based on page count
  // Base price: $14.99 + $0.02 per page over 50 pages
  const basePrice = 1499; // cents
  const extraPages = Math.max(0, (book.page_count || 50) - 50);
  const perPageCost = 2; // cents per extra page
  const unitPrice = basePrice + (extraPages * perPageCost);

  const appUrl = env.APP_URL || 'https://app.keptpages.com';
  const successUrl = `${appUrl}/app/book/${book.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/app/book/${book.id}?payment=canceled`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Printed Book: ${book.title}`,
            description: `${book.page_count || 0} pages, softcover, ${quantity} ${quantity === 1 ? 'copy' : 'copies'}`,
          },
          unit_amount: unitPrice,
        },
        quantity,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      book_id: book.id,
      quantity: String(quantity),
      shipping_address: JSON.stringify(shippingAddress),
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Cancel a subscription at the end of the current billing period.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {object} env - Worker environment bindings
 * @returns {Promise<{ message: string }>}
 */
export async function cancelSubscription(userId, env) {
  const stripe = getStripe(env);
  const supabase = getSupabase(env);

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  // Cancel at end of period (not immediately)
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update profiles table
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceling',
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Update subscriptions table if it exists for this user
  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('stripe_subscription_id', profile.stripe_subscription_id);

  return { message: 'Subscription will be canceled at the end of the current billing period' };
}

/**
 * Create a Stripe Customer Portal session for managing billing.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {object} env - Worker environment bindings
 * @returns {Promise<{ url: string }>}
 */
export async function createPortalSession(userId, env) {
  const stripe = getStripe(env);
  const supabase = getSupabase(env);

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error('No Stripe customer found. Please subscribe first.');
  }

  const appUrl = env.APP_URL || 'https://app.keptpages.com';

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/app/settings`,
  });

  return { url: session.url };
}

/**
 * Handle a completed book order payment.
 * Creates the Lulu print job after payment succeeds.
 *
 * @param {object} session - The Stripe checkout session
 * @param {object} supabase - Supabase client instance
 * @param {object} env - Worker environment bindings
 */
async function handleBookPaymentCompleted(session, supabase, env) {
  const bookId = session.metadata.book_id;
  const quantity = parseInt(session.metadata.quantity, 10) || 1;

  let shippingAddress;
  try {
    shippingAddress = JSON.parse(session.metadata.shipping_address);
  } catch {
    console.error('Failed to parse shipping address from checkout metadata');
    return;
  }

  // Update book with payment info
  await supabase
    .from('books')
    .update({
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      payment_status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId);

  // Now fulfill the order via Lulu
  try {
    // Dynamically import Lulu service to avoid circular dependency
    const { createProject, createOrder } = await import('./lulu.js');

    // Fetch the book to get PDF keys
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      console.error('Book not found for Lulu fulfillment:', bookId);
      return;
    }

    if (!book.interior_pdf_key || !book.cover_pdf_key) {
      console.error('Book PDFs not ready for Lulu fulfillment:', bookId);
      return;
    }

    const interiorUrl = `${env.R2_PUBLIC_URL || 'https://r2.keptpages.com'}/${book.interior_pdf_key}`;
    const coverUrl = `${env.R2_PUBLIC_URL || 'https://r2.keptpages.com'}/${book.cover_pdf_key}`;

    // Create Lulu project and place order
    const luluProject = await createProject(interiorUrl, coverUrl, book.title, env);
    const order = await createOrder(luluProject.id, shippingAddress, quantity, env);

    // Update book record with Lulu order info
    await supabase
      .from('books')
      .update({
        status: 'ordered',
        lulu_project_id: luluProject.id,
        lulu_order_id: order.id,
        shipping_address: shippingAddress,
        quantity,
        order_cost: order.totalCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId);
  } catch (err) {
    console.error('Lulu fulfillment failed after payment:', err);
    // Mark the book so the admin can manually fulfill
    await supabase
      .from('books')
      .update({
        status: 'error',
        error_message: `Payment succeeded but Lulu order failed: ${err.message}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId);
  }
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
        // Subscription checkout completed — activate the plan
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_plan: session.metadata.plan,
            stripe_subscription_id: session.subscription,
            tier: 'keeper',
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } else if (session.mode === 'payment') {
        // One-time payment — record it
        await supabase.from('payments').insert({
          user_id: userId,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          amount: session.amount_total,
          currency: session.currency,
          status: 'succeeded',
          payment_type: session.metadata.book_id ? 'book_order' : 'one_time',
          metadata: session.metadata,
        });

        // If this is a book order, trigger the Lulu fulfillment
        if (session.metadata.book_id) {
          await handleBookPaymentCompleted(session, supabase, env);
        }
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
        const updateData = {
          subscription_status: subscription.status,
          subscription_plan: subscription.items?.data?.[0]?.price?.lookup_key || null,
          subscription_updated_at: new Date().toISOString(),
          subscription_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        };

        // Set tier based on subscription status
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          updateData.tier = 'keeper';
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          updateData.tier = 'free';
        }

        await supabase
          .from('profiles')
          .update(updateData)
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
            subscription_plan: null,
            tier: 'free',
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

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
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
