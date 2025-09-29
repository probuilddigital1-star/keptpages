/**
 * Invoice Sharing Utilities
 * Generate secure shareable links for invoices
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { logError, logInfo } from './errorHandler';
import { USE_FIREBASE } from '../config/features';
import { saveInvoice as saveInvoiceToStore } from '../store/invoices';

// LocalStorage key for sharing tokens
const SHARING_TOKENS_KEY = 'sleek_invoice_sharing_tokens';

/**
 * Generate a secure random token for public invoice access
 * @returns {string} Random token
 */
export function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a shareable link for an invoice
 * @param {string} invoiceId - Invoice ID
 * @param {string} token - Access token
 * @returns {string} Shareable URL
 */
export function generateShareableLink(invoiceId, token) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/invoice/${invoiceId}/${token}`;
}

/**
 * Enable public sharing for an invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<{success: boolean, link?: string, error?: string}>}
 */
export async function enableInvoiceSharing(invoiceId) {
  try {
    // Generate secure token
    const token = generateSecureToken();

    if (USE_FIREBASE) {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Check if invoice exists in Firestore first
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        // Invoice doesn't exist in Firestore yet - might be locally stored
        // Try to get it from localStorage and save to Firestore first
        const localInvoices = JSON.parse(localStorage.getItem('sleek_invoices_v1') || '[]');
        const localInvoice = localInvoices.find(inv => inv.id === invoiceId);

        if (localInvoice) {
          // Save the invoice to Firestore first with userId
          await saveInvoiceToStore({
            ...localInvoice,
            userId: userId
          });
          logInfo('Invoice saved to Firestore before sharing', { invoiceId });
        } else {
          throw new Error('Invoice not found');
        }
      } else {
        // Verify the invoice belongs to the current user
        const invoiceData = invoiceDoc.data();
        if (invoiceData.userId !== userId) {
          throw new Error('You do not have permission to share this invoice');
        }
      }

      // Now update invoice with public token in Firebase
      await updateDoc(invoiceRef, {
        publicToken: token,
        sharingEnabled: true,
        sharingEnabledAt: new Date(),
        lastShared: new Date()
      });
    } else {
      // Store token in localStorage
      const tokens = JSON.parse(localStorage.getItem(SHARING_TOKENS_KEY) || '{}');
      tokens[invoiceId] = {
        token,
        enabled: true,
        enabledAt: new Date().toISOString(),
        lastShared: new Date().toISOString()
      };
      localStorage.setItem(SHARING_TOKENS_KEY, JSON.stringify(tokens));

      // Also update the invoice in localStorage
      const invoices = JSON.parse(localStorage.getItem('sleek_invoices_v1') || '[]');
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        invoice.publicToken = token;
        invoice.sharingEnabled = true;
        invoice.sharingEnabledAt = new Date().toISOString();
        localStorage.setItem('sleek_invoices_v1', JSON.stringify(invoices));
      }
    }

    // Generate shareable link
    const link = generateShareableLink(invoiceId, token);

    logInfo('Invoice sharing enabled', { invoiceId });

    return {
      success: true,
      link
    };
  } catch (error) {
    logError('enableInvoiceSharing', error, { invoiceId });
    return {
      success: false,
      error: error.message || 'Failed to enable sharing'
    };
  }
}

/**
 * Disable public sharing for an invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function disableInvoiceSharing(invoiceId) {
  try {
    if (USE_FIREBASE) {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        publicToken: null,
        sharingEnabled: false,
        sharingDisabledAt: new Date()
      });
    } else {
      // Remove token from localStorage
      const tokens = JSON.parse(localStorage.getItem(SHARING_TOKENS_KEY) || '{}');
      delete tokens[invoiceId];
      localStorage.setItem(SHARING_TOKENS_KEY, JSON.stringify(tokens));

      // Also update the invoice in localStorage
      const invoices = JSON.parse(localStorage.getItem('sleek_invoices_v1') || '[]');
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        invoice.publicToken = null;
        invoice.sharingEnabled = false;
        invoice.sharingDisabledAt = new Date().toISOString();
        localStorage.setItem('sleek_invoices_v1', JSON.stringify(invoices));
      }
    }

    logInfo('Invoice sharing disabled', { invoiceId });

    return { success: true };
  } catch (error) {
    logError('disableInvoiceSharing', error, { invoiceId });
    return {
      success: false,
      error: error.message || 'Failed to disable sharing'
    };
  }
}

/**
 * Regenerate the public token for an invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<{success: boolean, link?: string, error?: string}>}
 */
export async function regenerateInvoiceToken(invoiceId) {
  try {
    // Generate new secure token
    const newToken = generateSecureToken();

    if (USE_FIREBASE) {
      // Update invoice with new token in Firebase
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        publicToken: newToken,
        tokenRegeneratedAt: new Date()
      });
    } else {
      // Update token in localStorage
      const tokens = JSON.parse(localStorage.getItem(SHARING_TOKENS_KEY) || '{}');
      if (tokens[invoiceId]) {
        tokens[invoiceId].token = newToken;
        tokens[invoiceId].regeneratedAt = new Date().toISOString();
        localStorage.setItem(SHARING_TOKENS_KEY, JSON.stringify(tokens));
      }

      // Also update the invoice in localStorage
      const invoices = JSON.parse(localStorage.getItem('sleek_invoices_v1') || '[]');
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        invoice.publicToken = newToken;
        invoice.tokenRegeneratedAt = new Date().toISOString();
        localStorage.setItem('sleek_invoices_v1', JSON.stringify(invoices));
      }
    }

    // Generate new shareable link
    const link = generateShareableLink(invoiceId, newToken);

    logInfo('Invoice token regenerated', { invoiceId });

    return {
      success: true,
      link
    };
  } catch (error) {
    logError('regenerateInvoiceToken', error, { invoiceId });
    return {
      success: false,
      error: error.message || 'Failed to regenerate token'
    };
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (error) {
    logError('copyToClipboard', error);
    return false;
  }
}

/**
 * Share invoice via native share API (mobile)
 * @param {object} invoice - Invoice object
 * @param {string} link - Shareable link
 * @returns {Promise<boolean>} Success status
 */
export async function shareInvoice(invoice, link) {
  try {
    if (navigator.share) {
      await navigator.share({
        title: `Invoice #${invoice.number}`,
        text: `Please review and pay invoice #${invoice.number} from ${invoice.business_name || 'our business'}`,
        url: link
      });
      return true;
    } else {
      // Fallback to copying link
      return await copyToClipboard(link);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      logError('shareInvoice', error);
    }
    return false;
  }
}

