/**
 * KeptPages pricing configuration.
 * Single source of truth for customer tiers, book tiers, add-ons, and pricing.
 */

// ── Customer Tiers ──────────────────────────────────────────────────────────

export const PLANS = {
  NO_ACCOUNT: {
    id: 'no_account',
    name: 'No Account',
    limits: { scans: 5, collections: 1 },
  },
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: { scans: 40, collections: 2 },
    features: [
      '40 scans per month',
      '2 collections',
      'AI text extraction',
      'No credit card required',
    ],
  },
  BOOK_PURCHASER: {
    id: 'book_purchaser',
    name: 'Book Purchaser',
    limits: { scans: Infinity, collections: 3 },
    features: [
      'Unlimited scans',
      '3 collections',
      'PDF export for purchased books',
      'View-only sharing',
    ],
  },
  KEEPER_PASS: {
    id: 'keeper',
    name: 'Keeper Pass',
    price: 59,
    oneTime: true,
    limits: { scans: Infinity, collections: Infinity },
    features: [
      'Unlimited scans',
      'Unlimited collections',
      'Full PDF export',
      'Family sharing',
      '15% off all books forever',
    ],
  },
};

// Backwards-compatible alias (Settings, CheckoutSuccess, etc. reference PLANS.KEEPER)
PLANS.KEEPER = PLANS.KEEPER_PASS;

// ── Tier Limits (capabilities per tier) ─────────────────────────────────────

export const DAILY_SCAN_CAP = 100;

export const TIER_LIMITS = {
  no_account:     { scans: 5, collections: 1, pdfExport: false, sharing: false },
  free:           { scans: 40, collections: 2, pdfExport: false, sharing: 'view_only' },
  book_purchaser: { scans: Infinity, collections: 3, pdfExport: 'per_book', sharing: 'view_only', dailyScanCap: DAILY_SCAN_CAP },
  keeper:         { scans: Infinity, collections: Infinity, pdfExport: true, sharing: true, dailyScanCap: DAILY_SCAN_CAP },
};

// ── Book Tiers ──────────────────────────────────────────────────────────────

export const BOOK_TIERS = {
  classic: {
    price: 3900,
    binding: 'PB',
    interior: 'BW',
    paper: '060UW444',
    cover: 'M',
    label: 'Classic',
    description: 'Softcover, B&W interior',
  },
  premium: {
    price: 6900,
    featured: true,
    binding: 'CW',
    interior: 'FC',
    paper: '060UW444',
    cover: 'M',
    label: 'Premium',
    description: 'Hardcover, Full color',
  },
  heirloom: {
    price: 7900,
    binding: 'CW',
    interior: 'FC',
    paper: '080CW444',
    cover: 'M',
    label: 'Heirloom',
    description: 'Hardcover, Full color, premium paper',
  },
};

// ── Book Add-Ons ────────────────────────────────────────────────────────────

export const BOOK_ADDONS = {
  glossy: {
    price: 0,
    cover: 'G',
    label: 'Glossy cover finish',
    description: 'Shiny, reflective cover',
    tiers: 'all',
  },
  coil: {
    price: 800,
    binding: 'CO',
    label: 'Coil/spiral binding',
    description: 'Lays flat when open — great for kitchen use',
    tiers: 'all',
  },
  color: {
    price: 1000,
    interior: 'FC',
    label: 'Color interior',
    description: 'Full color recipe pages with photos',
    tiers: ['classic'],
  },
};

// ── Binding Page Limits (Lulu print requirements) ─────────────────────────

export const BINDING_PAGE_LIMITS = {
  PB: { min: 32, label: 'Softcover' },
  CW: { min: 24, label: 'Hardcover' },
  CO: { min: 2, label: 'Coil' },
};

// ── Book Pricing Constants ──────────────────────────────────────────────────

export const BOOK_PRICING = {
  freePages: 60,
  perExtraPage: 35, // cents
};

// ── Multi-Copy Discount Tiers ───────────────────────────────────────────────

const MULTI_COPY_DISCOUNTS = [
  { minQty: 5, discount: 0.20 },
  { minQty: 3, discount: 0.15 },
];

/**
 * Get the multi-copy discount rate for a given quantity.
 */
function getMultiCopyDiscount(quantity) {
  for (const tier of MULTI_COPY_DISCOUNTS) {
    if (quantity >= tier.minQty) return tier.discount;
  }
  return 0;
}

/**
 * Calculate the total book price in cents.
 *
 * @param {number} pageCount - Total pages in the book
 * @param {string} tierId - Book tier: 'classic', 'premium', or 'heirloom'
 * @param {string[]} addons - Array of addon IDs: ['glossy', 'coil', 'color']
 * @param {number} [quantity=1] - Number of copies
 * @param {boolean} [keeperDiscount=false] - Whether to apply 15% Keeper Pass discount
 * @returns {number} Total price in cents
 */
export function calculateBookPrice(pageCount, tierId, addons = [], quantity = 1, keeperDiscount = false) {
  const tier = BOOK_TIERS[tierId];
  if (!tier) throw new Error(`Unknown book tier: ${tierId}`);

  // Base tier price
  let unitPrice = tier.price;

  // Add-on prices
  for (const addonId of addons) {
    const addon = BOOK_ADDONS[addonId];
    if (!addon) continue;
    // Validate tier restriction
    if (Array.isArray(addon.tiers) && !addon.tiers.includes(tierId)) continue;
    unitPrice += addon.price;
  }

  // Extra page charge
  const extraPages = Math.max(0, pageCount - BOOK_PRICING.freePages);
  unitPrice += extraPages * BOOK_PRICING.perExtraPage;

  // Subtotal before discounts
  let total = unitPrice * quantity;

  // Multi-copy discount
  const multiDiscount = getMultiCopyDiscount(quantity);
  if (multiDiscount > 0) {
    total = Math.round(total * (1 - multiDiscount));
  }

  // Keeper Pass 15% discount (stacks multiplicatively)
  if (keeperDiscount) {
    total = Math.round(total * 0.85);
  }

  return total;
}

/**
 * Resolve the final print options for a book tier + addons.
 * Addons override the tier's default values.
 *
 * @param {string} tierId - Book tier ID
 * @param {string[]} addons - Array of addon IDs
 * @returns {{ binding: string, interior: string, paper: string, cover: string }}
 */
export function resolvePrintOptions(tierId, addons = []) {
  const tier = BOOK_TIERS[tierId];
  if (!tier) throw new Error(`Unknown book tier: ${tierId}`);

  const opts = {
    binding: tier.binding,
    interior: tier.interior,
    paper: tier.paper,
    cover: tier.cover,
  };

  for (const addonId of addons) {
    const addon = BOOK_ADDONS[addonId];
    if (!addon) continue;
    if (Array.isArray(addon.tiers) && !addon.tiers.includes(tierId)) continue;
    if (addon.binding) opts.binding = addon.binding;
    if (addon.interior) opts.interior = addon.interior;
    if (addon.cover) opts.cover = addon.cover;
  }

  return opts;
}
