/**
 * Firebase Data Service
 * Handles all Firestore database operations for Sleek Invoice Builder
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { logError, logInfo } from '../utils/errorHandler';

/**
 * Base class for Firestore collections
 */
class FirebaseCollection {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  /**
   * Get a document by ID
   */
  async getById(id) {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      logError(`FirebaseCollection.getById.${this.collectionName}`, error, { id });
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  async getAllForUser(userId, options = {}) {
    try {
      let q = query(
        this.collectionRef,
        where('userId', '==', userId)
      );

      // Add sorting if specified
      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy, options.orderDirection || 'desc'));
      }

      // Add limit if specified
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      // Add pagination if specified
      if (options.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }

      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return documents;
    } catch (error) {
      logError(`FirebaseCollection.getAllForUser.${this.collectionName}`, error, { userId, options });
      throw error;
    }
  }

  /**
   * Create a new document
   */
  async create(data, customId = null) {
    try {
      const timestamp = serverTimestamp();
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      let docRef;
      if (customId) {
        docRef = doc(this.collectionRef, customId);
        await setDoc(docRef, documentData);
      } else {
        docRef = doc(this.collectionRef);
        await setDoc(docRef, documentData);
      }

      return { id: docRef.id, ...documentData };
    } catch (error) {
      logError(`FirebaseCollection.create.${this.collectionName}`, error, { data });
      throw error;
    }
  }

  /**
   * Update a document
   */
  async update(id, data) {
    try {
      const docRef = doc(this.collectionRef, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    } catch (error) {
      logError(`FirebaseCollection.update.${this.collectionName}`, error, { id, data });
      throw error;
    }
  }

  /**
   * Create or update a document (upsert)
   * Uses setDoc to create if doesn't exist or update if it does
   */
  async createOrUpdate(id, data) {
    try {
      const docRef = doc(this.collectionRef, id);
      const timestamp = serverTimestamp();

      // Include timestamps
      const documentData = {
        ...data,
        createdAt: data.createdAt || timestamp,
        updatedAt: timestamp
      };

      // Use setDoc without merge to avoid any internal read operations
      // This will overwrite the entire document, which is fine for our use case
      await setDoc(docRef, documentData);

      return { id, ...documentData };
    } catch (error) {
      logError(`FirebaseCollection.createOrUpdate.${this.collectionName}`, error, { id, data });
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async delete(id) {
    try {
      const docRef = doc(this.collectionRef, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      logError(`FirebaseCollection.delete.${this.collectionName}`, error, { id });
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for a user's documents
   */
  subscribeToUserDocuments(userId, callback, options = {}) {
    try {
      let q = query(
        this.collectionRef,
        where('userId', '==', userId)
      );

      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy, options.orderDirection || 'desc'));
      }

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const documents = [];
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        callback(documents);
      }, (error) => {
        logError(`FirebaseCollection.subscribe.${this.collectionName}`, error, { userId });
        callback([], error);
      });

      return unsubscribe;
    } catch (error) {
      logError(`FirebaseCollection.subscribeSetup.${this.collectionName}`, error, { userId });
      throw error;
    }
  }
}

/**
 * Users collection service
 */
class UsersService extends FirebaseCollection {
  constructor() {
    super('users');
  }

