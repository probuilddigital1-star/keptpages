import { create } from 'zustand';
import api from '@/services/api';
import { stripeService } from '@/services/stripe';

export const useSubscriptionStore = create((set, get) => ({
  // State
  tier: 'free',
  usage: { scans: 0, collections: 0 },
  limits: { scans: 25, collections: 5 },
  subscription: null,
  isAdmin: false,
  loading: false,

  // Actions
  fetchSubscription: async () => {
    set({ loading: true });
    try {
      const profile = await api.get('/user/profile');
      const subscription = profile.subscription || null;

      // Derive tier: trust profile.tier from the database (set by webhook or admin).
      // Fall back to subscription status check, then default to 'free'.
      const tier = profile.tier && profile.tier !== 'free'
        ? profile.tier
        : (subscription && (subscription.status === 'active' || subscription.status === 'trialing'))
          ? (subscription.tier || 'keeper')
          : 'free';

      const tierLimits = {
        free: { scans: 25, collections: 5 },
        keeper: { scans: Infinity, collections: Infinity },
      };

      set({
        tier,
        subscription,
        usage: profile.usage || { scans: 0, collections: 0 },
        limits: tierLimits[tier] || tierLimits.free,
        isAdmin: profile.isAdmin || false,
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

  /** Start a Stripe Checkout session for Keeper upgrade */
  upgrade: async (plan = 'keeper_yearly') => {
    set({ loading: true });
    try {
      const result = await stripeService.createCheckout(plan);
      set({ loading: false });
      return result;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  /** Start a Stripe Checkout session for a book project */
  purchaseBookProject: async (collectionId) => {
    set({ loading: true });
    try {
      const result = await stripeService.createCheckout('book', { collectionId });
      set({ loading: false });
      return result;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  /** Cancel the current subscription at period end */
  cancelSubscription: async () => {
    set({ loading: true });
    try {
      await stripeService.cancelSubscription();
      // Re-fetch to get updated state
      await get().fetchSubscription();
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  /** Open the Stripe Customer Portal; returns the portal URL */
  openPortal: async () => {
    set({ loading: true });
    try {
      const result = await stripeService.createPortalSession();
      set({ loading: false });
      return result?.url || null;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));
