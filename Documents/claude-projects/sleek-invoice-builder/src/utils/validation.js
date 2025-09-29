/**
 * Input Validation Utility
 * Provides validation and sanitization for all form inputs
 */

/**
 * Email validation
 * @param {string} email - Email address to validate
 * @returns {object} - { isValid: boolean, error?: string }
 */
export function validateEmail(email) {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email.trim());

  return {
    isValid,
    error: isValid ? null : 'Please enter a valid email address'
  };
}

/**
 * Phone number validation and formatting
 * @param {string} phone - Phone number to validate
 * @returns {object} - { isValid: boolean, formatted: string, error?: string }
 */
export function validatePhone(phone) {
  if (!phone) {
    return { isValid: true, formatted: '', error: null }; // Phone is optional
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Check for valid length (10-15 digits for international)
  if (digits.length < 10 || digits.length > 15) {
    return {
      isValid: false,
      formatted: phone,
      error: 'Please enter a valid phone number'
    };
  }

  // Format for US numbers (10 digits)
  let formatted = phone;
  if (digits.length === 10) {
    formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    formatted = `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return {
    isValid: true,
    formatted,
    error: null
  };
}

/**
 * Amount/currency validation
 * @param {string|number} amount - Amount to validate
 * @param {object} options - Validation options
 * @returns {object} - { isValid: boolean, value: number, error?: string }
 */
export function validateAmount(amount, options = {}) {
  const {
    min = 0,
    max = 999999999,
    allowNegative = false,
    required = false
  } = options;

  // Handle empty values
  if (amount === '' || amount === null || amount === undefined) {
    if (required) {
      return { isValid: false, value: 0, error: 'Amount is required' };
    }
    return { isValid: true, value: 0, error: null };
  }

  // Convert to number
  const numValue = typeof amount === 'string'
    ? parseFloat(amount.replace(/[,$]/g, ''))
    : parseFloat(amount);

  // Check if valid number
  if (isNaN(numValue)) {
    return { isValid: false, value: 0, error: 'Please enter a valid number' };
  }

  // Check constraints
  if (!allowNegative && numValue < 0) {
    return { isValid: false, value: numValue, error: 'Amount cannot be negative' };
  }

  if (numValue < min) {
    return { isValid: false, value: numValue, error: `Amount must be at least ${min}` };
  }

  if (numValue > max) {
    return { isValid: false, value: numValue, error: `Amount cannot exceed ${max}` };
  }

  return {
    isValid: true,
    value: Math.round(numValue * 100) / 100, // Round to 2 decimal places
    error: null
  };
}

/**
 * Date validation
 * @param {string|Date} date - Date to validate
 * @param {object} options - Validation options
 * @returns {object} - { isValid: boolean, value: string, error?: string }
 */
export function validateDate(date, options = {}) {
  const {
    required = false,
    minDate = null,
    maxDate = null,
    futureOnly = false,
    pastOnly = false
  } = options;

  if (!date) {
    if (required) {
      return { isValid: false, value: '', error: 'Date is required' };
    }
    return { isValid: true, value: '', error: null };
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, value: '', error: 'Please enter a valid date' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (futureOnly && dateObj < today) {
    return { isValid: false, value: date, error: 'Date must be in the future' };
  }

  if (pastOnly && dateObj > today) {
    return { isValid: false, value: date, error: 'Date must be in the past' };
  }

  if (minDate && dateObj < new Date(minDate)) {
    return { isValid: false, value: date, error: `Date must be after ${minDate}` };
  }

  if (maxDate && dateObj > new Date(maxDate)) {
    return { isValid: false, value: date, error: `Date must be before ${maxDate}` };
  }

  return {
    isValid: true,
    value: dateObj.toISOString().split('T')[0], // Format as YYYY-MM-DD
    error: null
  };
}

/**
 * Text input validation and sanitization
 * @param {string} text - Text to validate
 * @param {object} options - Validation options
 * @returns {object} - { isValid: boolean, sanitized: string, error?: string }
 */
export function validateText(text, options = {}) {
  const {
    required = false,
    minLength = 0,
    maxLength = 1000,
    pattern = null,
    patternMessage = 'Invalid format',
    allowHtml = false
  } = options;

  if (!text || text.trim() === '') {
    if (required) {
      return { isValid: false, sanitized: '', error: 'This field is required' };
    }
    return { isValid: true, sanitized: '', error: null };
  }

  // Sanitize text (prevent XSS)
  let sanitized = text.trim();
  if (!allowHtml) {
    // Remove HTML tags and encode special characters
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Check length
  if (sanitized.length < minLength) {
    return {
      isValid: false,
      sanitized,
      error: `Must be at least ${minLength} characters`
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      sanitized,
      error: `Cannot exceed ${maxLength} characters`
    };
  }

  // Check pattern if provided
  if (pattern && !pattern.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: patternMessage
    };
  }

  return {
    isValid: true,
    sanitized,
    error: null
  };
}

/**
 * Invoice number validation
 * @param {string} invoiceNo - Invoice number to validate
 * @returns {object} - { isValid: boolean, sanitized: string, error?: string }
 */
export function validateInvoiceNumber(invoiceNo) {
  if (!invoiceNo) {
    return { isValid: false, sanitized: '', error: 'Invoice number is required' };
  }

  // Allow alphanumeric, dashes, and slashes
  const sanitized = invoiceNo.trim().replace(/[^a-zA-Z0-9\-\/]/g, '');

  if (sanitized.length < 1) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Invoice number is required'
    };
  }

  if (sanitized.length > 50) {
    return {
      isValid: false,
      sanitized,
      error: 'Invoice number is too long'
    };
  }

  return {
    isValid: true,
    sanitized,
    error: null
  };
}

/**
 * Business name validation
 * @param {string} name - Business name to validate
 * @returns {object} - { isValid: boolean, sanitized: string, error?: string }
 */
export function validateBusinessName(name) {
  return validateText(name, {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-.,&']+$/,
    patternMessage: 'Business name contains invalid characters'
  });
}

/**
 * URL validation
 * @param {string} url - URL to validate
 * @returns {object} - { isValid: boolean, formatted: string, error?: string }
 */
export function validateUrl(url) {
  if (!url) {
    return { isValid: true, formatted: '', error: null }; // URL is optional
  }

  let formatted = url.trim();

  // Add https:// if no protocol specified
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = 'https://' + formatted;
  }

  try {
    new URL(formatted);
    return {
      isValid: true,
      formatted,
      error: null
    };
  } catch {
    return {
      isValid: false,
      formatted: url,
      error: 'Please enter a valid website URL'
    };
  }
}

/**
 * Validate entire invoice form
 * @param {object} invoice - Invoice data
 * @returns {object} - { isValid: boolean, errors: object }
 */
export function validateInvoice(invoice) {
  const errors = {};
  let isValid = true;

  // Validate invoice number
  const invoiceNoResult = validateInvoiceNumber(invoice.invoiceNo || invoice.number);
  if (!invoiceNoResult.isValid) {
    errors.invoiceNo = invoiceNoResult.error;
    isValid = false;
  }

  // Validate date
  const dateResult = validateDate(invoice.date, { required: true });
  if (!dateResult.isValid) {
    errors.date = dateResult.error;
    isValid = false;
  }

  // Validate client info
  if (!invoice.billTo?.name && !invoice.client) {
    errors.client = 'Client name is required';
    isValid = false;
  }

  // Validate client email if provided
  if (invoice.billTo?.email || invoice.clientEmail) {
    const emailResult = validateEmail(invoice.billTo?.email || invoice.clientEmail);
    if (!emailResult.isValid) {
      errors.clientEmail = emailResult.error;
      isValid = false;
    }
  }

  // Validate items
  if (!invoice.items || invoice.items.length === 0) {
    errors.items = 'At least one item is required';
    isValid = false;
  } else {
    invoice.items.forEach((item, index) => {
      if (!item.title && !item.description) {
        errors[`item_${index}_title`] = 'Item name is required';
        isValid = false;
      }

      const qtyResult = validateAmount(item.qty || item.quantity, {
        required: true,
        min: 0.01
      });
      if (!qtyResult.isValid) {
        errors[`item_${index}_qty`] = qtyResult.error;
        isValid = false;
      }

      const rateResult = validateAmount(item.rate || item.price, {
        required: true,
        min: 0
      });
      if (!rateResult.isValid) {
        errors[`item_${index}_rate`] = rateResult.error;
        isValid = false;
      }
    });
  }

  // Validate amounts
  const subtotalResult = validateAmount(invoice.subtotal, { min: 0 });
  if (!subtotalResult.isValid) {
    errors.subtotal = subtotalResult.error;
    isValid = false;
  }

  const totalResult = validateAmount(invoice.total, { min: 0 });
  if (!totalResult.isValid) {
    errors.total = totalResult.error;
    isValid = false;
  }

  return {
    isValid,
    errors
  };
}

/**
 * Validate client form
 * @param {object} client - Client data
 * @returns {object} - { isValid: boolean, errors: object }
 */
export function validateClient(client) {
  const errors = {};
  let isValid = true;

  // Validate name
  const nameResult = validateText(client.name, {
    required: true,
    minLength: 2,
    maxLength: 100
  });
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
    isValid = false;
  }

  // Validate email
  if (client.email) {
    const emailResult = validateEmail(client.email);
    if (!emailResult.isValid) {
      errors.email = emailResult.error;
      isValid = false;
    }
  }

  // Validate phone
  if (client.phone) {
    const phoneResult = validatePhone(client.phone);
    if (!phoneResult.isValid) {
      errors.phone = phoneResult.error;
      isValid = false;
    }
  }

  // Validate website
  if (client.website) {
    const urlResult = validateUrl(client.website);
    if (!urlResult.isValid) {
      errors.website = urlResult.error;
      isValid = false;
    }
  }

  // Validate address
  if (client.address) {
    const addressResult = validateText(client.address, {
      maxLength: 500
    });
    if (!addressResult.isValid) {
      errors.address = addressResult.error;
      isValid = false;
    }
  }

  return {
    isValid,
    errors
  };
}

/**
 * Sanitize all text fields in an object
 * @param {object} data - Object containing text fields
 * @returns {object} - Sanitized object
 */
export function sanitizeObject(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = {};

  for (const key in data) {
    const value = data[key];

    if (typeof value === 'string') {
      const result = validateText(value, { required: false });
      sanitized[key] = result.sanitized;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value)
        ? value.map(item => sanitizeObject(item))
        : sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export default {
  validateEmail,
  validatePhone,
  validateAmount,
  validateDate,
  validateText,
  validateInvoiceNumber,
  validateBusinessName,
  validateUrl,
  validateInvoice,
  validateClient,
  sanitizeObject
};