import itemsService from '../services/itemsService';

// Cache for items to avoid frequent Firebase calls
let itemsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

const KEY = 'sleek_items_v1'; // Keep for migration check

export async function listItems() {
  try {
    // Check if we need to migrate from localStorage
    const localData = localStorage.getItem(KEY);
    if (localData) {
      await itemsService.migrateFromLocalStorage();
    }

    // Use cache if available and fresh
    if (itemsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return itemsCache;
    }

    // Fetch from Firebase
    const items = await itemsService.getAllItems();
    itemsCache = items;
    cacheTimestamp = Date.now();
    return items;
  } catch (error) {
    console.error('[items store] Failed to list items:', error);
    return [];
  }
}

export async function saveItems(arr) {
  // This function is no longer used but kept for compatibility
  // Individual operations should use upsertItem or deleteItem
  itemsCache = arr;
  cacheTimestamp = Date.now();
  return arr;
}

export async function upsertItem(item) {
  try {
    let result;

    // Check if it's an update or create
    const existingItems = await listItems();
    const exists = existingItems.some(i => i.id === item.id);

    if (exists) {
      // Update existing item
      result = await itemsService.updateItem(item.id, item);
    } else {
      // Create new item
      result = await itemsService.createItem(item);
    }

    // Clear cache to force refresh
    itemsCache = null;

    return result;
  } catch (error) {
    console.error('[items store] Failed to upsert item:', error);
    throw error;
  }
}

export async function deleteItem(id) {
  try {
    await itemsService.deleteItem(id);

    // Clear cache to force refresh
    itemsCache = null;

    return true;
  } catch (error) {
    console.error('[items store] Failed to delete item:', error);
    throw error;
  }
}

export function genItemId() {
  return itemsService.generateId();
}