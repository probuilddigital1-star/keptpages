import { create } from 'zustand';
import api from '@/services/api';

export const useSubscriptionStore = create((set, get) => ({
  // State
  tier: 'free',
  usage: { scans: 0, collections: 0 },
  limits: { scans: 25, collections: 1 },
  subscription: null,
  loading: false,

  // Actions
  fetchSubscription: async () => {
    set({ loading: true });
    try {
      const profile = await api.get('/user/profile');
      const subscription = profile.subscription || null;
      const tier = subscription?.tier || 'free';

      const tierLimits = {
        free: { scans: 25, collections: 1 },
        keeper: { scans: Infinity, collections: Infinity },
      };

      set({
        tier,
        subscription,
        usage: profile.usage || { scans: 0, collections: 0 },
        limits: tierLimits[tier] || tierLimits.free,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  canScan: () => {
    const { usage, limits } = get();
    return usage.scans < limits.scans;
  },

  canCreateCollection: () => {
    const { usage, limits } = get();
    return usage.collections < limits.collections;
  },

  upgrade: async () => {
    set({ loading: true });
    try {
      const result = await api.post('/stripe/checkout', { plan: 'keeper' });
      set({ loading: false });
      return result;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  purchaseBookProject: async (collectionId) => {
    set({ loading: true });
    try {
      const result = await api.post('/stripe/checkout', {
        plan: 'book',
        collectionId,
      });
      set({ loading: false });
      return result;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));
