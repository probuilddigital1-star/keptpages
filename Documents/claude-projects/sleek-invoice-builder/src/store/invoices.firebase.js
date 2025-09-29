/**
 * Invoice Store - Firebase Integration
 * This module handles invoice operations with Firebase Firestore
 * Falls back to localStorage when offline or not authenticated
 */

import { invoicesService } from '../services/firebaseDataService';
import { auth } from '../firebase/config';
import { logError, logInfo } from '../utils/errorHandler';

const LOCAL_KEY = 'sleek_invoices_v1';

// Check if user is authenticated
function isAuthenticated() {
  return auth.currentUser != null;
}

// Get user ID
function getUserId() {
  return auth.currentUser?.uid || 'local';
}

// Fallback to localStorage for offline/unauthenticated use
function getLocalInvoices() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalInvoices(invoices) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(invoices));
  return invoices;
}

/**
 * List all invoices for current user
 */
export async function listInvoices() {
  try {
    if (isAuthenticated()) {
      // Try to get from Firebase
      const invoices = await invoicesService.getAllForUser(getUserId(), {
        orderBy: 'createdAt',
        orderDirection: 'desc'
      });

      // Cache locally for offline use
      saveLocalInvoices(invoices);
      return invoices;
    }
  } catch (error) {
    logError('listInvoices', error);
    // Fall back to local storage
  }

  // Use local storage if not authenticated or error
  return getLocalInvoices();
}

/**
 * Save all invoices (batch operation)
 */
export async function saveInvoices(arr) {
  try {
    if (isAuthenticated()) {
      // In Firebase, we'd typically not replace all invoices
      // Instead, we'd sync differences
      logInfo('saveInvoices', 'Batch save called - syncing with Firebase');

      // For now, save locally and mark for sync
      saveLocalInvoices(arr);

      // TODO: Implement batch sync with Firebase
      return arr;
    }
  } catch (error) {
    logError('saveInvoices', error);
  }

  return saveLocalInvoices(arr);
}

/**
 * Save a single invoice
 */
