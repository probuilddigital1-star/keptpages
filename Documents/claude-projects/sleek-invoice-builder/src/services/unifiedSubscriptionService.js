import { logInfo, logError } from '../utils/errorHandler';
import authService from './authService';
import stripeService from './stripeService';
import subscriptionService from './subscriptionService';

/**
 * Unified Subscription Service
 * Provides a provider-agnostic interface for managing subscriptions
 * across Stripe, Google Play, Apple, and Admin-set subscriptions
 */
class UnifiedSubscriptionService {
  constructor() {
    this.providers = {
      stripe: stripeService,
      google_play: subscriptionService,
      apple: null, // Future implementation
      admin: null, // No provider needed
      promotional: null // No provider needed
    };
  }

  /**
   * Get the current subscription provider
   * @returns {string} Provider name: 'stripe', 'google_play', 'apple', 'admin', 'promotional'
   */
  getCurrentProvider() {
    const userProfile = authService.userProfile;
    if (!userProfile?.subscription) {
      return null;
    }

    // Check for provider field (new subscriptions)
    if (userProfile.subscription.provider) {
      return userProfile.subscription.provider;
    }

    // Legacy detection (for existing subscriptions)
    if (userProfile.subscription.stripeSubscriptionId) {
      return 'stripe';
    }

    if (userProfile.subscription.googlePlayPurchaseToken) {
      return 'google_play';
    }

    // If subscription was modified by admin
    if (userProfile.subscription.modifiedBy === 'admin') {
      return 'admin';
    }

    // Default to admin for manually set subscriptions
    if (userProfile.subscription.tier !== 'free') {
      return 'admin';
    }

    return null;
  }

  /**
   * Check if user can manage their subscription
   * Admin and promotional subscriptions cannot be self-managed
   */
  canManageSubscription() {
    const provider = this.getCurrentProvider();
    return provider && provider !== 'admin' && provider !== 'promotional';
  }

  /**
   * Get user-friendly subscription status
   */
  getSubscriptionStatus() {
    const userProfile = authService.userProfile;
    if (!userProfile?.subscription) {
      return {
        tier: 'free',
        status: 'active',
        displayName: 'Free Plan',
        canManage: false
      };
    }

    const subscription = userProfile.subscription;
    const provider = this.getCurrentProvider();

    let displayName = '';
    let statusText = '';

    // Determine display name based on tier
    switch (subscription.tier) {
      case 'starter':
        displayName = 'Starter Plan';
        break;
      case 'pro':
        displayName = 'Professional Plan';
        break;
      case 'free':
      default:
        displayName = 'Free Plan';
        break;
    }

    // Add provider-specific status
    switch (provider) {
      case 'admin':
      case 'promotional':
        displayName = 'Complimentary ' + displayName;
        statusText = 'Provided by administrator';
        break;
      case 'stripe':
      case 'google_play':
      case 'apple':
        if (subscription.type === 'lifetime') {
          displayName = 'Lifetime ' + displayName;
          statusText = 'One-time purchase';
        } else if (subscription.type === 'yearly') {
          statusText = 'Billed annually';
        } else {
          statusText = 'Billed monthly';
        }
        break;
    }

    return {
      tier: subscription.tier,
      status: subscription.status || 'active',
      displayName,
      statusText,
      provider,
      canManage: this.canManageSubscription(),
      expiresAt: subscription.currentPeriodEnd,
      autoRenew: !subscription.cancelAtPeriodEnd
    };
  }

  /**
   * Purchase a subscription
   * Routes to appropriate provider based on platform
   */
  async purchaseSubscription(tier, billingCycle = 'monthly') {
    try {
      const isWeb = typeof window !== 'undefined' && !window.ReactNativeWebView;
      const provider = isWeb ? 'stripe' : this.detectMobileProvider();

      logInfo('UnifiedSubscription', `Purchasing ${tier} ${billingCycle} via ${provider}`);

      switch (provider) {
        case 'stripe':
          return await this.purchaseViaStripe(tier, billingCycle);
        case 'google_play':
          return await this.purchaseViaGooglePlay(tier, billingCycle);
        case 'apple':
          return await this.purchaseViaApple(tier, billingCycle);
        default:
          throw new Error('No payment provider available');
      }
    } catch (error) {
      logError('UnifiedSubscription.purchase', error);
      throw error;
    }
  }

