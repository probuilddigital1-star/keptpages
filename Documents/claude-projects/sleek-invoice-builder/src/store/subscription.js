import authService from '../services/authService';

const KEY_PLAN = 'sleek_plan_v1';              // 'free', 'starter', or 'pro'
const KEY_PREMIUM_UNTIL = 'sleek_premium_until_v1'; // ISO date for subscription end
const KEY_LIFETIME = 'sleek_premium_lifetime_v1';   // 'true' if lifetime owned
const KEY_INTRO_LTD = 'sleek_intro_lifetime_active_v1'; // controls lifetime pricing
const KEY_INVOICE_COUNT = 'sleek_invoice_count_monthly'; // Track monthly invoice count
const KEY_COUNT_RESET = 'sleek_count_reset_date'; // When to reset the count

// Competitive pricing structure
export const PRICING = {
  // FREE TIER
  free: {
    monthlyUSD: 0,
    name: 'Free',
    features: {
      invoicesPerMonth: 10,
      clients: 3,
      items: 5,
      templates: 1,
      watermark: true,
      logo: false,
      analytics: false,
      export: false,
      support: 'community'
    }
  },

  // STARTER TIER - Best for freelancers
  starter: {
    monthlyUSD: 2.99,
    yearlyUSD: 29.99, // ~$2.50/month
    name: 'Starter',
    badge: 'POPULAR',
    features: {
      invoicesPerMonth: 50,
      clients: 20,
      items: 50,
      templates: 3,
      watermark: false,
      logo: true,
      analytics: false,
      export: true,
      support: 'email'
    }
  },

  // PRO TIER - Best for businesses
  pro: {
    monthlyUSD: 7.99,
    yearlyUSD: 79.99, // ~$6.67/month
    name: 'Pro',
    badge: 'BEST VALUE',
    features: {
      invoicesPerMonth: Infinity,
      clients: Infinity,
      items: Infinity,
      templates: Infinity,
      watermark: false,
      logo: true,
      analytics: true,
      export: true,
      recurringInvoices: true,
      apiAccess: true,
      support: 'priority'
    }
  },

  // LIFETIME DEAL
  lifetime: {
    introUSD: 149, // First 1000 users
    regularUSD: 199, // After intro period
    name: 'Lifetime Pro',
    badge: 'ONE TIME',
    features: 'Same as Pro, forever'
  }
};

// Invoice tracking for free tier limits
export const FREE_INVOICE_LIMIT = 10;

export function getInvoiceCountThisMonth() {
  // ONLY use Firestore for security and cross-device persistence
  // No localStorage fallback to prevent gaming the system
  if (authService.userProfile?.usage?.invoicesThisMonth !== undefined) {
    console.log('[subscription] Getting count from Firestore:', authService.userProfile.usage.invoicesThisMonth);
    return authService.userProfile.usage.invoicesThisMonth;
  }

  // If Firestore data isn't loaded yet, return 0
  // The count will update once the userProfile loads
  console.log('[subscription] Firestore data not loaded yet, returning 0');
  return 0;
}

export function incrementInvoiceCount() {
  checkAndResetMonthlyCount();
  const current = getInvoiceCountThisMonth();
  const newCount = current + 1;
  localStorage.setItem(KEY_INVOICE_COUNT, newCount.toString());
  return newCount;
}

function checkAndResetMonthlyCount() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
  const lastReset = localStorage.getItem(KEY_COUNT_RESET);

  if (lastReset !== currentMonth) {
    localStorage.setItem(KEY_INVOICE_COUNT, '0');
    localStorage.setItem(KEY_COUNT_RESET, currentMonth);
  }
}

export function canCreateInvoice() {
  // Use authService if available for more accurate limits
  if (authService.userProfile) {
    return authService.canCreateInvoice();
  }

  // Fallback to local checks
  const plan = getPlan();
  if (plan === 'pro' || plan === 'starter') return true;

  const count = getInvoiceCountThisMonth();
  return count < FREE_INVOICE_LIMIT;
}

export function getInvoicesRemaining() {
  // ONLY use authService/Firestore for security
  if (authService.userProfile) {
    const remaining = authService.getRemainingFreeInvoices();
    if (remaining !== null && remaining !== undefined) {
      return remaining === -1 ? Infinity : remaining;
    }
  }

  // If Firestore data isn't loaded, use plan-based calculation
  const plan = getPlan();

  if (plan === 'pro') return Infinity;
  if (plan === 'starter') return Math.max(0, 50 - getInvoiceCountThisMonth());

  return Math.max(0, FREE_INVOICE_LIMIT - getInvoiceCountThisMonth());
}

// Get current plan
export function getPlan() {
  // First check authService for Firestore subscription data
  if (authService.userProfile?.subscription) {
    const { tier, status } = authService.userProfile.subscription;
    if (status === 'active' && tier) {
      return tier; // 'free', 'starter', or 'pro'
    }
  }

  // Fallback to localStorage for backward compatibility
  if (isLifetime()) return 'pro';
  if (isPremiumActive()) {
    const plan = localStorage.getItem(KEY_PLAN);
    return plan || 'starter';
  }
  return 'free';
}

