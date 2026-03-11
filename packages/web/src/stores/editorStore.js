import { create } from 'zustand';
import api from '@/services/api';

/**
 * Normalize an ingredient entry to a plain string.
 * The AI may return objects like { item, amount, unit } or plain strings.
 */
function normalizeIngredient(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const parts = [entry.amount, entry.unit, entry.item].filter(Boolean);
    return parts.join(' ') || String(entry);
  }
  return String(entry ?? '');
}

/**
 * Normalize extractedData so the frontend always works with plain strings
 * in list fields (ingredients, instructions).
 */
function normalizeExtractedData(data) {
  if (!data) return data;
  const normalized = { ...data };
  if (Array.isArray(normalized.ingredients)) {
    normalized.ingredients = normalized.ingredients.map(normalizeIngredient);
  }
  if (Array.isArray(normalized.instructions)) {
    normalized.instructions = normalized.instructions.map((s) =>
      typeof s === 'string' ? s : String(s ?? ''),
    );
  }
  return normalized;
}

export const useEditorStore = create((set, get) => ({
  // State
  originalImage: null,
  originalImages: [], // Multi-page: array of blob URLs
  currentPageIndex: 0,
  pageCount: 1,
  extractedData: null,
  editedData: null,
  confidence: 0,
  isDirty: false,
  saving: false,

  // Actions
  loadScan: (scan) => {
    const normalized = normalizeExtractedData(scan.extractedData);
    set({
      originalImage: scan.imageUrl || scan.originalImage || null,
      originalImages: [],
      currentPageIndex: 0,
      pageCount: scan.pageCount || 1,
      extractedData: normalized || null,
      editedData: normalized ? { ...normalized } : null,
      confidence: scan.confidence || 0,
      isDirty: false,
      saving: false,
    });
  },

  setOriginalImages: (images) => {
    set({
      originalImages: images,
      originalImage: images[0] || null,
    });
  },

  setCurrentPage: (index) => {
    const { originalImages } = get();
    if (index >= 0 && index < originalImages.length) {
      set({
        currentPageIndex: index,
        originalImage: originalImages[index] || null,
      });
    }
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
      const result = await api.put(`/scan/${scanId}`, editedData);
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
