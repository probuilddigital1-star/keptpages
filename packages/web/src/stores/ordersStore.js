import { create } from 'zustand';
import api from '@/services/api';

export const useOrdersStore = create((set) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const result = await api.get('/books/orders');
      set({ orders: result.orders || [], loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },
}));
