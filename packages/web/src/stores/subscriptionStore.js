import { create } from 'zustand';
import api from '@/services/api';
import { stripeService } from '@/services/stripe';
import { TIER_LIMITS, DAILY_SCAN_CAP } from '@/config/plans';

export const useSubscriptionStore = create((set, get) => ({
  // State
  tier: 'free',
  usage: { scans: 0, collections: 0 },
  limits: { scans: TIER_LIMITS.free.scans, collections: TIER_LIMITS.free.collections },
  subscription: null,
  isAdmin: false,
  loading: false,
  keeperPassPurchasedAt: null,
  firstBookPurchasedAt: null,
  bookDiscountPercent: 0,
  dailyScansUsed: 0,
  dailyScansLimit: DAILY_SCAN_CAP,

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
        dailyScansUsed: profile.dailyScansUsed || 0,
        dailyScansLimit: profile.dailyScansLimit || DAILY_SCAN_CAP,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  canScan: () => {
    const { usage, limits, tier, dailyScansUsed, dailyScansLimit } = get();
    // Monthly limit check
    if (usage.scans >= limits.scans) return false;
    // Daily cap check for unlimited tiers
    if (tier === 'keeper' || tier === 'book_purchaser') {
      if (dailyScansUsed >= dailyScansLimit) return false;
    }
    return true;
  },

  dailyScansRemaining: () => {
    const { dailyScansUsed, dailyScansLimit } = get();
    return Math.max(0, dailyScansLimit - dailyScansUsed);
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