export async function saveInvoice(inv) {
  try {
    if (isAuthenticated()) {
      // Add userId to invoice
      const invoiceData = {
        ...inv,
        userId: getUserId(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firebase
      let savedInvoice;
      if (inv.id && inv.id.startsWith('inv_')) {
        // Use createOrUpdate to handle both local and Firebase invoices
        // This will create if doesn't exist in Firestore, or update if it does
        savedInvoice = await invoicesService.createOrUpdate(inv.id, invoiceData);
      } else {
        // Create new invoice with auto-generated ID
        savedInvoice = await invoicesService.create(invoiceData, inv.id);
      }

      // Update local cache
      const localInvoices = getLocalInvoices();
      const idx = localInvoices.findIndex(x => x.id === savedInvoice.id);
      if (idx >= 0) {
        localInvoices[idx] = savedInvoice;
      } else {
        localInvoices.unshift(savedInvoice);
      }
      saveLocalInvoices(localInvoices);

      logInfo('saveInvoice', `Invoice ${savedInvoice.id} saved to Firebase`);
      return savedInvoice;
    }
  } catch (error) {
    logError('saveInvoice', error);
    // Fall back to local storage
  }

  // Local storage fallback
  const all = getLocalInvoices();
  const idx = all.findIndex(x => x.id === inv.id);
  if (idx >= 0) {
    all[idx] = inv;
  } else {
    all.unshift(inv);
  }
  return saveLocalInvoices(all)[0];
}

/**
 * Upsert (update or insert) an invoice
 */
export async function upsertInvoice(inv) {
  return saveInvoice(inv);
}

/**
 * Update all invoices with current payment methods
 */
export async function updateAllInvoicesWithPaymentMethods(paymentMethods) {
  try {
    if (isAuthenticated()) {
      const userId = getUserId();

      // Get all invoices for the user
      const invoices = await invoicesService.getAllForUser(userId);

      logInfo('updateAllInvoicesWithPaymentMethods', `Updating ${invoices.length} invoices with payment methods`);

      // Update each invoice with payment methods
      const updatePromises = invoices.map(async (invoice) => {
        const updatedInvoice = {
          ...invoice,
          paymentMethods: paymentMethods || {},
          // Also update individual fields for backward compatibility
          business_paypal: paymentMethods?.paypalEmail || '',
          business_venmo: paymentMethods?.venmoHandle || '',
          business_zelle: paymentMethods?.zelleEmail || '',
          business_cashapp: paymentMethods?.cashappHandle || '',
          updatedAt: new Date().toISOString()
        };

        return invoicesService.update(invoice.id, updatedInvoice);
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      logInfo('updateAllInvoicesWithPaymentMethods', 'All invoices updated successfully');

      // Refresh local cache
      const updatedInvoices = await invoicesService.getAllForUser(userId);
      saveLocalInvoices(updatedInvoices);

      return updatedInvoices;
    } else {
      // Update local invoices
      const localInvoices = getLocalInvoices();
      const updatedInvoices = localInvoices.map(invoice => ({
        ...invoice,
        paymentMethods: paymentMethods || {},
        business_paypal: paymentMethods?.paypalEmail || '',
        business_venmo: paymentMethods?.venmoHandle || '',
        business_zelle: paymentMethods?.zelleEmail || '',
        business_cashapp: paymentMethods?.cashappHandle || '',
        updatedAt: new Date().toISOString()
      }));

      saveLocalInvoices(updatedInvoices);
      return updatedInvoices;
    }
  } catch (error) {
    logError('updateAllInvoicesWithPaymentMethods', error);
    throw error;
  }
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id) {
  try {
    if (isAuthenticated()) {
      // Delete from Firebase
      await invoicesService.delete(id);

      // Update local cache
      const localInvoices = getLocalInvoices().filter(x => x.id !== id);
      saveLocalInvoices(localInvoices);

      logInfo('deleteInvoice', `Invoice ${id} deleted from Firebase`);
      return localInvoices;
    }
  } catch (error) {
    logError('deleteInvoice', error);
  }

  // Local storage fallback
  return saveLocalInvoices(getLocalInvoices().filter(x => x.id !== id));
}

/**
 * Update invoice status
 */
export async function setInvoiceStatus(id, status, meta = {}) {
  try {
    const now = new Date().toISOString();
    const updates =
      status === 'sent' ? { status, sentAt: now, ...meta } :
      status === 'paid' ? { status, paidAt: meta.paidAt || now, ...meta } :
      { status, ...meta };

    if (isAuthenticated()) {
      // Update in Firebase
      const updated = await invoicesService.update(id, updates);

      // Update local cache
      const localInvoices = getLocalInvoices();
      const idx = localInvoices.findIndex(x => x.id === id);
      if (idx >= 0) {
        localInvoices[idx] = { ...localInvoices[idx], ...updates };
      }
      saveLocalInvoices(localInvoices);

      return updated;
    }
  } catch (error) {
    logError('setInvoiceStatus', error);
  }

  // Local storage fallback
  const all = getLocalInvoices();
  const i = all.findIndex(x => x.id === id);
  if (i < 0) return all;
  all[i] = { ...all[i], ...updates };
  return saveLocalInvoices(all);
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(id) {
  try {
    if (isAuthenticated()) {
      // Try to get from Firebase
      const invoice = await invoicesService.getById(id);
      if (invoice) return invoice;
    }
  } catch (error) {
    logError('getInvoice', error);
  }

  // Local storage fallback
  return getLocalInvoices().find(x => x.id === id) || null;
}

/**
 * Generate a new invoice ID
 */
export function genId() {
  return 'inv_' + Math.random().toString(36).slice(2, 9);
}

export function generateInvoiceId() {
  return 'inv_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Check if invoice is overdue
 */
export function isOverdue(inv) {
  if (!inv) return false;
  if (inv.status === 'paid') return false;
  const due = inv.dueDate ? new Date(inv.dueDate) : null;
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Count invoices created this month
 */
export async function countInvoicesThisMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  let invoices = [];
  try {
    invoices = await listInvoices();
  } catch {
    invoices = getLocalInvoices();
  }

  return invoices.filter(inv => {
    const d = new Date(inv.created_at || inv.date || now);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

/**
 * Migrate local invoices to Firebase (one-time operation)
 */
export async function migrateToFirebase() {
  if (!isAuthenticated()) {
    throw new Error('User must be authenticated to migrate data');
  }

  try {
    const localInvoices = getLocalInvoices();
    if (localInvoices.length === 0) {
      logInfo('migrateToFirebase', 'No local invoices to migrate');
      return { migrated: 0 };
    }

    let migrated = 0;
    for (const invoice of localInvoices) {
      try {
        const invoiceData = {
          ...invoice,
          userId: getUserId(),
          migratedAt: new Date().toISOString()
        };

        await invoicesService.create(invoiceData, invoice.id);
        migrated++;
      } catch (error) {
        logError('migrateToFirebase.invoice', error, { invoiceId: invoice.id });
      }
    }

    logInfo('migrateToFirebase', `Migrated ${migrated} of ${localInvoices.length} invoices`);
    return { migrated, total: localInvoices.length };
  } catch (error) {
    logError('migrateToFirebase', error);
    throw error;
  }
}

// Subscribe to real-time updates when authenticated
export function subscribeToInvoices(callback) {
  if (!isAuthenticated()) {
    return () => {}; // No-op unsubscribe
  }

  return invoicesService.subscribeToUserDocuments(
    getUserId(),
    (invoices) => {
      // Update local cache
      saveLocalInvoices(invoices);
      // Notify callback
      callback(invoices);
    },
    { orderBy: 'createdAt', orderDirection: 'desc' }
  );
}