  /**
   * Create or update user profile
   */
  async createUserProfile(userId, userData) {
    try {
      const userRef = doc(this.collectionRef, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user profile
        const profileData = {
          uid: userId,
          email: userData.email,
          displayName: userData.displayName || '',
          photoURL: userData.photoURL || '',
          subscription: {
            tier: 'free',
            status: 'active',
            startDate: serverTimestamp()
          },
          usage: {
            invoicesThisMonth: 0,
            templatesUsed: 0,
            lastResetDate: serverTimestamp()
          },
          preferences: {
            theme: 'system',
            defaultLogo: '',
            defaultNotes: '',
            currency: 'USD'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(userRef, profileData);
        return { id: userId, ...profileData };
      }
      
      return { id: userId, ...userDoc.data() };
    } catch (error) {
      logError('UsersService.createUserProfile', error, { userId });
      throw error;
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscription(userId, subscriptionData) {
    try {
      const userRef = doc(this.collectionRef, userId);
      await updateDoc(userRef, {
        subscription: subscriptionData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      logError('UsersService.updateSubscription', error, { userId, subscriptionData });
      throw error;
    }
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(userId, field) {
    try {
      const userRef = doc(this.collectionRef, userId);
      await updateDoc(userRef, {
        [`usage.${field}`]: increment(1),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      logError('UsersService.incrementUsage', error, { userId, field });
      throw error;
    }
  }
}

/**
 * Invoices collection service
 */
class InvoicesService extends FirebaseCollection {
  constructor() {
    super('invoices');
  }

  /**
   * Get invoices with filters
   */
  async getInvoices(userId, filters = {}) {
    try {
      let q = query(this.collectionRef, where('userId', '==', userId));

      // Add status filter
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      // Add date range filter
      if (filters.startDate) {
        q = query(q, where('invoiceDate', '>=', filters.startDate));
      }
      if (filters.endDate) {
        q = query(q, where('invoiceDate', '<=', filters.endDate));
      }

      // Add client filter
      if (filters.clientId) {
        q = query(q, where('clientId', '==', filters.clientId));
      }

      // Add sorting
      q = query(q, orderBy(filters.orderBy || 'invoiceDate', filters.orderDirection || 'desc'));

      // Add pagination
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const invoices = [];
      
      querySnapshot.forEach((doc) => {
        invoices.push({ id: doc.id, ...doc.data() });
      });

      return invoices;
    } catch (error) {
      logError('InvoicesService.getInvoices', error, { userId, filters });
      throw error;
    }
  }

  /**
   * Calculate total revenue
   */
  async calculateRevenue(userId, startDate = null, endDate = null) {
    try {
      let q = query(
        this.collectionRef,
        where('userId', '==', userId),
        where('status', '==', 'paid')
      );

      if (startDate) {
        q = query(q, where('paidDate', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('paidDate', '<=', endDate));
      }

      const querySnapshot = await getDocs(q);
      let totalRevenue = 0;
      
      querySnapshot.forEach((doc) => {
        const invoice = doc.data();
        totalRevenue += invoice.total || 0;
      });

      return totalRevenue;
    } catch (error) {
      logError('InvoicesService.calculateRevenue', error, { userId, startDate, endDate });
      throw error;
    }
  }
}

/**
 * Clients collection service
 */
class ClientsService extends FirebaseCollection {
  constructor() {
    super('clients');
  }

  /**
   * Search clients by name or email
   */
  async searchClients(userId, searchTerm) {
    try {
      // Note: Firestore doesn't support full-text search natively
      // For production, consider using Algolia or ElasticSearch
      const clients = await this.getAllForUser(userId);
      
      const searchLower = searchTerm.toLowerCase();
      return clients.filter(client => 
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.company?.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      logError('ClientsService.searchClients', error, { userId, searchTerm });
      throw error;
    }
  }
}

/**
 * Items collection service
 */
class ItemsService extends FirebaseCollection {
  constructor() {
    super('items');
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(userId, category) {
    try {
      const q = query(
        this.collectionRef,
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      const items = [];
      
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });

      return items;
    } catch (error) {
      logError('ItemsService.getItemsByCategory', error, { userId, category });
      throw error;
    }
  }
}

/**
 * Batch operations service
 */
class BatchService {
  /**
   * Migrate data from localStorage to Firestore
   */
  async migrateFromLocalStorage(userId, localData) {
    const batch = writeBatch(db);
    let operationCount = 0;
    const results = {
      invoices: 0,
      clients: 0,
      items: 0,
      errors: []
    };

    try {
      // Migrate invoices
      if (localData.invoices && Array.isArray(localData.invoices)) {
        for (const invoice of localData.invoices) {
          try {
            const invoiceRef = doc(collection(db, 'invoices'));
            batch.set(invoiceRef, {
              ...invoice,
              userId,
              migratedAt: serverTimestamp(),
              createdAt: invoice.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            results.invoices++;
            operationCount++;

            // Firestore batch limit is 500 operations
            if (operationCount >= 450) {
              await batch.commit();
              operationCount = 0;
            }
          } catch (error) {
            results.errors.push({ type: 'invoice', id: invoice.id, error: error.message });
          }
        }
      }

      // Migrate clients
      if (localData.clients && Array.isArray(localData.clients)) {
        for (const client of localData.clients) {
          try {
            const clientRef = doc(collection(db, 'clients'));
            batch.set(clientRef, {
              ...client,
              userId,
              migratedAt: serverTimestamp(),
              createdAt: client.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            results.clients++;
            operationCount++;

            if (operationCount >= 450) {
              await batch.commit();
              operationCount = 0;
            }
          } catch (error) {
            results.errors.push({ type: 'client', id: client.id, error: error.message });
          }
        }
      }

      // Migrate items
      if (localData.items && Array.isArray(localData.items)) {
        for (const item of localData.items) {
          try {
            const itemRef = doc(collection(db, 'items'));
            batch.set(itemRef, {
              ...item,
              userId,
              migratedAt: serverTimestamp(),
              createdAt: item.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            results.items++;
            operationCount++;

            if (operationCount >= 450) {
              await batch.commit();
              operationCount = 0;
            }
          } catch (error) {
            results.errors.push({ type: 'item', id: item.id, error: error.message });
          }
        }
      }

      // Commit any remaining operations
      if (operationCount > 0) {
        await batch.commit();
      }

      logInfo('BatchService.migrateFromLocalStorage', `Migration completed: ${results.invoices} invoices, ${results.clients} clients, ${results.items} items`);
      return results;
    } catch (error) {
      logError('BatchService.migrateFromLocalStorage', error, { userId });
      throw error;
    }
  }

  /**
   * Delete all user data (for account deletion)
   */
  async deleteAllUserData(userId) {
    const batch = writeBatch(db);
    let deletedCount = 0;

    try {
      // Delete invoices
      const invoicesQuery = query(collection(db, 'invoices'), where('userId', '==', userId));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      invoicesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Delete clients
      const clientsQuery = query(collection(db, 'clients'), where('userId', '==', userId));
      const clientsSnapshot = await getDocs(clientsQuery);
      clientsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Delete items
      const itemsQuery = query(collection(db, 'items'), where('userId', '==', userId));
      const itemsSnapshot = await getDocs(itemsQuery);
      itemsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Delete user profile
      const userRef = doc(db, 'users', userId);
      batch.delete(userRef);
      deletedCount++;

      await batch.commit();
      logInfo('BatchService.deleteAllUserData', `Deleted ${deletedCount} documents for user ${userId}`);
      return deletedCount;
    } catch (error) {
      logError('BatchService.deleteAllUserData', error, { userId });
      throw error;
    }
  }
}

// Export service instances
export const usersService = new UsersService();
export const invoicesService = new InvoicesService();
export const clientsService = new ClientsService();
export const itemsService = new ItemsService();
export const batchService = new BatchService();

// Export default object with all services
export default {
  users: usersService,
  invoices: invoicesService,
  clients: clientsService,
  items: itemsService,
  batch: batchService
};