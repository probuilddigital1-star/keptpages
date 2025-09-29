/**
 * Invoice Store
 * Conditionally uses Firebase or localStorage based on feature flag
 */

import { USE_FIREBASE } from '../config/features';
import * as firebaseStore from './invoices.firebase';

const KEY = 'sleek_invoices_v1';

// Local storage implementation (original)
const localStore = {
  listInvoices() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  },

  saveInvoices(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
    return arr;
  },

  saveInvoice(inv) {
    const all = this.listInvoices();
    const idx = all.findIndex(x => x.id === inv.id);
    if (idx >= 0) {
      all[idx] = inv;
    } else {
      all.unshift(inv);
    }
    localStorage.setItem(KEY, JSON.stringify(all));
    return inv;
  },

  upsertInvoice(inv) {
    const all = this.listInvoices();
    const i = all.findIndex(x => x.id === inv.id);
    if (i >= 0) all[i] = { ...all[i], ...inv };
    else all.unshift(inv);
    return this.saveInvoices(all);
  },

  deleteInvoice(id) {
    return this.saveInvoices(this.listInvoices().filter(x => x.id !== id));
  },

  setInvoiceStatus(id, status, meta = {}) {
    const all = this.listInvoices();
    const i = all.findIndex(x => x.id === id);
    if (i < 0) return all;
    const now = new Date().toISOString();
    const patch =
      status === 'sent' ? { status, sentAt: now, ...meta } :
      status === 'paid' ? { status, paidAt: meta.paidAt || now, ...meta } :
      { status, ...meta };
    all[i] = { ...all[i], ...patch };
    return this.saveInvoices(all);
  },

  getInvoice(id) {
    return this.listInvoices().find(x => x.id === id) || null;
  }
};

// Choose implementation based on feature flag
const store = USE_FIREBASE ? firebaseStore : localStore;

// Export functions that work with both implementations
// These functions always return promises for consistency
export async function listInvoices() {
  try {
    if (USE_FIREBASE) {
      const result = await firebaseStore.listInvoices();
      // Ensure we always return an array
      return Array.isArray(result) ? result : [];
    }
    return localStore.listInvoices();
  } catch (error) {
    // console.warn('Error listing invoices, falling back to empty array:', error);
    return [];
  }
}

// Synchronous version for backward compatibility
export function listInvoicesSync() {
  if (!USE_FIREBASE) {
    return localStore.listInvoices();
  }
  // Return empty array for Firebase (requires async)
  // console.warn('listInvoicesSync called with Firebase enabled, returning empty array');
  return [];
}

export async function saveInvoices(arr) {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.saveInvoices(arr);
    }
    return localStore.saveInvoices(arr);
  } catch (error) {
    // console.warn('Error saving invoices:', error);
    throw error;
  }
}

export async function saveInvoice(inv) {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.saveInvoice(inv);
    }
    return localStore.saveInvoice(inv);
  } catch (error) {
    // console.warn('Error saving invoice:', error);
    throw error;
  }
}

export async function upsertInvoice(inv) {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.upsertInvoice(inv);
    }
    return localStore.upsertInvoice(inv);
  } catch (error) {
    // console.warn('Error upserting invoice:', error);
    throw error;
  }
}

export async function deleteInvoice(id) {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.deleteInvoice(id);
    }
    return localStore.deleteInvoice(id);
  } catch (error) {
    // console.warn('Error deleting invoice:', error);
    throw error;
  }
}

export async function setInvoiceStatus(id, status, meta = {}) {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.setInvoiceStatus(id, status, meta);
    }
    return localStore.setInvoiceStatus(id, status, meta);
  } catch (error) {
    // console.warn('Error setting invoice status:', error);
    throw error;
  }
}

export async function getInvoice(id) {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.getInvoice(id);
    }
    return localStore.getInvoice(id);
  } catch (error) {
    // console.warn('Error getting invoice:', error);
    return null;
  }
}

export async function updateAllInvoicesWithPaymentMethods(paymentMethods) {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.updateAllInvoicesWithPaymentMethods(paymentMethods);
    }

    // Update local invoices
    const invoices = localStore.listInvoices();
    const updatedInvoices = invoices.map(invoice => ({
      ...invoice,
      paymentMethods: paymentMethods || {},
      business_paypal: paymentMethods?.paypalEmail || '',
      business_venmo: paymentMethods?.venmoHandle || '',
      business_zelle: paymentMethods?.zelleEmail || '',
      business_cashapp: paymentMethods?.cashappHandle || '',
      updatedAt: new Date().toISOString()
    }));

    return localStore.saveInvoices(updatedInvoices);
  } catch (error) {
    console.error('Error updating all invoices with payment methods:', error);
    throw error;
  }
}

export function genId() {
  return 'inv_' + Math.random().toString(36).slice(2, 9);
}

export function generateInvoiceId() {
  return 'inv_' + Math.random().toString(36).slice(2, 10);
}

export function isOverdue(inv) {
  if (!inv) return false;
  if (inv.status === 'paid') return false;
  const due = inv.dueDate ? new Date(inv.dueDate) : null;
  if (!due) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  return due < today;
}

export async function countInvoicesThisMonth() {
  try {
    if (USE_FIREBASE) {
      return await firebaseStore.countInvoicesThisMonth();
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const invoices = localStore.listInvoices();
    return invoices.filter(inv => {
      const d = new Date(inv.created_at || inv.date || now);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  } catch (error) {
    // console.warn('Error counting invoices this month:', error);
    return 0;
  }
}

// Export migration function for Firebase
export function migrateToFirebase() {
  if (USE_FIREBASE) {
    return firebaseStore.migrateToFirebase();
  }
  return Promise.resolve({ migrated: 0, message: 'Firebase not enabled' });
}

// Export subscribe function for real-time updates
export function subscribeToInvoices(callback) {
  if (USE_FIREBASE) {
    return firebaseStore.subscribeToInvoices(callback);
  }
  // For localStorage, return a no-op unsubscribe function
  return () => {};
}