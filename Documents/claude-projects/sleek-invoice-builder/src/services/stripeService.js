import { loadStripe } from '@stripe/stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { logError, logInfo } from '../utils/errorHandler';

// Initialize Stripe with your account's test key
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

let stripePromise = null;

class StripeService {
  constructor() {
    this.createCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');
    this.createPortalSession = httpsCallable(functions, 'createStripePortalSession');
    this.verifyStripePayment = httpsCallable(functions, 'verifyStripePayment');
  }

  // Get Stripe instance
  async getStripe() {
    if (!stripePromise) {
      if (!STRIPE_PUBLIC_KEY) {
        throw new Error('Stripe public key is not configured');
      }
      stripePromise = loadStripe(STRIPE_PUBLIC_KEY);
    }
    return stripePromise;
  }

  // Create checkout session for subscription
  async createSubscription(priceId, successUrl, cancelUrl) {
    try {
      logInfo('Creating Stripe checkout session', { priceId });

      const result = await this.createCheckoutSession({
        priceId,
        // Let Firebase Function handle URL with {CHECKOUT_SESSION_ID} placeholder
        successUrl: successUrl,
        cancelUrl: cancelUrl,
      });

      if (result.data.error) {
        throw new Error(result.data.error);
      }

      // Redirect to Stripe Checkout
      const stripe = await this.getStripe();
      const { error } = await stripe.redirectToCheckout({
        sessionId: result.data.sessionId
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      logError('Stripe checkout error', error);
      throw error;
    }
  }

  // Handle subscription purchase based on plan
  async purchaseSubscription(planType) {
    // Map plan types to Stripe price IDs from your dashboard
    const priceIds = {
      'starter_monthly': 'price_1SBHCtFMeJZgBy3MXyFmZBQL', // $2.99/mo
      'starter_yearly': 'price_1SBHDvFMeJZgBy3MSoaiEnHT',  // $29.99/yr
      'pro_monthly': 'price_1SBHEMFMeJZgBy3MQsoSRXFi',     // $7.99/mo
      'pro_yearly': 'price_1SBHEjFMeJZgBy3MzuoJ7gCW',      // $79.99/yr
      'lifetime': 'price_1SBHFrFMeJZgBy3M3Eeullf1'         // $149 one-time
    };

    const priceId = priceIds[planType];
    if (!priceId) {
      throw new Error('Invalid plan type');
    }

    return this.createSubscription(priceId);
  }

  // Open customer portal for managing subscription
  async openCustomerPortal() {
    try {
      logInfo('Opening Stripe customer portal');

      const result = await this.createPortalSession({
        returnUrl: `${window.location.origin}/settings`
      });

      if (result.data.error) {
        throw new Error(result.data.error);
      }

      // Redirect to Stripe Customer Portal
      window.location.href = result.data.url;

      return { success: true };
    } catch (error) {
      logError('Stripe portal error', error);
      throw error;
    }
  }

  // Verify payment after redirect back from Stripe
  async verifyPayment(sessionId) {
    try {
      logInfo('Verifying Stripe payment', { sessionId });

      const result = await this.verifyStripePayment({ sessionId });

      if (result.data.error) {
        throw new Error(result.data.error);
      }

      return result.data;
    } catch (error) {
      logError('Payment verification error', error);
      throw error;
    }
  }

  // Get subscription status
  async getSubscriptionStatus() {
    try {
      // This would call a Firebase Function to check Stripe subscription status
      // For now, return mock data
      return {
        active: false,
        tier: 'free',
        expiresAt: null
      };
    } catch (error) {
      logError('Get subscription status error', error);
      return {
        active: false,
        tier: 'free',
        expiresAt: null
      };
    }
  }
}

const stripeService = new StripeService();
export default stripeService;