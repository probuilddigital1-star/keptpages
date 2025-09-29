/**
 * Get the logo URL to use based on plan and available logos.
 * Returns null if no logo should be displayed (no emoji fallbacks).
 * 
 * @param {Object} opts - Branding options
 * @param {'free' | 'pro'} opts.plan - Current subscription plan
 * @param {string | null} [opts.orgLogoUrl] - Organization logo URL
 * @param {string | null} [opts.invoiceLogoUrl] - Invoice-specific logo URL
 * @returns {string | null} Logo URL or null if no logo available
 */
export function getBrandLogoUrl(opts) {
  const { plan, invoiceLogoUrl, orgLogoUrl } = opts;
  
  // Invoice logo takes precedence over organization logo
  const url = invoiceLogoUrl || orgLogoUrl || null;
  
  // Return the URL if it exists and is not empty/whitespace
  // No emoji fallbacks, no placeholder icons
  return url && url.trim() ? url.trim() : null;
}

/**
 * Check if a user can upload logos based on their plan
 * 
 * @param {'free' | 'pro'} plan - Current subscription plan
 * @returns {boolean} Whether logo upload is allowed
 */
export function canUploadLogo(plan) {
  // Both free and pro users can upload logos
  // You can change this logic based on business requirements
  return true;
}

/**
 * Get the maximum number of logos a user can have
 * 
 * @param {'free' | 'pro'} plan - Current subscription plan
 * @returns {number} Maximum number of logos allowed
 */
export function getMaxLogos(plan) {
  return plan === 'pro' ? 10 : 1;
}