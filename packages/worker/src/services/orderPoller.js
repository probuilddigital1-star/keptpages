/**
 * Order status poller service.
 * Called by the scheduled (cron) handler to poll Lulu for status updates
 * on active orders and send shipping notification emails.
 */

import { createClient } from '@supabase/supabase-js';
import { getOrderStatus } from './lulu.js';
import { sendEmail, buildShippingNotificationEmail } from './email.js';

// Map Lulu status names to our local status values
const LULU_STATUS_MAP = {
  CREATED: 'ordered',
  UNPAID: 'ordered',
  PAYMENT_IN_PROGRESS: 'ordered',
  PRODUCTION_READY: 'ordered',
  PRODUCTION_DELAYED: 'printing',
  IN_PRODUCTION: 'printing',
  PRODUCTION: 'printing',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
  REJECTED: 'error',
  ERROR: 'error',
};

/**
 * Poll all active orders for status updates.
 * @param {object} env - Worker environment bindings
 */
export async function pollOrderStatuses(env) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Fetch books that have active Lulu orders (ordered or printing)
  const { data: books, error } = await supabase
    .from('books')
    .select('id, status, lulu_order_id, title, shipping_address, user_id, email_notifications_sent')
    .in('status', ['ordered', 'printing'])
    .not('lulu_order_id', 'is', null);

  if (error) {
    console.error('[orderPoller] Failed to fetch active orders:', error);
    return { polled: 0, updated: 0, errors: 1 };
  }

  if (!books || books.length === 0) {
    return { polled: 0, updated: 0, errors: 0 };
  }

  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      // Skip mock orders (used in dev/testing)
      if (book.lulu_order_id.startsWith('mock-')) continue;

      const orderStatus = await getOrderStatus(book.lulu_order_id, env);
      const newStatus = LULU_STATUS_MAP[orderStatus.status] || book.status;

      if (newStatus === book.status) continue;

      // Status changed — update DB
      const updatePayload = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Store error message from Lulu when rejected/errored
      if (newStatus === 'error' && orderStatus.statusMessage) {
        updatePayload.error_message = `Lulu: ${orderStatus.statusMessage}`;
      }

      // Store tracking info from Lulu when shipped
      if (newStatus === 'shipped' && orderStatus.lineItems?.length > 0) {
        const trackingItem = orderStatus.lineItems.find((li) => li.trackingId);
        if (trackingItem) {
          updatePayload.shipping_address = {
            ...(book.shipping_address || {}),
            trackingId: trackingItem.trackingId,
            trackingUrl: trackingItem.trackingUrl,
          };
        }
      }

      await supabase.from('books').update(updatePayload).eq('id', book.id);
      updated++;

      // Send shipping notification email (idempotent)
      if (newStatus === 'shipped') {
        await sendShippingEmailIfNeeded(book, orderStatus, supabase, env);
      }
    } catch (err) {
      console.error(`[orderPoller] Error polling book ${book.id}:`, err?.message || err);
      errors++;
    }
  }

  console.log(`[orderPoller] Polled ${books.length} orders: ${updated} updated, ${errors} errors`);
  return { polled: books.length, updated, errors };
}

/**
 * Send a shipping notification email if not already sent.
 */
async function sendShippingEmailIfNeeded(book, orderStatus, supabase, env) {
  const notifications = book.email_notifications_sent || {};

  // Already sent
  if (notifications.shipping) return;

  // Find recipient email
  const recipientEmail = book.shipping_address?.email;
  if (!recipientEmail) {
    // Try to get email from user profile
    if (!book.user_id) return;
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(book.user_id);
      if (!user?.email) return;
      var email = user.email;
    } catch {
      return;
    }
  }

  const toEmail = recipientEmail || email;

  // Get tracking info
  const trackingItem = orderStatus.lineItems?.find((li) => li.trackingId);
  const trackingInfo = {
    trackingId: trackingItem?.trackingId || book.shipping_address?.trackingId || null,
    trackingUrl: trackingItem?.trackingUrl || book.shipping_address?.trackingUrl || null,
  };

  try {
    const appUrl = env.APP_URL || 'https://app.keptpages.com';
    const { subject, html } = buildShippingNotificationEmail(
      { title: book.title, appUrl },
      trackingInfo,
    );
    await sendEmail(toEmail, subject, html, env);

    // Mark as sent (idempotency)
    await supabase
      .from('books')
      .update({
        email_notifications_sent: {
          ...notifications,
          shipping: new Date().toISOString(),
        },
      })
      .eq('id', book.id);
  } catch (emailErr) {
    console.error(`[orderPoller] Shipping email failed for book ${book.id}:`, emailErr?.message || emailErr);
  }
}
