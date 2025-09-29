import authService from './authService';

/**
 * Feature Limits Service
 * Central management of free vs pro feature limits
 * Based on business plan requirements
 */
class FeatureLimitsService {
  // Feature limit constants
  static LIMITS = {
    FREE: {
      invoicesPerMonth: 3,
      templates: 1,
      clients: 5,
      customFields: 0,
      logoUpload: false,
      analytics: false,
      exportPDF: true,  // with watermark
      exportCSV: false,
      watermark: true,
      paymentTracking: false,
      recurringInvoices: false,
      prioritySupport: false,
      multiCurrency: false,
      taxCalculation: false,
      reminders: false,
      qrCodes: false
    },
    PRO: {
      invoicesPerMonth: -1, // Unlimited
      templates: -1, // All available
      clients: -1, // Unlimited
      customFields: -1, // Unlimited
      logoUpload: true,
      analytics: true,
      exportPDF: true, // without watermark
      exportCSV: true,
      watermark: false,
      paymentTracking: true,
      recurringInvoices: true,
      prioritySupport: true,
      multiCurrency: true,
      taxCalculation: true,
      reminders: true,
      qrCodes: true
    }
  };

  /**
   * Get current user's feature limits
   */
  static getCurrentLimits() {
    const isPremium = authService.isPremium();
    return isPremium ? this.LIMITS.PRO : this.LIMITS.FREE;
  }

  /**
   * Check if a specific feature is available
   */
  static hasFeature(feature) {
    const limits = this.getCurrentLimits();
    return limits[feature] === true || limits[feature] === -1;
  }

  /**
   * Check if user has reached invoice limit
   */
  static canCreateInvoice() {
    if (authService.isPremium()) return true;
    
    const userProfile = authService.userProfile;
    if (!userProfile) return false;
    
    const currentCount = userProfile.usage?.invoicesThisMonth || 0;
    return currentCount < this.LIMITS.FREE.invoicesPerMonth;
  }

  /**
   * Get remaining free invoices
   */
  static getRemainingInvoices() {
    if (authService.isPremium()) return -1; // Unlimited
    
    const userProfile = authService.userProfile;
    if (!userProfile) return 0;
    
    const currentCount = userProfile.usage?.invoicesThisMonth || 0;
    return Math.max(0, this.LIMITS.FREE.invoicesPerMonth - currentCount);
  }

  /**
   * Check if user can use a specific template
   */
  static canUseTemplate(templateIndex) {
    if (authService.isPremium()) return true;
    
    // Free users can only use the first template
    return templateIndex === 0;
  }

  /**
   * Get available templates for current user
   */
  static getAvailableTemplates(allTemplates) {
    if (!allTemplates || !Array.isArray(allTemplates)) return [];
    
    if (authService.isPremium()) {
      return allTemplates;
    }
    
    // Free users only get the first template
    return allTemplates.slice(0, 1);
  }

  /**
   * Check if user can add more clients
   */
  static canAddClient() {
    if (authService.isPremium()) return true;
    
    const userProfile = authService.userProfile;
    if (!userProfile) return false;
    
    const currentCount = userProfile.usage?.clientsCount || 0;
    return currentCount < this.LIMITS.FREE.clients;
  }

  /**
   * Get feature gate message
   */
  static getFeatureGateMessage(feature) {
    const messages = {
      invoicesPerMonth: 'You\'ve reached your free invoice limit. Upgrade to Pro for unlimited invoices!',
      templates: 'Unlock 10+ professional templates with Pro!',
      clients: 'You\'ve reached the client limit. Upgrade to Pro for unlimited clients!',
      logoUpload: 'Add your business logo with Pro!',
      analytics: 'Get detailed business insights with Pro analytics!',
      exportCSV: 'Export your data to Excel/CSV with Pro!',
      watermark: 'Remove watermarks from PDFs with Pro!',
      paymentTracking: 'Track payments and send reminders with Pro!',
      recurringInvoices: 'Automate recurring invoices with Pro!',
      prioritySupport: 'Get priority support with Pro!',
      multiCurrency: 'Support multiple currencies with Pro!',
      taxCalculation: 'Automatic tax calculations available in Pro!',
      reminders: 'Send payment reminders with Pro!',
      qrCodes: 'Add QR codes for instant payments with Pro!'
    };
    
    return messages[feature] || 'Upgrade to Pro to unlock this feature!';
  }

  /**
   * Get pricing display
   */
  static getPricing() {
    return {
      monthly: {
        price: '$4.99',
        period: '/month',
        displayPrice: '$4.99/mo',
        features: [
          'Unlimited invoices',
          'All premium templates',
          'No watermark',
          'Analytics dashboard',
          'Priority support'
        ]
      },
      yearly: {
        price: '$39.99',
        period: '/year',
        displayPrice: '$39.99/yr',
        savings: 'Save 33%',
        monthlyEquivalent: '$3.33/mo',
        features: [
          'Everything in monthly',
          'Save $20 per year',
          'Early access to features'
        ]
      },
      lifetime: {
        price: '$99.99',
        period: 'one-time',
        displayPrice: '$99.99 lifetime',
        badge: 'BEST VALUE',
        features: [
          'Everything in Pro',
          'Lifetime updates',
          'No recurring fees',
          'One-time payment'
        ]
      }
    };
  }

  /**
   * Reset monthly usage (called at month start)
   */
  static async resetMonthlyUsage() {
    const userProfile = authService.userProfile;
    if (!userProfile) return;
    
    // This would be called by a scheduled function
    // For now, it's a placeholder
    // console.log('Monthly usage would be reset here');
  }

  /**
   * Check if feature should show upgrade prompt
   */
  static shouldShowUpgradePrompt(feature) {
    // Always show upgrade prompt for premium features when user is free
    if (authService.isPremium()) return false;
    
    const promptFeatures = [
      'templates', 'analytics', 'exportCSV', 'watermark',
      'paymentTracking', 'recurringInvoices', 'multiCurrency'
    ];
    
    return promptFeatures.includes(feature);
  }

  /**
   * Get feature comparison for upgrade screen
   */
  static getFeatureComparison() {
    return [
      {
        category: 'Invoicing',
        features: [
          { name: 'Monthly invoices', free: '3', pro: 'Unlimited' },
          { name: 'Invoice templates', free: '1 basic', pro: '10+ professional' },
          { name: 'Custom branding', free: 'No', pro: 'Yes' },
          { name: 'Remove watermark', free: 'No', pro: 'Yes' }
        ]
      },
      {
        category: 'Business Tools',
        features: [
          { name: 'Client management', free: '5 clients', pro: 'Unlimited' },
          { name: 'Analytics dashboard', free: 'No', pro: 'Yes' },
          { name: 'Payment tracking', free: 'No', pro: 'Yes' },
          { name: 'Export to CSV/Excel', free: 'No', pro: 'Yes' }
        ]
      },
      {
        category: 'Advanced Features',
        features: [
          { name: 'Multi-currency', free: 'No', pro: 'Yes' },
          { name: 'Tax calculations', free: 'No', pro: 'Yes' },
          { name: 'Payment reminders', free: 'No', pro: 'Yes' },
          { name: 'QR code payments', free: 'No', pro: 'Yes' }
        ]
      }
    ];
  }
}

export default FeatureLimitsService;