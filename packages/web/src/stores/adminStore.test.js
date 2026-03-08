import { useAdminStore } from './adminStore';
import api from '@/services/api';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const initialState = {
  orders: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  filters: { status: '' },
};

describe('adminStore', () => {
  beforeEach(() => {
    useAdminStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty orders and default pagination', () => {
      const state = useAdminStore.getState();
      expect(state.orders).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.page).toBe(1);
      expect(state.limit).toBe(20);
      expect(state.loading).toBe(false);
      expect(state.filters).toEqual({ status: '' });
    });
  });

  describe('setFilters', () => {
    it('merges new filters into existing ones', () => {
      useAdminStore.getState().setFilters({ status: 'ordered' });
      expect(useAdminStore.getState().filters).toEqual({ status: 'ordered' });
    });
  });

  describe('fetchOrders', () => {
    it('fetches orders and updates state', async () => {
      const mockResult = {
        orders: [{ id: '1', title: 'Test Book', status: 'ordered' }],
        total: 1,
        page: 1,
      };
      api.get.mockResolvedValue(mockResult);

      await useAdminStore.getState().fetchOrders();

      expect(api.get).toHaveBeenCalledWith('/admin/orders?page=1&limit=20');
      const state = useAdminStore.getState();
      expect(state.orders).toEqual(mockResult.orders);
      expect(state.total).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('includes status filter in query', async () => {
      api.get.mockResolvedValue({ orders: [], total: 0, page: 1 });

      useAdminStore.getState().setFilters({ status: 'shipped' });
      await useAdminStore.getState().fetchOrders();

      expect(api.get).toHaveBeenCalledWith('/admin/orders?page=1&limit=20&status=shipped');
    });

    it('accepts page override', async () => {
      api.get.mockResolvedValue({ orders: [], total: 0, page: 2 });

      await useAdminStore.getState().fetchOrders({ page: 2 });

      expect(api.get).toHaveBeenCalledWith('/admin/orders?page=2&limit=20');
    });

    it('sets loading=false on error', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await expect(useAdminStore.getState().fetchOrders()).rejects.toThrow('Network error');
      expect(useAdminStore.getState().loading).toBe(false);
    });
  });

  describe('mockStatus', () => {
    it('sends mock status and refreshes orders', async () => {
      api.post.mockResolvedValue({ id: '1', status: 'printing' });
      api.get.mockResolvedValue({ orders: [], total: 0, page: 1 });

      const result = await useAdminStore.getState().mockStatus('1', 'printing');

      expect(api.post).toHaveBeenCalledWith('/admin/orders/1/mock-status', { status: 'printing' });
      expect(result).toEqual({ id: '1', status: 'printing' });
      // Should also refresh orders
      expect(api.get).toHaveBeenCalled();
    });

    it('includes tracking info when provided', async () => {
      api.post.mockResolvedValue({ id: '1', status: 'shipped' });
      api.get.mockResolvedValue({ orders: [], total: 0, page: 1 });

      await useAdminStore.getState().mockStatus('1', 'shipped', 'TRACK-123', 'https://track.example.com');

      expect(api.post).toHaveBeenCalledWith('/admin/orders/1/mock-status', {
        status: 'shipped',
        trackingId: 'TRACK-123',
        trackingUrl: 'https://track.example.com',
      });
    });
  });
});
