/**
 * Stripe integration service for one-time payments and book orders.
 * Handles Keeper Pass ($59 one-time), book checkout sessions with
 * named tiers + add-ons, and webhook event processing.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ── Book pricing (must match frontend plans.js) ────────────────────────────

const BOOK_TIER_PRICES = { classic: 3900, premium: 6900, heirloom: 7900 };
const BOOK_ADDON_PRICES = { glossy: 0, coil: 800, color: 1000 };
const FREE_PAGES = 60;
const PER_EXTRA_PAGE = 35; // cents

const BOOK_TIER_LABELS = {
  classic: 'Classic (Softcover, B&W)',
  premium: 'Premium (Hardcover, Full Color)',
  heirloom: 'Heirloom (Hardcover, Premium Paper)',
};

// ── Multi-Copy Discount Tiers ───────────────────────────────────────────────

function getMultiCopyDiscount(quantity) {
  if (quantity >= 5) return 0.20;
  if (quantity >= 3) return 0.15;
  return 0;
}

/**
 * Generate a signed public URL for an R2 file so Lulu can fetch it.
 */
async function getSignedFileUrl(apiBase, r2Key, env) {
  const encoder = new TextEncoder();
  const data = encoder.encode(r2Key + env.SUPABASE_SERVICE_KEY);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const token = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  return `${apiBase}/api/public/files/${token}/${r2Key}`;
}

function getStripe(env) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * Get or create a Stripe customer for a user.
 */
async function getOrCreateCustomer(userId, stripe, supabase) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  // Email lives in auth.users, not profiles
  let email = null;
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    email = user?.email || null;
  } catch {
    // Skip email lookup failure
  }

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { supabase_user_id: userId },
      email: email || undefined,
    });
    customerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  return { customerId, email };
}

/**
 * Create a Stripe Checkout session for a Keeper Pass (one-time $59).
 */
