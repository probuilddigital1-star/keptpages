import { create } from 'zustand';
import api from '@/services/api';

export const useEditorStore = create((set, get) => ({
  // State
  originalImage: null,
  extractedData: null,
  editedData: null,
  confidence: 0,
  isDirty: false,
  saving: false,

  // Actions
  loadScan: (scan) => {
    set({
      originalImage: scan.imageUrl || scan.originalImage || null,
      extractedData: scan.extractedData || null,
      editedData: scan.extractedData ? { ...scan.extractedData } : null,
      confidence: scan.confidence || 0,
      isDirty: false,
      saving: false,
    });
  },

  updateField: (field, value) => {
    set((state) => {
      const editedData = { ...state.editedData, [field]: value };
      const isDirty = JSON.stringify(editedData) !== JSON.stringify(state.extractedData);
      return { editedData, isDirty };
    });
  },

  acceptChanges: () => {
    set((state) => ({
      extractedData: { ...state.editedData },
      isDirty: false,
    }));
  },

  revertChanges: () => {
    set((state) => ({
      editedData: state.extractedData ? { ...state.extractedData } : null,
      isDirty: false,
    }));
  },

  save: async (scanId) => {
    const { editedData } = get();
    set({ saving: true });
    try {
      const result = await api.put(`/scan/${scanId}`, {
        extractedData: editedData,
      });
      set({
        extractedData: { ...editedData },
        isDirty: false,
        saving: false,
      });
      return result;
    } catch (error) {
      set({ saving: false });
      throw error;
    }
  },
}));