// Get subscription tier details
export function getSubscriptionTier() {
  const plan = getPlan();
  if (plan === 'free') return 'free';
  if (plan === 'starter') return 'starter';
  return 'pro';
}

export function getSubscription() {
  const tier = getSubscriptionTier();
  const plan = getPlan();

  return {
    tier,
    plan,
    features: PRICING[tier]?.features || PRICING.free.features,
    pricing: PRICING[tier],
    isActive: tier !== 'free',
    expiresAt: getPremiumEndDate(),
    isLifetime: isLifetime()
  };
}

export function isLifetime() {
  try {
    // First check authService for Firestore subscription data
    if (authService.userProfile?.subscription) {
      const { type } = authService.userProfile.subscription;
      return type === 'lifetime';
    }

    // Fallback to localStorage for backward compatibility
    return localStorage.getItem(KEY_LIFETIME) === 'true';
  } catch {
    return false;
  }
}

export function isPremiumActive() {
  try {
    // First check authService for Firestore subscription data
    if (authService.userProfile?.subscription) {
      const { tier, status } = authService.userProfile.subscription;
      return status === 'active' && (tier === 'starter' || tier === 'pro');
    }

    // Fallback to localStorage for backward compatibility
    if (isLifetime()) return true;
    const until = localStorage.getItem(KEY_PREMIUM_UNTIL);
    if (!until) return false;
    return new Date(until).getTime() > Date.now();
  } catch {
    return false;
  }
}

export function setStarterMonthly() {
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  localStorage.setItem(KEY_PREMIUM_UNTIL, until.toISOString());
  localStorage.setItem(KEY_PLAN, 'starter');
}

export function setStarterYearly() {
  const until = new Date();
  until.setFullYear(until.getFullYear() + 1);
  localStorage.setItem(KEY_PREMIUM_UNTIL, until.toISOString());
  localStorage.setItem(KEY_PLAN, 'starter');
}

export function setProMonthly() {
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  localStorage.setItem(KEY_PREMIUM_UNTIL, until.toISOString());
  localStorage.setItem(KEY_PLAN, 'pro');
}

export function setProYearly() {
  const until = new Date();
  until.setFullYear(until.getFullYear() + 1);
  localStorage.setItem(KEY_PREMIUM_UNTIL, until.toISOString());
  localStorage.setItem(KEY_PLAN, 'pro');
}

export function setLifetimeActive() {
  localStorage.setItem(KEY_LIFETIME, 'true');
  localStorage.setItem(KEY_PLAN, 'pro');
}

export function cancelSubscription() {
  localStorage.removeItem(KEY_PREMIUM_UNTIL);
  localStorage.removeItem(KEY_LIFETIME);
  localStorage.setItem(KEY_PLAN, 'free');
}

export function getLifetimePrice() {
  // First 1,000 users get intro price
  const intro = localStorage.getItem(KEY_INTRO_LTD);
  if (intro === null) localStorage.setItem(KEY_INTRO_LTD, 'true');
  const active = localStorage.getItem(KEY_INTRO_LTD) === 'true';
  return active ? PRICING.lifetime.introUSD : PRICING.lifetime.regularUSD;
}

export function endIntroLifetimePromo() {
  localStorage.setItem(KEY_INTRO_LTD, 'false');
}

// Feature access based on plan
const CAPS = {
  free: {
    logo: false,
    unlimited: false,
    watermark: true,
    templates: 1,
    premiumFonts: false,
    monthlyLimit: 10,
    clients: 3,
    items: 5,
    analytics: false,
    export: false
  },
  starter: {
    logo: true,
    unlimited: false,
    watermark: false,
    templates: 3,
    premiumFonts: true,
    monthlyLimit: 50,
    clients: 20,
    items: 50,
    analytics: false,
    export: true
  },
  pro: {
    logo: true,
    unlimited: true,
    watermark: false,
    templates: Infinity,
    premiumFonts: true,
    monthlyLimit: Infinity,
    clients: Infinity,
    items: Infinity,
    analytics: true,
    export: true,
    apiAccess: true,
    recurringInvoices: true
  }
};

export function canUse(feature) {
  const plan = getPlan();
  return !!CAPS[plan]?.[feature];
}

export function limits() {
  return CAPS[getPlan()];
}

export function getPremiumEndDate() {
  if (isLifetime()) return null;
  const until = localStorage.getItem(KEY_PREMIUM_UNTIL);
  return until ? new Date(until) : null;
}

// For backwards compatibility
export function setMonthlyActive() {
  setStarterMonthly();
}

export function setYearlyActive() {
  setStarterYearly();
}

export function cancelPremium() {
  cancelSubscription();
}