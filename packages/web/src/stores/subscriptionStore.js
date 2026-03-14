import { create } from 'zustand';
import api from '@/services/api';
import { stripeService } from '@/services/stripe';
import { TIER_LIMITS } from '@/config/plans';

export const useSubscriptionStore = create((set, get) => ({
  // State
  tier: 'free',
  usage: { scans: 0, collections: 0 },
  limits: { scans: 25, collections: 2 },
  subscription: null,
  isAdmin: false,
  loading: false,
  keeperPassPurchasedAt: null,
  firstBookPurchasedAt: null,
  bookDiscountPercent: 0,

  // Actions
  fetchSubscription: async () => {
    set({ loading: true });
    try {
      const profile = await api.get('/user/profile');

      // Trust profile.tier from the database
      const tier = profile.tier || 'free';
      const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      set({
        tier,
        subscription: profile.subscription || null,
        usage: profile.usage || { scans: 0, collections: 0 },
        limits: { scans: tierLimits.scans, collections: tierLimits.collections },
        isAdmin: profile.isAdmin || false,
        keeperPassPurchasedAt: profile.keeperPassPurchasedAt || null,
        firstBookPurchasedAt: profile.firstBookPurchasedAt || null,
        bookDiscountPercent: profile.bookDiscountPercent || 0,
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

  /** Whether the user can export PDFs */
  canExportPdf: () => {
    const { tier } = get();
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    return limits.pdfExport; // false, 'per_book', or true
  },

  /** Get the user's book discount rate (0 or 0.15) */
  bookDiscount: () => {
    const { bookDiscountPercent } = get();
    return bookDiscountPercent === 15 ? 0.15 : 0;
  },

  /** Boolean: is user a Keeper Pass holder? */
  get isKeeperPass() {
    return get().tier === 'keeper';
  },

  /** Boolean: is user a book purchaser? */
  get isBookPurchaser() {
    return get().tier === 'book_purchaser';
  },

  /** Start a Stripe Checkout session for Keeper Pass ($59 one-time) */
  purchaseKeeperPass: async () => {
    set({ loading: true });
    try {
      const result = await stripeService.createCheckout('keeper_pass');
      set({ loading: false });
      return result;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));
