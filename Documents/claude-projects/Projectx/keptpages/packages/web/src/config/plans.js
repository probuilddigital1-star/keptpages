export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free Forever',
    price: 0,
    limits: {
      scans: 25,
      collections: 5,
    },
    features: [
      '25 document scans',
      '5 collections',
      'AI text extraction',
      'PDF export',
    ],
  },
  KEEPER_MONTHLY: {
    id: 'keeper_monthly',
    name: 'Keeper Monthly',
    price: 4.99,
    period: 'month',
    stripePriceId: 'price_keeper_monthly_placeholder',
    limits: {
      scans: Infinity,
      collections: Infinity,
    },
    features: [
      'Unlimited scans',
      'Unlimited collections',
      'Family sharing',
      'Priority AI processing',
      'All document types',
    ],
  },
  KEEPER: {
    id: 'keeper',
    name: 'Keeper',
    price: 39.99,
    period: 'year',
    stripePriceId: 'price_keeper_yearly_placeholder',
    limits: {
      scans: Infinity,
      collections: Infinity,
    },
    features: [
      'Unlimited scans',
      'Unlimited collections',
      'Family sharing',
      'Priority AI processing',
      'All document types',
    ],
  },
  BOOK_PROJECT: {
    id: 'book_project',
    name: 'Book Project',
    price: 14.99,
    oneTime: true,
    stripePriceId: 'price_book_project_placeholder',
    features: [
      'Professional book designer',
      '5 book templates',
      'Custom cover design',
      'Print-ready PDF',
    ],
  },
};

export const BOOK_PRICING = {
  base: 79,
  max: 149,
  perExtraPage: 0.5,
  familyPackDiscount: 0.15, // 15% off for 5+ copies
  familyPackMinQty: 5,
};
