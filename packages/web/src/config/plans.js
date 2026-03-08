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
      'Basic PDF export',
    ],
  },
  KEEPER_MONTHLY: {
    id: 'keeper_monthly',
    name: 'Keeper Monthly',
    price: 4.99,
    period: 'month',
    stripePriceId: 'price_1T7MfVGzoQtucHQEAPQXYt1h',
    limits: {
      scans: Infinity,
      collections: Infinity,
    },
    features: [
      'Unlimited scans',
      'Unlimited collections',
      'Custom PDF export',
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
    stripePriceId: 'price_1T7Mh5GzoQtucHQEWuxdZKGD',
    limits: {
      scans: Infinity,
      collections: Infinity,
    },
    features: [
      'Unlimited scans',
      'Unlimited collections',
      'Custom PDF export',
      'Family sharing',
      'Priority AI processing',
      'All document types',
    ],
  },
  BOOK_PROJECT: {
    id: 'book_project',
    name: 'Book Project',
    price: 79,
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
  base: 7900, // cents
  max: 14900, // cents
  perExtraPage: 50, // cents per page over 40
  freePages: 40,
  familyPackDiscount: 0.15, // 15% off for 5+ copies
  familyPackMinQty: 5,
};

export const PRINT_OPTIONS = {
  binding: {
    label: 'Binding',
    options: [
      { value: 'PB', label: 'Paperback', description: 'Perfect-bound softcover', modifier: 0 },
      { value: 'CW', label: 'Hardcover', description: 'Case wrap hardcover', modifier: 1500 },
      { value: 'CO', label: 'Coil Bound', description: 'Spiral/coil binding', modifier: 500 },
    ],
  },
  interior: {
    label: 'Interior Color',
    options: [
      { value: 'BW', label: 'Black & White', description: 'Standard B&W printing', modifier: 0 },
      { value: 'FC', label: 'Full Color', description: 'Full color throughout', modifier: 2000 },
    ],
  },
  paper: {
    label: 'Paper Quality',
    options: [
      { value: '060UW444', label: '60# Uncoated', description: 'Standard uncoated white', modifier: 0 },
      { value: '080CW444', label: '80# Coated', description: 'Premium coated white', modifier: 800 },
    ],
  },
  cover: {
    label: 'Cover Finish',
    options: [
      { value: 'M', label: 'Matte', description: 'Matte laminate finish', modifier: 0 },
      { value: 'G', label: 'Glossy', description: 'Glossy laminate finish', modifier: 0 },
    ],
  },
};

export const DEFAULT_PRINT_OPTIONS = {
  binding: 'PB',
  interior: 'BW',
  paper: '060UW444',
  cover: 'M',
};

/**
 * Calculate total print option modifiers in cents.
 */
export function calculateOptionModifiers(printOptions) {
  let total = 0;
  for (const [group, value] of Object.entries(printOptions)) {
    const groupConfig = PRINT_OPTIONS[group];
    if (!groupConfig) continue;
    const opt = groupConfig.options.find((o) => o.value === value);
    if (opt) total += opt.modifier;
  }
  return total;
}

/**
 * Calculate book unit price in cents.
 */
export function calculateBookPrice(pageCount, printOptions = DEFAULT_PRINT_OPTIONS) {
  const extraPages = Math.max(0, pageCount - BOOK_PRICING.freePages);
  const basePrice = BOOK_PRICING.base + extraPages * BOOK_PRICING.perExtraPage;
  const cappedBase = Math.min(basePrice, BOOK_PRICING.max);
  const optionModifiers = calculateOptionModifiers(printOptions);
  return cappedBase + optionModifiers;
}
