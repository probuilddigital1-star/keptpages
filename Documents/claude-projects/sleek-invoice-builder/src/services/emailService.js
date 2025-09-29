import { auth, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { logError } from '../utils/errorHandler';

// For development, use local emulator or production URL
const API_BASE_URL = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  ? 'http://localhost:5001/sleek-invoice-builder/us-central1'
  : 'https://us-central1-sleek-invoice-builder.cloudfunctions.net';

/**
 * Send invoice email via Firebase Functions
 * @param {Object} emailData - Email data including invoice, recipient, subject, body
 * @returns {Promise} Response from the email service
 */
export async function sendInvoiceEmail(emailData) {
  try {
    // Get current user's auth token if available
    const user = auth.currentUser;
    let headers = {
      'Content-Type': 'application/json',
    };

    // Add auth token if user is authenticated
    if (user) {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } else {
      // For testing without auth - use a test token
      headers['Authorization'] = `Bearer test-token-development`;
    }

    // Prepare request
    const response = await fetch(`${API_BASE_URL}/sendInvoice`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    return result;
  } catch (error) {
    logError('EmailService', error, { action: 'sendInvoiceEmail', emailData });
    throw error;
  }
}

/**
 * Alternative: Use Firebase callable function
 * This is cleaner but requires Firebase Functions to be deployed
 */
export async function sendInvoiceEmailCallable(emailData) {
  try {
    const sendInvoice = httpsCallable(functions, 'sendInvoice');
    const result = await sendInvoice(emailData);
    return result.data;
  } catch (error) {
    logError('EmailService', error, { action: 'sendInvoiceEmailCallable', emailData });
    throw error;
  }
}

/**
 * Generate PDF preview (for testing)
 * @param {Object} invoice - Invoice data
 * @returns {Promise<string>} Base64 encoded PDF
 */
export async function generateInvoicePDF(invoice) {
  try {
    const user = auth.currentUser;
    let headers = {
      'Content-Type': 'application/json',
    };

    // Add auth token if user is authenticated
    if (user) {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } else {
      // For testing without auth - use a test token
      headers['Authorization'] = `Bearer test-token-development`;
    }

    const response = await fetch(`${API_BASE_URL}/generateInvoicePDF`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(invoice)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate PDF');
    }

    return result.pdf;
  } catch (error) {
    logError('EmailService', error, { action: 'generateInvoicePDF', invoiceId: invoice?.id });
    throw error;
  }
}

/**
 * Check if email service is configured
 * @returns {Promise<boolean>} True if email service is ready
 */
export async function checkEmailServiceStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      // console.log('Email service not available:', response.status);
      return false;
    }

    const result = await response.json();
    return result.status === 'healthy';
  } catch (error) {
    // console.log('Email service check failed (this is normal if functions are deploying):', error.message);
    return false;
  }
}

/**
 * Get email sending history for current user
 * @returns {Promise<Array>} List of sent emails
 */
export async function getEmailHistory() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // This would typically fetch from Firestore
    // For now, return empty array
    return [];
  } catch (error) {
    logError('EmailService', error, { action: 'getEmailHistory', userId: auth.currentUser?.uid });
    return [];
  }
}

/**
 * Retry failed email
 * @param {string} emailId - ID of the failed email to retry
 * @returns {Promise} Response from retry attempt
 */
export async function retryEmail(emailId) {
  try {
    // Implementation would fetch the original email data and resend
    throw new Error('Retry functionality not yet implemented');
  } catch (error) {
    logError('EmailService', error, { action: 'retryEmail', emailId });
    throw error;
  }
}