/**
 * Format shareable message for different platforms
 * @param {object} invoice - Invoice object
 * @param {string} link - Shareable link
 * @param {string} platform - Platform type (email, sms, whatsapp)
 * @returns {string} Formatted message
 */
export function formatShareMessage(invoice, link, platform = 'email') {
  const businessName = invoice.business_name || invoice.businessName || 'Our Business';
  const amount = invoice.total ? `$${invoice.total.toFixed(2)}` : 'the amount';

  switch (platform) {
    case 'email':
      return {
        subject: `Invoice #${invoice.number} from ${businessName}`,
        body: `Dear ${invoice.client_name},\n\nPlease find your invoice #${invoice.number} for ${amount}.\n\nYou can view and pay this invoice online at:\n${link}\n\nThank you for your business!\n\nBest regards,\n${businessName}`
      };

    case 'sms':
      return `Invoice #${invoice.number} from ${businessName} for ${amount}. View and pay: ${link}`;

    case 'whatsapp':
      return `*Invoice #${invoice.number}*\n\nFrom: ${businessName}\nAmount: ${amount}\n\nView and pay online:\n${link}`;

    default:
      return `Invoice #${invoice.number} from ${businessName}: ${link}`;
  }
}

/**
 * Track invoice view/access
 * @param {string} invoiceId - Invoice ID
 * @param {string} source - View source (link, email, etc)
 */
export async function trackInvoiceView(invoiceId, source = 'link') {
  try {
    if (USE_FIREBASE) {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      // Note: Firestore will increment the viewCount atomically
      // We don't have access to the current invoice data here
      await updateDoc(invoiceRef, {
        lastViewedAt: new Date(),
        lastViewSource: source
      });
    } else {
      // Track view in localStorage
      const invoices = JSON.parse(localStorage.getItem('sleek_invoices_v1') || '[]');
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        invoice.lastViewedAt = new Date().toISOString();
        invoice.lastViewSource = source;
        invoice.viewCount = (invoice.viewCount || 0) + 1;
        localStorage.setItem('sleek_invoices_v1', JSON.stringify(invoices));
      }
    }
  } catch (error) {
    // Don't throw, just log
    logError('trackInvoiceView', error, { invoiceId, source });
  }
}

export default {
  generateSecureToken,
  generateShareableLink,
  enableInvoiceSharing,
  disableInvoiceSharing,
  regenerateInvoiceToken,
  copyToClipboard,
  shareInvoice,
  formatShareMessage,
  trackInvoiceView
};