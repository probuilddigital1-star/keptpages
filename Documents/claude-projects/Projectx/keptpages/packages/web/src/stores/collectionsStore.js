import { create } from 'zustand';
import api from '@/services/api';

export const useCollectionsStore = create((set, get) => ({
  // State
  collections: [],
  loading: false,
  error: null,

  // Actions
  fetchCollections: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/collections');
      set({ collections: res.collections || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createCollection: async (data) => {
    set({ loading: true, error: null });
    try {
      const collection = await api.post('/collections', data);
      set((state) => ({
        collections: [...state.collections, collection],
        loading: false,
      }));
      return collection;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateCollection: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await api.put(`/collections/${id}`, data);
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === id ? { ...c, ...updated } : c
        ),
        loading: false,
      }));
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteCollection: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/collections/${id}`);
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));
