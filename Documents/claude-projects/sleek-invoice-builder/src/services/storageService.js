/**
 * Storage Service
 * Handles local data persistence for the Sleek Invoice Builder
 * Uses localStorage for web and AsyncStorage for React Native
 */

import { logError, logWarning } from '../utils/errorHandler';

// Platform detection
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const isReactNative = !isWeb && typeof global !== 'undefined';

// Storage adapter based on platform
class StorageService {
  constructor() {
    this.prefix = 'sleek_invoice_';
    this.AsyncStorage = null;
    
    // Try to import AsyncStorage for React Native
    if (isReactNative) {
      try {
        this.AsyncStorage = require('@react-native-async-storage/async-storage').default;
      } catch (error) {
        // console.warn('AsyncStorage not available:', error);
      }
    }
  }

  /**
   * Get storage key with prefix
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Save data to storage
   */
  async setItem(key, value) {
    const storageKey = this.getKey(key);
    const stringValue = JSON.stringify(value);
    
    try {
      if (isWeb) {
        localStorage.setItem(storageKey, stringValue);
      } else if (isReactNative && this.AsyncStorage) {
        await this.AsyncStorage.setItem(storageKey, stringValue);
      }
      return true;
    } catch (error) {
      logError('StorageService.setItem', error, { key, valueSize: value?.length });
      return false;
    }
  }

  /**
   * Get data from storage
   */
  async getItem(key) {
    const storageKey = this.getKey(key);
    
    try {
      let stringValue = null;
      
      if (isWeb) {
        stringValue = localStorage.getItem(storageKey);
      } else if (isReactNative && this.AsyncStorage) {
        stringValue = await this.AsyncStorage.getItem(storageKey);
      }
      
      return stringValue ? JSON.parse(stringValue) : null;
    } catch (error) {
      logError('StorageService.getItem', error, { key });
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  async removeItem(key) {
    const storageKey = this.getKey(key);
    
    try {
      if (isWeb) {
        localStorage.removeItem(storageKey);
      } else if (isReactNative && this.AsyncStorage) {
        await this.AsyncStorage.removeItem(storageKey);
      }
      return true;
    } catch (error) {
      logError('StorageService.removeItem', error, { key });
      return false;
    }
  }

  /**
   * Clear all app data from storage
   */
  async clear() {
    try {
      if (isWeb) {
        // Clear only our app's data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.prefix)) {
            localStorage.removeItem(key);
          }
        });
      } else if (isReactNative && this.AsyncStorage) {
        const keys = await this.AsyncStorage.getAllKeys();
        const appKeys = keys.filter(key => key.startsWith(this.prefix));
        await this.AsyncStorage.multiRemove(appKeys);
      }
      return true;
    } catch (error) {
      logError('StorageService.clear', error);
      return false;
    }
  }

  /**
   * Save invoices to storage
   */
  async saveInvoices(invoices) {
    return await this.setItem('invoices', invoices);
  }

  /**
   * Load invoices from storage
   */
  async loadInvoices() {
    const invoices = await this.getItem('invoices');
    return Array.isArray(invoices) ? invoices : [];
  }

  /**
   * Save a single invoice
   */
  async saveInvoice(invoice) {
    const invoices = await this.loadInvoices();
    const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
    
    if (existingIndex >= 0) {
      invoices[existingIndex] = invoice;
    } else {
      invoices.push(invoice);
    }
    
    return await this.saveInvoices(invoices);
  }

  /**
   * Delete a single invoice
   */
  async deleteInvoice(invoiceId) {
    const invoices = await this.loadInvoices();
    const filtered = invoices.filter(inv => inv.id !== invoiceId);
    return await this.saveInvoices(filtered);
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences) {
    return await this.setItem('preferences', preferences);
  }

  /**
   * Load user preferences
   */
  async loadPreferences() {
    const preferences = await this.getItem('preferences');
    return preferences || {
      theme: 'light',
      currency: 'USD',
      taxRate: 0,
      defaultPaymentTerms: 30,
      businessInfo: {
        name: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        logo: null
      }
    };
  }

  /**
   * Save client list
   */
  async saveClients(clients) {
    return await this.setItem('clients', clients);
  }

  /**
   * Load client list
   */
  async loadClients() {
    const clients = await this.getItem('clients');
    return Array.isArray(clients) ? clients : [];
  }

  /**
   * Save a single client
   */
  async saveClient(client) {
    const clients = await this.loadClients();
    const existingIndex = clients.findIndex(c => c.id === client.id);
    
    if (existingIndex >= 0) {
      clients[existingIndex] = client;
    } else {
      clients.push(client);
    }
    
    return await this.saveClients(clients);
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId) {
    const clients = await this.loadClients();
    const filtered = clients.filter(c => c.id !== clientId);
    return await this.saveClients(filtered);
  }

  /**
   * Save analytics data
   */
  async saveAnalytics(analytics) {
    return await this.setItem('analytics', analytics);
  }

  /**
   * Load analytics data
   */
  async loadAnalytics() {
    const analytics = await this.getItem('analytics');
    return analytics || {
      totalRevenue: 0,
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      overdueInvoices: 0,
      monthlyRevenue: {},
      clientStats: {}
    };
  }

  /**
   * Update analytics with new invoice
   */
  async updateAnalytics(invoice) {
    const analytics = await this.loadAnalytics();
    
    // Update totals
    analytics.totalInvoices += 1;
    
    if (invoice.status === 'paid') {
      analytics.paidInvoices += 1;
      analytics.totalRevenue += invoice.total || 0;
      
      // Update monthly revenue
      const month = new Date(invoice.date).toISOString().slice(0, 7);
      analytics.monthlyRevenue[month] = (analytics.monthlyRevenue[month] || 0) + invoice.total;
    } else if (invoice.status === 'pending') {
      analytics.pendingInvoices += 1;
    } else if (invoice.status === 'overdue') {
      analytics.overdueInvoices += 1;
    }
    
    // Update client stats
    if (invoice.client_name) {
      if (!analytics.clientStats[invoice.client_name]) {
        analytics.clientStats[invoice.client_name] = {
          totalInvoices: 0,
          totalRevenue: 0,
          lastInvoice: null
        };
      }
      
      analytics.clientStats[invoice.client_name].totalInvoices += 1;
      if (invoice.status === 'paid') {
        analytics.clientStats[invoice.client_name].totalRevenue += invoice.total;
      }
      analytics.clientStats[invoice.client_name].lastInvoice = invoice.date;
    }
    
    return await this.saveAnalytics(analytics);
  }

  /**
   * Get storage size (web only)
   */
  async getStorageSize() {
    if (!isWeb) return null;
    
    let totalSize = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        totalSize += key.length + (value ? value.length : 0);
      }
    });
    
    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Export all data (for backup)
   */
  async exportData() {
    const data = {
      invoices: await this.loadInvoices(),
      clients: await this.loadClients(),
      preferences: await this.loadPreferences(),
      analytics: await this.loadAnalytics(),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    return data;
  }

  /**
   * Import data (from backup)
   */
  async importData(data) {
    try {
      if (data.invoices) {
        await this.saveInvoices(data.invoices);
      }
      if (data.clients) {
        await this.saveClients(data.clients);
      }
      if (data.preferences) {
        await this.savePreferences(data.preferences);
      }
      if (data.analytics) {
        await this.saveAnalytics(data.analytics);
      }
      return true;
    } catch (error) {
      logError('StorageService.importData', error, { dataKeys: Object.keys(data || {}) });
      return false;
    }
  }
}

export default new StorageService();