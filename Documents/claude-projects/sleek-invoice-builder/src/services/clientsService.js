/**
 * Firebase Clients Service
 * Handles all Firestore operations for client management
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';
import { logError, logInfo } from '../utils/errorHandler';

class ClientsService {
  constructor() {
    this.collectionName = 'clients';
    this.collectionRef = collection(db, this.collectionName);
  }

  /**
   * Get all clients for the current user
   */
  async getAllClients() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn('[ClientsService] No authenticated user');
        return [];
      }

      const q = query(
        this.collectionRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const clients = [];

      querySnapshot.forEach((doc) => {
        clients.push({ id: doc.id, ...doc.data() });
      });

      logInfo('[ClientsService] Fetched clients', { count: clients.length });
      return clients;
    } catch (error) {
      // If orderBy fails (no index), try without it
      if (error.code === 'failed-precondition') {
        try {
          const user = auth.currentUser;
          const q = query(
            this.collectionRef,
            where('userId', '==', user.uid)
          );

          const querySnapshot = await getDocs(q);
          const clients = [];

          querySnapshot.forEach((doc) => {
            clients.push({ id: doc.id, ...doc.data() });
          });

          return clients;
        } catch (fallbackError) {
          logError('ClientsService.getAllClients', fallbackError);
          return [];
        }
      }

      logError('ClientsService.getAllClients', error);
      return [];
    }
  }

  /**
   * Get client count for current user
   */
  async getClientCount() {
    try {
      const clients = await this.getAllClients();
      return clients.length;
    } catch (error) {
      logError('ClientsService.getClientCount', error);
      return 0;
    }
  }

  /**
   * Check if user can add more clients based on their plan
   */
  async canAddClient(userProfile) {
    try {
      const currentCount = await this.getClientCount();
      const tier = userProfile?.subscription?.tier || 'free';

      const limits = {
        free: 3,
        starter: 20,
        pro: Infinity
      };

      const limit = limits[tier] || limits.free;
      return currentCount < limit;
    } catch (error) {
      logError('ClientsService.canAddClient', error);
      return false;
    }
  }

  /**
   * Create a new client
   */
  async createClient(clientData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docRef = doc(this.collectionRef, clientData.id || this.generateId());

      const data = {
        ...clientData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, data);

      logInfo('[ClientsService] Client created', { id: docRef.id });
      return { id: docRef.id, ...data };
    } catch (error) {
      logError('ClientsService.createClient', error);
      throw error;
    }
  }

  /**
   * Update an existing client
   */
  async updateClient(clientId, updates) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docRef = doc(this.collectionRef, clientId);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Remove id from updates if present
      delete updateData.id;

      await updateDoc(docRef, updateData);

      logInfo('[ClientsService] Client updated', { id: clientId });
      return { id: clientId, ...updateData };
    } catch (error) {
      logError('ClientsService.updateClient', error);
      throw error;
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docRef = doc(this.collectionRef, clientId);
      await deleteDoc(docRef);

      logInfo('[ClientsService] Client deleted', { id: clientId });
      return true;
    } catch (error) {
      logError('ClientsService.deleteClient', error);
      throw error;
    }
  }

  /**
   * Migrate clients from localStorage to Firestore (one-time operation)
   */
  async migrateFromLocalStorage() {
    try {
      const localStorageKey = 'sleek_clients_v1';
      const localData = localStorage.getItem(localStorageKey);

      if (!localData) return 0;

      const clients = JSON.parse(localData);
      if (!Array.isArray(clients) || clients.length === 0) return 0;

      logInfo('[ClientsService] Starting migration', { count: clients.length });

      let migrated = 0;
      for (const client of clients) {
        try {
          await this.createClient({
            ...client,
            id: client.id || this.generateId(),
            migratedFromLocal: true
          });
          migrated++;
        } catch (error) {
          logError('[ClientsService] Failed to migrate client', error);
        }
      }

      // Clear localStorage after successful migration
      if (migrated > 0) {
        localStorage.removeItem(localStorageKey);
        logInfo('[ClientsService] Migration completed', { migrated });
      }

      return migrated;
    } catch (error) {
      logError('ClientsService.migrateFromLocalStorage', error);
      return 0;
    }
  }

  /**
   * Generate a unique ID for clients
   */
  generateId() {
    return 'c_' + Math.random().toString(36).slice(2, 10);
  }
}

// Export singleton instance
const clientsService = new ClientsService();
export default clientsService;