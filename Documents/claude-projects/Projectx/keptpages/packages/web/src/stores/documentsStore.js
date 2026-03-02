import { create } from 'zustand';
import api from '@/services/api';

export const useDocumentsStore = create((set, get) => ({
  // State
  documents: {},
  loading: false,

  // Actions
  fetchDocuments: async (collectionId) => {
    set({ loading: true });
    try {
      const documents = await api.get(`/collections/${collectionId}`);
      set((state) => ({
        documents: {
          ...state.documents,
          [collectionId]: documents,
        },
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addToCollection: async (collectionId, documentId, sortOrder) => {
    try {
      await api.post(`/collections/${collectionId}/documents`, {
        documentId,
        sortOrder,
      });
      set((state) => {
        const existing = state.documents[collectionId] || [];
        return {
          documents: {
            ...state.documents,
            [collectionId]: [
              ...existing,
              { id: documentId, sortOrder },
            ],
          },
        };
      });
    } catch (error) {
      throw error;
    }
  },

  removeFromCollection: async (collectionId, documentId) => {
    try {
      await api.delete(`/collections/${collectionId}/documents/${documentId}`);
      set((state) => {
        const existing = state.documents[collectionId] || [];
        return {
          documents: {
            ...state.documents,
            [collectionId]: existing.filter((d) => d.id !== documentId),
          },
        };
      });
    } catch (error) {
      throw error;
    }
  },

  reorderDocuments: async (collectionId, orderedIds) => {
    try {
      await api.put(`/collections/${collectionId}/reorder`, { orderedIds });
      set((state) => {
        const existing = state.documents[collectionId] || [];
        const reordered = orderedIds.map((id, index) => {
          const doc = existing.find((d) => d.id === id);
          return { ...doc, sortOrder: index };
        });
        return {
          documents: {
            ...state.documents,
            [collectionId]: reordered,
          },
        };
      });
    } catch (error) {
      throw error;
    }
  },
}));
