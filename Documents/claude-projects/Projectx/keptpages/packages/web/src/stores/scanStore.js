import { create } from 'zustand';
import api from '@/services/api';

export const useScanStore = create((set, get) => ({
  // State
  currentScan: null,
  uploadProgress: 0,
  processing: false,
  scans: [],

  // Actions
  fetchScans: async () => {
    try {
      const data = await api.get('/scan');
      set({ scans: data.scans || [] });
      return data.scans || [];
    } catch (error) {
      throw error;
    }
  },

  uploadScan: async (file, onProgress) => {
    set({ uploadProgress: 0 });
    try {
      const scan = await api.upload('/scan', file, (progress) => {
        set({ uploadProgress: progress });
        if (onProgress) onProgress(progress);
      });
      set((state) => ({
        currentScan: scan,
        scans: [...state.scans, scan],
        uploadProgress: 100,
      }));
      return scan;
    } catch (error) {
      set({ uploadProgress: 0 });
      throw error;
    }
  },

  processScan: async (scanId) => {
    set({ processing: true });
    try {
      const result = await api.post(`/scan/${scanId}/process`);
      set((state) => ({
        currentScan: { ...state.currentScan, ...result },
        scans: state.scans.map((s) => (s.id === scanId ? { ...s, ...result } : s)),
        processing: false,
      }));
      return result;
    } catch (error) {
      set({ processing: false });
      throw error;
    }
  },

  reprocessScan: async (scanId) => {
    set({ processing: true });
    try {
      const result = await api.post(`/scan/${scanId}/reprocess`);
      set((state) => ({
        currentScan: { ...state.currentScan, ...result },
        scans: state.scans.map((s) => (s.id === scanId ? { ...s, ...result } : s)),
        processing: false,
      }));
      return result;
    } catch (error) {
      set({ processing: false });
      throw error;
    }
  },

  getScan: async (scanId) => {
    try {
      const scan = await api.get(`/scan/${scanId}`);
      set({ currentScan: scan });
      return scan;
    } catch (error) {
      throw error;
    }
  },

  updateScan: async (scanId, data) => {
    try {
      const updated = await api.put(`/scan/${scanId}`, data);
      set((state) => ({
        currentScan: state.currentScan?.id === scanId ? { ...state.currentScan, ...updated } : state.currentScan,
        scans: state.scans.map((s) => (s.id === scanId ? { ...s, ...updated } : s)),
      }));
      return updated;
    } catch (error) {
      throw error;
    }
  },

  reset: () => {
    set({
      currentScan: null,
      uploadProgress: 0,
      processing: false,
    });
  },
}));
