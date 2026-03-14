import { create } from 'zustand';
import api from '@/services/api';

// --- Anonymous scan localStorage helpers ---
const ANON_SCANS_KEY = 'keptpages_anon_scans';
const ANON_SCANS_MAX = 5;

function getAnonymousScans() {
  try {
    const raw = localStorage.getItem(ANON_SCANS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Expire entries older than 24h
    const cutoff = Date.now() - 86400 * 1000;
    return data.filter((s) => s.timestamp > cutoff);
  } catch {
    return [];
  }
}

function saveAnonymousScan(result) {
  const scans = getAnonymousScans();
  scans.push({ ...result, timestamp: Date.now() });
  localStorage.setItem(ANON_SCANS_KEY, JSON.stringify(scans));
}

export const useScanStore = create((set, get) => ({
  // State
  currentScan: null,
  uploadProgress: 0,
  processing: false,
  scans: [],
  // Multi-page staging
  pages: [], // Array of { blob, previewUrl }

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
        set({ uploadProgress: Math.round(progress * 100) });
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

  addPage: async (scanId, file) => {
    const scan = await api.upload(`/scan/${scanId}/add-page`, file);
    return scan;
  },

  processScan: async (scanId) => {
    set({ processing: true });
    try {
      const result = await api.post(`/scan/${scanId}/process`);
      set((state) => ({
        currentScan: state.currentScan ? { ...state.currentScan, ...result } : result,
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
        currentScan: state.currentScan ? { ...state.currentScan, ...result } : result,
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

  deleteScan: async (scanId) => {
    try {
      await api.delete(`/scan/${scanId}`);
      set((state) => ({
        currentScan: state.currentScan?.id === scanId ? null : state.currentScan,
        scans: state.scans.filter((s) => s.id !== scanId),
      }));
    } catch (error) {
      throw error;
    }
  },

  // Anonymous scan (no auth, single page only)
  uploadAnonymousScan: async (file) => {
    set({ uploadProgress: 0, processing: true });
    try {
      const result = await api.publicUpload('/public/scan', file);
      saveAnonymousScan(result);
      set({ processing: false, uploadProgress: 100 });
      return result;
    } catch (error) {
      set({ processing: false, uploadProgress: 0 });
      throw error;
    }
  },

  getAnonymousScanCount: () => getAnonymousScans().length,
  getAnonymousScansRemaining: () => ANON_SCANS_MAX - getAnonymousScans().length,
  getAnonymousScans: () => getAnonymousScans(),

  // Multi-page staging actions
  addStagedPage: (blob) => {
    const previewUrl = URL.createObjectURL(blob);
    set((state) => ({
      pages: [...state.pages, { blob, previewUrl }],
    }));
  },

  removeStagedPage: (index) => {
    set((state) => {
      const pages = [...state.pages];
      const removed = pages.splice(index, 1);
      if (removed[0]?.previewUrl) {
        URL.revokeObjectURL(removed[0].previewUrl);
      }
      return { pages };
    });
  },

  clearStagedPages: () => {
    const { pages } = get();
    pages.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    set({ pages: [] });
  },

  reset: () => {
    const { pages } = get();
    pages.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    set({
      currentScan: null,
      uploadProgress: 0,
      processing: false,
      pages: [],
    });
  },
}));