export async function createCheckoutSession(userId, plan, env, metadata = {}) {
  const stripe = getStripe(env);
  const supabase = getSupabase(env);
  const { customerId, email } = await getOrCreateCustomer(userId, stripe, supabase);

  if (plan !== 'keeper_pass') {
    throw new Error(`Unknown plan: ${plan}. Only 'keeper_pass' is supported.`);
  }

  const priceId = env.STRIPE_PRICE_KEEPER_PASS;
  if (!priceId) {
    throw new Error('STRIPE_PRICE_KEEPER_PASS env var is not configured');
  }

  const appUrl = env.APP_URL || 'https://app.keptpages.com';
  const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=keeper`;
  const cancelUrl = `${appUrl}/checkout/cancel`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(email ? { payment_intent_data: { receipt_email: email } } : {}),
    metadata: {
      user_id: userId,
      plan: 'keeper_pass',
      ...metadata,
    },
  });

  return { sessionId: session.id, url: session.url };
}

/**
 * Calculate book unit price in cents from tier + addons + page count.
 */
function calculateBookUnitPrice(pageCount, bookTier, addons = []) {
  const basePrice = BOOK_TIER_PRICES[bookTier];
  if (basePrice === undefined) throw new Error(`Unknown book tier: ${bookTier}`);

  let unitPrice = basePrice;

  for (const addonId of addons) {
    const addonPrice = BOOK_ADDON_PRICES[addonId];
    if (addonPrice === undefined) continue;
    // Color addon only valid for classic
    if (addonId === 'color' && bookTier !== 'classic') continue;
    unitPrice += addonPrice;
  }

  const extraPages = Math.max(0, pageCount - FREE_PAGES);
  unitPrice += extraPages * PER_EXTRA_PAGE;

  return unitPrice;
}

/**
 * Create a Stripe Checkout session for a book order.
 * Uses named book tiers + addons instead of raw print options.
 */
export async function createBookCheckoutSession(userId, book, shippingAddress, quantity, env, bookTier = 'classic', addons = []) {
  const stripe = getStripe(env);
  const supabase = getSupabase(env);
  const { customerId, email } = await getOrCreateCustomer(userId, stripe, supabase);

  // Fetch user profile for keeper discount
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, book_discount_percent')
    .eq('id', userId)
    .single();

  const keeperDiscount = profile?.book_discount_percent === 15;
  const unitPrice = calculateBookUnitPrice(book.page_count || 0, bookTier, addons);

  // Apply multi-copy discount
  let totalCents = unitPrice * quantity;
  const multiDiscount = getMultiCopyDiscount(quantity);
  if (multiDiscount > 0) {
    totalCents = Math.round(totalCents * (1 - multiDiscount));
  }

  // Apply keeper 15% discount
  if (keeperDiscount) {
    totalCents = Math.round(totalCents * 0.85);
  }

  // Per-unit amount for Stripe (total / quantity, rounded)
  const stripeUnitAmount = Math.round(totalCents / quantity);

  const tierLabel = BOOK_TIER_LABELS[bookTier] || bookTier;
  const addonLabels = addons.filter(a => BOOK_ADDON_PRICES[a] !== undefined).join(', ');
  const description = `KeptPages Book — ${tierLabel}${addonLabels ? `, ${addonLabels}` : ''}, ${book.page_count || 0} pages`;

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
            description,
          },
          unit_amount: stripeUnitAmount,
        },
        quantity,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(email ? { payment_intent_data: { receipt_email: email } } : {}),
    metadata: {
      user_id: userId,
      book_id: book.id,
      quantity: String(quantity),
      shipping_address: JSON.stringify(shippingAddress),
      book_tier: bookTier,
      addons: JSON.stringify(addons),
    },
  });

  return { sessionId: session.id, url: session.url };
}

/**
 * Handle a completed book order payment.
 * Creates the Lulu print job after payment succeeds.
 */
async function handleBookPaymentCompleted(session, supabase, env) {
  const bookId = session.metadata.book_id;
  const userId = session.metadata.user_id;
  const quantity = parseInt(session.metadata.quantity, 10) || 1;

  let shippingAddress;
  try {
    shippingAddress = JSON.parse(session.metadata.shipping_address);
  } catch {
    console.error('Failed to parse shipping address from checkout metadata');
    return;
  }

  // Extract book tier and addons from metadata
  const bookTier = session.metadata.book_tier || 'classic';
  let addons = [];
  try {
    if (session.metadata.addons) {
      addons = JSON.parse(session.metadata.addons);
    }
  } catch {
    console.error('Failed to parse addons from checkout metadata');
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

  // Upgrade free users to book_purchaser on first book purchase
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, first_book_purchased_at')
      .eq('id', userId)
      .single();

    if (profile && !profile.first_book_purchased_at) {
      const updates = { first_book_purchased_at: new Date().toISOString() };
      if (profile.tier === 'free') {
        updates.tier = 'book_purchaser';
      }
      await supabase.from('profiles').update(updates).eq('id', userId);
    }
  }

  // Now fulfill the order via Lulu
  try {
    const { createProject } = await import('./lulu.js');

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

    // Regenerate cover PDF with the correct binding type for this order
    const { resolvePrintOptionsFromTier } = await import('./lulu.js');
    const { generateCoverPdf } = await import('./pdf.js');
    const printOptions = resolvePrintOptionsFromTier(bookTier, addons);
    const bindingType = printOptions.binding; // PB, CW, or CO

    // Build cover data from book's stored cover design
    const coverDesign = book.customization?.coverDesign || book.cover_design || {};
    const coverData = {
      title: coverDesign.title || book.title,
      subtitle: coverDesign.subtitle || book.subtitle,
      author: coverDesign.author || book.author,
      colorScheme: coverDesign.colorScheme || 'default',
      layout: coverDesign.layout || 'centered',
      photoBytes: null,
      photoMimeType: null,
      fontFamily: book.customization?.globalSettings?.fontFamily || null,
    };

    // Fetch cover photo from R2 if available
    const photoKey = coverDesign.photoKey;
    if (photoKey) {
      try {
        const photoObj = await env.PROCESSED.get(photoKey);
        if (photoObj) {
          coverData.photoBytes = new Uint8Array(await photoObj.arrayBuffer());
          coverData.photoMimeType = coverDesign.photoMimeType || 'image/jpeg';
        }
      } catch (err) {
        console.error('Cover photo R2 fetch failed during fulfillment:', err?.message || err);
      }
    }

    // Regenerate cover with binding-specific spine width
    // Always pass env so fonts are loaded from KV and embedded (Lulu rejects unembedded StandardFonts)
    const coverPdf = await generateCoverPdf(coverData, book.page_count, env, bindingType);

    // Overwrite cover PDF in R2 with binding-correct version
    await env.PROCESSED.put(book.cover_pdf_key, coverPdf, {
      httpMetadata: { contentType: 'application/pdf' },
    });

    const apiBase = env.API_BASE_URL || 'https://api.keptpages.com';
    const interiorUrl = await getSignedFileUrl(apiBase, book.interior_pdf_key, env);
    const coverUrl = await getSignedFileUrl(apiBase, book.cover_pdf_key, env);

    // Pass bookTier + addons + shipping to Lulu (createProject resolves print options internally)
    // Use business email for Lulu contact (not customer email — Lulu sends printing cost receipts to this)
    const luluContactEmail = env.LULU_CONTACT_EMAIL || 'probuilddigital1@gmail.com';
    const luluProject = await createProject(interiorUrl, coverUrl, book.title, env, bookTier, addons, shippingAddress, luluContactEmail);

    await supabase
      .from('books')
      .update({
        status: 'ordered',
        lulu_project_id: luluProject.id,
        lulu_order_id: luluProject.id,
        shipping_address: shippingAddress,
        quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId);

    // Send order confirmation email (fire-and-forget)
    try {
      const { sendEmail, buildOrderConfirmationEmail } = await import('./email.js');
      const TIER_LABELS = {
        classic: 'Classic (Softcover, B&W)',
        premium: 'Premium (Hardcover, Full Color)',
        heirloom: 'Heirloom (Hardcover, Premium Paper)',
      };
      const recipientEmail = shippingAddress.email;
      if (recipientEmail) {
        const appUrl = env.APP_URL || 'https://app.keptpages.com';
        const { subject, html } = buildOrderConfirmationEmail({
          title: book.title,
          tierLabel: TIER_LABELS[bookTier] || bookTier,
          quantity,
          totalCents: session.amount_total,
          shippingAddress,
          appUrl,
        });
        await sendEmail(recipientEmail, subject, html, env);
      }
    } catch (emailErr) {
      console.error('Order confirmation email failed (non-fatal):', emailErr?.message || emailErr);
    }
  } catch (err) {
    console.error('Lulu fulfillment failed after payment:', err);
    const errorMsg = `Payment succeeded but Lulu order failed: ${err.message}`;
    await supabase
      .from('books')
      .update({
        status: 'error',
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId);

    // Notify customer of failure (fire-and-forget)
    try {
      const { sendEmail, buildOrderFailureEmail } = await import('./email.js');
      const recipientEmail = shippingAddress?.email;
      if (recipientEmail) {
        const appUrl = env.APP_URL || 'https://app.keptpages.com';
        const { data: bookData } = await supabase.from('books').select('title').eq('id', bookId).single();
        const { subject, html } = buildOrderFailureEmail({
          title: bookData?.title || 'Your Book',
          errorMessage: 'Our printing partner was unable to process your order. Our team has been notified and will resolve this shortly.',
          appUrl,
        });
        await sendEmail(recipientEmail, subject, html, env);
      }
    } catch (emailErr) {
      console.error('Order failure email failed (non-fatal):', emailErr?.message || emailErr);
    }
  }
}

/**
 * Handle incoming Stripe webhook events.
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

      if (session.metadata.plan === 'keeper_pass') {
        // Keeper Pass one-time purchase
        await supabase
          .from('profiles')
          .update({
            tier: 'keeper',
            keeper_pass_purchased_at: new Date().toISOString(),
            book_discount_percent: 15,
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // Record the payment
        await supabase.from('payments').insert({
          user_id: userId,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          amount: session.amount_total,
          currency: session.currency,
          status: 'succeeded',
          payment_type: 'keeper_pass',
          metadata: session.metadata,
        });
      } else if (session.mode === 'payment') {
        // One-time payment (book order or other)
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

        if (session.metadata.book_id) {
          await handleBookPaymentCompleted(session, supabase, env);
        }
      } else if (session.mode === 'subscription') {
        // Legacy subscription handling (kept for safety)
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
      }
      break;
    }

    // Legacy subscription handlers (kept minimal for safety)
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, keeper_pass_purchased_at')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        // Don't downgrade Keeper Pass holders if their legacy subscription changes
        if (profile.keeper_pass_purchased_at) break;

        const updateData = {
          subscription_status: subscription.status,
          subscription_updated_at: new Date().toISOString(),
        };

        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          updateData.tier = 'free';
        }

        await supabase.from('profiles').update(updateData).eq('id', profile.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, keeper_pass_purchased_at')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile && !profile.keeper_pass_purchased_at) {
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