  /**
   * Manage existing subscription
   * Opens appropriate management interface based on provider
   */
  async manageSubscription() {
    const provider = this.getCurrentProvider();
    const status = this.getSubscriptionStatus();

    if (!status.canManage) {
      // Show message for admin/promotional subscriptions
      return {
        success: false,
        message: 'This is a complimentary account. Please contact support for any changes.',
        showMessage: true
      };
    }

    logInfo('UnifiedSubscription', `Managing subscription via ${provider}`);

    try {
      switch (provider) {
        case 'stripe':
          // Open web portal (without mentioning Stripe)
          await stripeService.openCustomerPortal();
          return { success: true };

        case 'google_play':
          // Open device subscription settings
          return await this.openGooglePlaySubscriptions();

        case 'apple':
          // Open iOS subscription settings
          return await this.openAppleSubscriptions();

        default:
          throw new Error('Cannot manage this subscription type');
      }
    } catch (error) {
      logError('UnifiedSubscription.manage', error);
      throw error;
    }
  }

  // Private helper methods

  detectMobileProvider() {
    // Check if running on iOS or Android
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = userAgent.includes('iphone') || userAgent.includes('ipad');

    if (isAndroid) return 'google_play';
    if (isIOS) return 'apple';
    return 'stripe'; // Fallback to web
  }

  async purchaseViaStripe(tier, billingCycle) {
    const priceId = this.getStripePriceId(tier, billingCycle);
    return await stripeService.purchaseSubscription(priceId);
  }

  async purchaseViaGooglePlay(tier, billingCycle) {
    const productId = this.getGooglePlayProductId(tier, billingCycle);
    return await subscriptionService.purchaseSubscription(productId);
  }

  async purchaseViaApple(tier, billingCycle) {
    // Future implementation
    throw new Error('Apple payments not yet implemented');
  }

  async openGooglePlaySubscriptions() {
    try {
      // In React Native, this would open the subscription management
      // For now, show instructions
      const packageName = 'com.sleekinvoice.app';
      const url = `https://play.google.com/store/account/subscriptions?package=${packageName}`;

      if (window.ReactNativeWebView) {
        // In React Native WebView
        window.ReactNativeWebView.postMessage(JSON.stringify({
          action: 'openSubscriptions'
        }));
      } else {
        // In regular browser
        window.open(url, '_blank');
      }

      return { success: true };
    } catch (error) {
      logError('UnifiedSubscription.openGooglePlay', error);
      throw error;
    }
  }

  async openAppleSubscriptions() {
    // Future implementation
    throw new Error('Apple subscription management not yet implemented');
  }

  getStripePriceId(tier, billingCycle) {
    const priceMap = {
      starter_monthly: 'price_1SBHCtFMeJZgBy3MXyFmZBQL',
      starter_yearly: 'price_1SBHDvFMeJZgBy3MSoaiEnHT',
      pro_monthly: 'price_1SBHEMFMeJZgBy3MQsoSRXFi',
      pro_yearly: 'price_1SBHEjFMeJZgBy3MzuoJ7gCW',
      lifetime: 'price_1SBHFrFMeJZgBy3M3Eeullf1'
    };

    const key = billingCycle === 'lifetime'
      ? 'lifetime'
      : `${tier}_${billingCycle}`;

    return priceMap[key];
  }

  getGooglePlayProductId(tier, billingCycle) {
    const productMap = {
      starter_monthly: 'com.sleekinvoice.starter.monthly',
      starter_yearly: 'com.sleekinvoice.starter.yearly',
      pro_monthly: 'com.sleekinvoice.pro.monthly',
      pro_yearly: 'com.sleekinvoice.pro.yearly',
      lifetime: 'com.sleekinvoice.pro.lifetime'
    };

    const key = billingCycle === 'lifetime'
      ? 'lifetime'
      : `${tier}_${billingCycle}`;

    return productMap[key];
  }
}

const unifiedSubscriptionService = new UnifiedSubscriptionService();
export default unifiedSubscriptionService;