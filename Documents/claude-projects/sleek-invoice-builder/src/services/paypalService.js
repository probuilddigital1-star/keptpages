/**
 * PayPal Payment Service
 * Handles payment link generation, QR codes, and payment tracking
 * This is a critical revenue-driving feature for getting users paid faster
 */

class PayPalService {
  constructor() {
    // PayPal configuration - in production these would be environment variables
    this.businessEmail = null; // Will be set by user in settings
    this.currency = 'USD';
    this.baseUrl = 'https://www.paypal.com/paypalme';
    this.paymentStatus = new Map(); // Track payment status by invoice ID
  }

  /**
   * Set the business PayPal email or username
   * @param {string} email - PayPal business email or PayPal.me username
   */
  setBusinessEmail(email) {
    this.businessEmail = email;
  }

  /**
   * Generate a PayPal payment link for an invoice
   * @param {object} invoice - Invoice object with total, id, client info
   * @returns {object} Payment link details
   */
  generatePaymentLink(invoice) {
    if (!this.businessEmail) {
      throw new Error('PayPal business email not configured. Please set up your PayPal account in settings.');
    }

    // Create invoice reference for tracking
    const reference = `INV-${invoice.id}`;
    
    // Generate PayPal.me link with amount and reference
    const amount = invoice.total.toFixed(2);
    
    // If businessEmail contains '@', it's an email, otherwise it's a PayPal.me username
    let paymentUrl;
    if (this.businessEmail.includes('@')) {
      // Use PayPal standard payment link
      const params = new URLSearchParams({
        cmd: '_xclick',
        business: this.businessEmail,
        item_name: `Invoice #${invoice.id}`,
        amount: amount,
        currency_code: this.currency,
        invoice: reference,
        return: `${window.location.origin}/payment-success`,
        cancel_return: `${window.location.origin}/invoice/${invoice.id}`,
        notify_url: `${window.location.origin}/api/paypal-webhook`, // For IPN
      });
      paymentUrl = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
    } else {
      // Use PayPal.me link (simpler for users) - note: reference must be in description, not URL
      paymentUrl = `${this.baseUrl}/${this.businessEmail}/${amount}`;
    }

    // Generate mobile-friendly deep link
    const mobileDeepLink = `paypal://paypalme/${this.businessEmail}/${amount}${this.currency}`;

    return {
      paymentUrl,
      mobileDeepLink,
      reference,
      amount: parseFloat(amount),
      currency: this.currency,
      qrData: paymentUrl, // QR code will encode the payment URL
    };
  }

  /**
   * Generate QR code data for mobile payments
   * @param {string} paymentUrl - The payment URL to encode
   * @returns {string} QR code data string
   */
  generateQRCodeData(paymentUrl) {
    // The QR code will contain the payment URL
    // Mobile devices can scan this to open PayPal directly
    return paymentUrl;
  }

  /**
   * Track payment status for an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} status - Payment status (pending, processing, completed, failed)
   */
  updatePaymentStatus(invoiceId, status) {
    this.paymentStatus.set(invoiceId, {
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get payment status for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {object} Payment status details
   */
  getPaymentStatus(invoiceId) {
    return this.paymentStatus.get(invoiceId) || {
      status: 'pending',
      timestamp: null,
    };
  }

  /**
   * Simulate checking payment status (in production would call PayPal API)
   * @param {string} reference - Payment reference
   * @returns {Promise<object>} Payment status
   */
  async checkPaymentStatus(reference) {
    // In production, this would call PayPal's API to check transaction status
    // For now, return mock status
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate different statuses for demo
        const statuses = ['pending', 'processing', 'completed'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        resolve({
          reference,
          status: randomStatus,
          timestamp: new Date().toISOString(),
          amount: null, // Would be populated from API
        });
      }, 1000);
    });
  }

  /**
   * Validate PayPal business account
   * @param {string} email - Email or PayPal.me username to validate
   * @returns {boolean} Whether the account appears valid
   */
  validateBusinessAccount(email) {
    if (!email || email.trim() === '') {
      return false;
    }

    // Check if it's an email format
    if (email.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    // Check if it's a valid PayPal.me username (alphanumeric, dots, hyphens, underscores)
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    return usernameRegex.test(email);
  }

  /**
   * Generate payment reminder message
   * @param {object} invoice - Invoice object
   * @returns {string} Payment reminder message
   */
  generatePaymentReminder(invoice) {
    const paymentLink = this.generatePaymentLink(invoice);
    
    return `
Dear ${invoice.client_name},

This is a friendly reminder that Invoice #${invoice.id} for $${invoice.total.toFixed(2)} is ready for payment.

You can pay securely using PayPal by clicking the link below:
${paymentLink.paymentUrl}

Or scan the QR code on the invoice with your mobile device for instant payment.

Thank you for your business!

Best regards,
${this.businessName || 'Your Business'}
    `.trim();
  }

  /**
   * Get payment method options for display
   * @returns {array} Available payment methods
   */
  getPaymentMethods() {
    return [
      {
        id: 'paypal',
        name: 'PayPal',
        icon: 'paypal',
        description: 'Pay securely with PayPal',
        enabled: !!this.businessEmail,
        requiresSetup: !this.businessEmail,
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        icon: 'bank',
        description: 'Direct bank transfer',
        enabled: false,
        requiresSetup: true,
        comingSoon: true,
      },
      {
        id: 'credit_card',
        name: 'Credit Card',
        icon: 'card',
        description: 'Pay with credit or debit card',
        enabled: false,
        requiresSetup: true,
        comingSoon: true,
      },
    ];
  }

  /**
   * Calculate PayPal fees for a transaction
   * @param {number} amount - Transaction amount
   * @returns {object} Fee breakdown
   */
  calculateFees(amount) {
    // PayPal standard fees: 2.9% + $0.30 for US domestic
    const percentageFee = amount * 0.029;
    const fixedFee = 0.30;
    const totalFee = percentageFee + fixedFee;
    const netAmount = amount - totalFee;

    return {
      grossAmount: amount,
      percentageFee: percentageFee.toFixed(2),
      fixedFee: fixedFee.toFixed(2),
      totalFee: totalFee.toFixed(2),
      netAmount: netAmount.toFixed(2),
    };
  }
}

// Export singleton instance
export default new PayPalService();