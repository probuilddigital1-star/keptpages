/**
 * Email service using Resend API.
 * Sends branded transactional emails for order confirmations and shipping notifications.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'KeptPages <orders@keptpages.com>';

// Brand colors
const WALNUT = '#2C1810';
const TERRACOTTA = '#C65D3E';
const CREAM = '#FAF7F2';
const BORDER = '#E8E0D8';

/**
 * Send an email via the Resend API.
 */
export async function sendEmail(to, subject, html, env) {
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured — skipping email');
    return null;
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Build the HTML wrapper used by all email templates.
 */
function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;">
<!-- Header -->
<tr><td style="padding:24px 32px;border-bottom:3px solid ${TERRACOTTA};">
<span style="font-size:22px;font-weight:800;color:${WALNUT};letter-spacing:-0.5px;">Kept<span style="color:${TERRACOTTA};">Pages</span></span>
</td></tr>
<!-- Content -->
<tr><td style="padding:32px;">${content}</td></tr>
<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid ${BORDER};text-align:center;">
<p style="margin:0;font-size:12px;color:#999;">KeptPages — Preserve what matters most</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Build an order confirmation email.
 * @param {object} orderData - { title, tierLabel, quantity, totalCents, shippingAddress, appUrl }
 * @returns {{ subject: string, html: string }}
 */
export function buildOrderConfirmationEmail(orderData) {
  const { title, tierLabel, quantity, totalCents, shippingAddress, appUrl } = orderData;
  const total = totalCents ? `$${(totalCents / 100).toFixed(2)}` : 'See receipt';
  const addr = shippingAddress || {};

  const subject = `Order Confirmed: ${title || 'Your KeptPages Book'}`;

  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:${WALNUT};">Your order is confirmed!</h2>
<p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.5;">
Thank you for your order. Your book is being prepared for printing.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};border-radius:6px;padding:16px;margin-bottom:24px;">
<tr><td style="padding:12px 16px;">
<p style="margin:0 0 8px;font-size:14px;color:#999;">Book</p>
<p style="margin:0;font-size:16px;font-weight:600;color:${WALNUT};">${title || 'Untitled Book'}</p>
</td></tr>
<tr><td style="padding:4px 16px;">
<p style="margin:0;font-size:13px;color:#777;">${tierLabel || 'Classic'} &middot; Qty: ${quantity || 1} &middot; Total: ${total}</p>
</td></tr>
${addr.name ? `<tr><td style="padding:12px 16px;border-top:1px solid ${BORDER};">
<p style="margin:0 0 4px;font-size:14px;color:#999;">Shipping to</p>
<p style="margin:0;font-size:13px;color:#555;">${addr.name}${addr.street1 ? `, ${addr.street1}` : ''}${addr.city ? `, ${addr.city}` : ''}${addr.state ? ` ${addr.state}` : ''} ${addr.postalCode || ''}</p>
</td></tr>` : ''}
</table>
<table cellpadding="0" cellspacing="0"><tr><td style="background:${TERRACOTTA};border-radius:6px;padding:12px 24px;">
<a href="${appUrl || 'https://app.keptpages.com'}/app/orders" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Track Your Order</a>
</td></tr></table>`;

  return { subject, html: emailWrapper(content) };
}

/**
 * Build a shipping notification email.
 * @param {object} orderData - { title, appUrl }
 * @param {object} trackingInfo - { trackingId, trackingUrl }
 * @returns {{ subject: string, html: string }}
 */
export function buildShippingNotificationEmail(orderData, trackingInfo) {
  const { title, appUrl } = orderData;
  const { trackingId, trackingUrl } = trackingInfo || {};

  const subject = `Your book has shipped: ${title || 'KeptPages Book'}`;

  const trackingLink = trackingUrl
    ? `<a href="${trackingUrl}" style="color:${TERRACOTTA};font-weight:600;text-decoration:underline;">${trackingId || 'Track shipment'}</a>`
    : (trackingId || 'Not yet available');

  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:${WALNUT};">Your book is on its way!</h2>
<p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.5;">
Great news — <strong>${title || 'your book'}</strong> has shipped and is headed your way.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};border-radius:6px;margin-bottom:24px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 8px;font-size:14px;color:#999;">Tracking Number</p>
<p style="margin:0;font-size:15px;color:${WALNUT};">${trackingLink}</p>
</td></tr>
</table>
<table cellpadding="0" cellspacing="0"><tr><td style="background:${TERRACOTTA};border-radius:6px;padding:12px 24px;">
<a href="${appUrl || 'https://app.keptpages.com'}/app/orders" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View Your Orders</a>
</td></tr></table>`;

  return { subject, html: emailWrapper(content) };
}
