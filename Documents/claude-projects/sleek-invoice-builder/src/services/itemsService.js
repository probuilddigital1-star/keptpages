/**
 * Firebase Items Service
 * Handles all Firestore operations for item/product management
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

class ItemsService {
  constructor() {
    this.collectionName = 'items';
    this.collectionRef = collection(db, this.collectionName);
  }

  /**
   * Get all items for the current user
   */
  async getAllItems() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn('[ItemsService] No authenticated user');
        return [];
      }

      const q = query(
        this.collectionRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const items = [];

      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });

      logInfo('[ItemsService] Fetched items', { count: items.length });
      return items;
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
          const items = [];

          querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
          });

          return items;
        } catch (fallbackError) {
          logError('ItemsService.getAllItems', fallbackError);
          return [];
        }
      }

      logError('ItemsService.getAllItems', error);
      return [];
    }
  }

  /**
   * Get item count for current user
   */
  async getItemCount() {
    try {
      const items = await this.getAllItems();
      return items.length;
    } catch (error) {
      logError('ItemsService.getItemCount', error);
      return 0;
    }
  }

  /**
   * Check if user can add more items based on their plan
   */
  async canAddItem(userProfile) {
    try {
      const currentCount = await this.getItemCount();
      const tier = userProfile?.subscription?.tier || 'free';

      const limits = {
        free: 5,
        starter: 50,
        pro: Infinity
      };

      const limit = limits[tier] || limits.free;
      return currentCount < limit;
    } catch (error) {
      logError('ItemsService.canAddItem', error);
      return false;
    }
  }

  /**
   * Create a new item
   */
  async createItem(itemData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docRef = doc(this.collectionRef, itemData.id || this.generateId());

      const data = {
        ...itemData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, data);

      logInfo('[ItemsService] Item created', { id: docRef.id });
      return { id: docRef.id, ...data };
    } catch (error) {
      logError('ItemsService.createItem', error);
      throw error;
    }
  }

  /**
   * Update an existing item
   */
  async updateItem(itemId, updates) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docRef = doc(this.collectionRef, itemId);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Remove id from updates if present
      delete updateData.id;

      await updateDoc(docRef, updateData);

      logInfo('[ItemsService] Item updated', { id: itemId });
      return { id: itemId, ...updateData };
    } catch (error) {
      logError('ItemsService.updateItem', error);
      throw error;
    }
  }

  /**
   * Delete an item
   */
  async deleteItem(itemId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docRef = doc(this.collectionRef, itemId);
      await deleteDoc(docRef);

      logInfo('[ItemsService] Item deleted', { id: itemId });
      return true;
    } catch (error) {
      logError('ItemsService.deleteItem', error);
      throw error;
    }
  }

  /**
   * Migrate items from localStorage to Firestore (one-time operation)
   */
  async migrateFromLocalStorage() {
    try {
      const localStorageKey = 'sleek_items_v1';
      const localData = localStorage.getItem(localStorageKey);

      if (!localData) return 0;

      const items = JSON.parse(localData);
      if (!Array.isArray(items) || items.length === 0) return 0;

      logInfo('[ItemsService] Starting migration', { count: items.length });

      let migrated = 0;
      for (const item of items) {
        try {
          await this.createItem({
            ...item,
            id: item.id || this.generateId(),
            migratedFromLocal: true
          });
          migrated++;
        } catch (error) {
          logError('[ItemsService] Failed to migrate item', error);
        }
      }

      // Clear localStorage after successful migration
      if (migrated > 0) {
        localStorage.removeItem(localStorageKey);
        logInfo('[ItemsService] Migration completed', { migrated });
      }

      return migrated;
    } catch (error) {
      logError('ItemsService.migrateFromLocalStorage', error);
      return 0;
    }
  }

  /**
   * Generate a unique ID for items
   */
  generateId() {
    return 'i_' + Math.random().toString(36).slice(2, 10);
  }
}

// Export singleton instance
const itemsService = new ItemsService();
export default itemsService;