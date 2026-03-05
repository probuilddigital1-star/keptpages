import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // State
  sidebarOpen: false,
  theme: 'light',
  toasts: [],

  // Actions
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  addToast: (message, variant = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setTheme: (theme) => {
    set({ theme });
  },
}));
