import { create } from 'zustand';
import api from '@/services/api';

export const useAdminStore = create((set, get) => ({
  orders: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  filters: { status: '' },
  orderDetail: null,
  detailLoading: false,

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  fetchOrders: async (overrides = {}) => {
    set({ loading: true });
    const { page, limit, filters } = get();
    const params = new URLSearchParams();
    const currentPage = overrides.page || page;
    const currentStatus = overrides.status !== undefined ? overrides.status : filters.status;

    params.set('page', String(currentPage));
    params.set('limit', String(limit));
    if (currentStatus) params.set('status', currentStatus);

    try {
      const result = await api.get(`/admin/orders?${params.toString()}`);
      set({
        orders: result.orders || [],
        total: result.total || 0,
        page: result.page || currentPage,
        loading: false,
      });
      return result;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchOrderDetail: async (orderId) => {
    set({ detailLoading: true });
    try {
      const result = await api.get(`/admin/orders/${orderId}`);
      set({ orderDetail: result, detailLoading: false });
      return result;
    } catch (error) {
      set({ detailLoading: false });
      throw error;
    }
  },

  clearOrderDetail: () => set({ orderDetail: null }),

  mockStatus: async (bookId, status, trackingId, trackingUrl) => {
    const body = { status };
    if (trackingId) body.trackingId = trackingId;
    if (trackingUrl) body.trackingUrl = trackingUrl;
    const result = await api.post(`/admin/orders/${bookId}/mock-status`, body);
    // Refresh the order list after updating
    await get().fetchOrders();
    return result;
  },
}));
