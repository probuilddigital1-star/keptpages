import { api } from './api';

export const stripeService = {
  createCheckout: (plan, options = {}) =>
    api.post('/stripe/checkout', { plan, ...options }),
};
