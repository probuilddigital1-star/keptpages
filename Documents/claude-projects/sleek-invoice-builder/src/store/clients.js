import clientsService from '../services/clientsService';

// Cache for clients to avoid frequent Firebase calls
let clientsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

const KEY = 'sleek_clients_v1'; // Keep for migration check

export async function listClients() {
  try {
    // Check if we need to migrate from localStorage
    const localData = localStorage.getItem(KEY);
    if (localData) {
      await clientsService.migrateFromLocalStorage();
    }

    // Use cache if available and fresh
    if (clientsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return clientsCache;
    }

    // Fetch from Firebase
    const clients = await clientsService.getAllClients();
    clientsCache = clients;
    cacheTimestamp = Date.now();
    return clients;
  } catch (error) {
    console.error('[clients store] Failed to list clients:', error);
    return [];
  }
}

export async function saveClients(arr) {
  // This function is no longer used but kept for compatibility
  // Individual operations should use upsertClient or deleteClient
  clientsCache = arr;
  cacheTimestamp = Date.now();
  return arr;
}

export async function upsertClient(client) {
  try {
    let result;

    // Check if it's an update or create
    const existingClients = await listClients();
    const exists = existingClients.some(c => c.id === client.id);

    if (exists) {
      // Update existing client
      result = await clientsService.updateClient(client.id, client);
    } else {
      // Create new client
      result = await clientsService.createClient(client);
    }

    // Clear cache to force refresh
    clientsCache = null;

    return result;
  } catch (error) {
    console.error('[clients store] Failed to upsert client:', error);
    throw error;
  }
}

export async function deleteClient(id) {
  try {
    await clientsService.deleteClient(id);

    // Clear cache to force refresh
    clientsCache = null;

    return true;
  } catch (error) {
    console.error('[clients store] Failed to delete client:', error);
    throw error;
  }
}

export function genClientId() {
  return clientsService.generateId();
}