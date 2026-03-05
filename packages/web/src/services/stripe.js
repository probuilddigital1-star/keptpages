import { loadStripe } from '@stripe/stripe-js';
import { config } from '@/config/env';
import { api } from '@/services/api';

let stripePromise = null;

/**
 * Returns a singleton Stripe.js instance.
 * Only initialises when a public key is configured.
 */
export function getStripe() {
  if (!stripePromise && config.stripePublicKey) {
    stripePromise = loadStripe(config.stripePublicKey);
  }
  return stripePromise;
}

export const stripeService = {
  /** Create a Stripe Checkout session and return { url } */
  createCheckout: (plan, options = {}) =>
    api.post('/stripe/checkout', { plan, metadata: options }),

  /** Create a Stripe Customer Portal session and return { url } */
  createPortalSession: () =>
    api.post('/stripe/portal'),

  /** Cancel the current subscription at period end */
  cancelSubscription: () =>
    api.post('/stripe/cancel'),
};
