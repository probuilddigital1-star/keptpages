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
      const res = await api.get(`/collections/${collectionId}`);
      const items = (res.items || []).map((item) => ({
        id: item.scan?.id || item.id,
        collectionItemId: item.id,
        title: item.scan?.title,
        documentType: item.scan?.documentType,
        extractedData: item.scan?.extractedData,
        originalFilename: item.scan?.originalFilename,
        status: item.scan?.status,
        confidence: item.scan?.confidence,
        position: item.position,
        sectionTitle: item.sectionTitle,
      }));
      set((state) => ({
        documents: {
          ...state.documents,
          [collectionId]: items,
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
        const reordered = orderedIds
          .map((id, index) => {
            const doc = existing.find((d) => d.id === id);
            if (!doc) return null;
            return { ...doc, sortOrder: index };
          })
          .filter(Boolean);
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
