import { useSubscriptionStore } from './subscriptionStore';
import api from '@/services/api';
import { stripeService } from '@/services/stripe';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services/stripe', () => ({
  stripeService: {
    createCheckout: vi.fn(),
    createPortalSession: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

const initialState = {
  tier: 'free',
  usage: { scans: 0, collections: 0 },
  limits: { scans: 25, collections: 5 },
  subscription: null,
  loading: false,
};

describe('subscriptionStore', () => {
  beforeEach(() => {
    useSubscriptionStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has tier=free and default usage/limits', () => {
      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.usage).toEqual({ scans: 0, collections: 0 });
      expect(state.limits).toEqual({ scans: 25, collections: 5 });
      expect(state.subscription).toBeNull();
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchSubscription', () => {
    it('fetches user profile and sets subscription state for free tier', async () => {
      api.get.mockResolvedValue({
        subscription: null,
        usage: { scans: 5, collections: 1 },
      });

      await useSubscriptionStore.getState().fetchSubscription();

      expect(api.get).toHaveBeenCalledWith('/user/profile');
      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.subscription).toBeNull();
      expect(state.usage).toEqual({ scans: 5, collections: 1 });
      expect(state.limits).toEqual({ scans: 25, collections: 5 });
      expect(state.loading).toBe(false);
    });

    it('sets keeper tier limits when subscription is keeper', async () => {
      api.get.mockResolvedValue({
        subscription: { tier: 'keeper', id: 'sub-1', status: 'active' },
        usage: { scans: 100, collections: 10 },
      });

      await useSubscriptionStore.getState().fetchSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('keeper');
      expect(state.limits).toEqual({ scans: Infinity, collections: Infinity });
      expect(state.subscription).toEqual({ tier: 'keeper', id: 'sub-1', status: 'active' });
    });

    it('uses profile.tier when subscription row is missing', async () => {
      api.get.mockResolvedValue({
        tier: 'keeper',
        subscription: null,
        usage: { scans: 50, collections: 10 },
      });

      await useSubscriptionStore.getState().fetchSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('keeper');
      expect(state.limits).toEqual({ scans: Infinity, collections: Infinity });
    });

    it('falls back to free limits for unknown tier', async () => {
      api.get.mockResolvedValue({
        subscription: { tier: 'unknown-tier', status: 'active' },
        usage: { scans: 0, collections: 0 },
      });

      await useSubscriptionStore.getState().fetchSubscription();

      expect(useSubscriptionStore.getState().limits).toEqual({ scans: 25, collections: 5 });
    });

    it('sets loading=false on failure', async () => {
      api.get.mockRejectedValue(new Error('Fetch failed'));

      await expect(
        useSubscriptionStore.getState().fetchSubscription()
      ).rejects.toThrow('Fetch failed');

      expect(useSubscriptionStore.getState().loading).toBe(false);
    });
  });

  describe('canScan', () => {
    it('returns true when scans are under the limit', () => {
      useSubscriptionStore.setState({
        usage: { scans: 10, collections: 0 },
        limits: { scans: 25, collections: 5 },
      });

      expect(useSubscriptionStore.getState().canScan()).toBe(true);
    });

    it('returns false when scans are at the limit', () => {
      useSubscriptionStore.setState({
        usage: { scans: 25, collections: 0 },
        limits: { scans: 25, collections: 5 },
      });

      expect(useSubscriptionStore.getState().canScan()).toBe(false);
    });

    it('returns false when scans exceed the limit', () => {
      useSubscriptionStore.setState({
        usage: { scans: 30, collections: 0 },
        limits: { scans: 25, collections: 5 },
      });

      expect(useSubscriptionStore.getState().canScan()).toBe(false);
    });

    it('returns true for keeper tier (Infinity limit)', () => {
      useSubscriptionStore.setState({
        usage: { scans: 1000, collections: 50 },
        limits: { scans: Infinity, collections: Infinity },
      });

      expect(useSubscriptionStore.getState().canScan()).toBe(true);
    });
  });

  describe('canCreateCollection', () => {
    it('returns true when collections are under the limit', () => {
      useSubscriptionStore.setState({
        usage: { scans: 0, collections: 0 },
        limits: { scans: 25, collections: 5 },
      });

      expect(useSubscriptionStore.getState().canCreateCollection()).toBe(true);
    });

    it('returns false when collections are at the limit', () => {
      useSubscriptionStore.setState({
        usage: { scans: 0, collections: 5 },
        limits: { scans: 25, collections: 5 },
      });

      expect(useSubscriptionStore.getState().canCreateCollection()).toBe(false);
    });

    it('returns false when collections exceed the limit', () => {
      useSubscriptionStore.setState({
        usage: { scans: 0, collections: 10 },
        limits: { scans: 25, collections: 5 },
      });

      expect(useSubscriptionStore.getState().canCreateCollection()).toBe(false);
    });

    it('returns true for keeper tier (Infinity limit)', () => {
      useSubscriptionStore.setState({
        usage: { scans: 0, collections: 100 },
        limits: { scans: Infinity, collections: Infinity },
      });

      expect(useSubscriptionStore.getState().canCreateCollection()).toBe(true);
    });
  });

  describe('upgrade', () => {
    it('calls stripeService.createCheckout with keeper_yearly plan', async () => {
      const mockResult = { url: 'https://stripe.com/checkout/123' };
      stripeService.createCheckout.mockResolvedValue(mockResult);

      const result = await useSubscriptionStore.getState().upgrade();

      expect(stripeService.createCheckout).toHaveBeenCalledWith('keeper_yearly');
      expect(result).toEqual(mockResult);
      expect(useSubscriptionStore.getState().loading).toBe(false);
    });

    it('sets loading during request', async () => {
      let resolveCheckout;
      stripeService.createCheckout.mockReturnValue(new Promise((resolve) => { resolveCheckout = resolve; }));

      const promise = useSubscriptionStore.getState().upgrade();
      expect(useSubscriptionStore.getState().loading).toBe(true);

      resolveCheckout({});
      await promise;
      expect(useSubscriptionStore.getState().loading).toBe(false);
    });

    it('sets loading=false on failure', async () => {
      stripeService.createCheckout.mockRejectedValue(new Error('Upgrade failed'));

      await expect(
        useSubscriptionStore.getState().upgrade()
      ).rejects.toThrow('Upgrade failed');

      expect(useSubscriptionStore.getState().loading).toBe(false);
    });
  });

  describe('purchaseBookProject', () => {
    it('calls stripeService.createCheckout with book plan and collectionId', async () => {
      const mockResult = { url: 'https://stripe.com/checkout/456' };
      stripeService.createCheckout.mockResolvedValue(mockResult);

      const result = await useSubscriptionStore.getState().purchaseBookProject('col-1');

      expect(stripeService.createCheckout).toHaveBeenCalledWith('book', { collectionId: 'col-1' });
      expect(result).toEqual(mockResult);
    });

    it('sets loading=false on failure', async () => {
      stripeService.createCheckout.mockRejectedValue(new Error('Purchase failed'));

      await expect(
        useSubscriptionStore.getState().purchaseBookProject('col-1')
      ).rejects.toThrow('Purchase failed');

      expect(useSubscriptionStore.getState().loading).toBe(false);
    });
  });
});
