import { create } from 'zustand';
import api from '@/services/api';

export const useBookStore = create((set, get) => ({
  // State
  book: null,
  template: 'classic',
  chapters: [],
  coverDesign: {
    title: '',
    subtitle: '',
    photo: null,
    colorScheme: 'default',
  },
  generatingPdf: false,
  loading: false,

  // Actions
  createBook: async (collectionId, title) => {
    set({ loading: true });
    try {
      const book = await api.post('/books', { collectionId, title });
      set({
        book,
        template: book.template || 'classic',
        chapters: book.chapters || [],
        coverDesign: book.coverDesign || get().coverDesign,
        loading: false,
      });
      return book;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  loadBook: async (bookId) => {
    set({ loading: true });
    try {
      const book = await api.get(`/books/${bookId}`);
      set({
        book,
        template: book.template || 'classic',
        chapters: book.chapters || [],
        coverDesign: book.coverDesign || get().coverDesign,
        loading: false,
      });
      return book;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  updateTemplate: (template) => {
    set({ template });
  },

  updateCover: (coverData) => {
    set((state) => ({
      coverDesign: { ...state.coverDesign, ...coverData },
    }));
  },

  generatePdf: async (bookId) => {
    set({ generatingPdf: true });
    try {
      const result = await api.post(`/books/${bookId}/generate`);
      set({ generatingPdf: false });
      return result;
    } catch (error) {
      set({ generatingPdf: false });
      throw error;
    }
  },

  orderBook: async (bookId, shippingAddress, quantity = 1) => {
    set({ loading: true });
    try {
      const order = await api.post(`/books/${bookId}/order`, {
        shippingAddress,
        quantity,
      });
      set({ loading: false });
      return order;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  checkStatus: async (bookId) => {
    try {
      const status = await api.get(`/books/${bookId}/status`);
      set((state) => ({
        book: state.book?.id === bookId
          ? { ...state.book, status: status.status }
          : state.book,
      }));
      return status;
    } catch (error) {
      throw error;
    }
  },
}));
