import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import InvoicePreviewSimple from '../components/InvoicePreviewSimple';
import PaymentInstructionsModal from '../components/PaymentInstructionsModal';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import ErrorBoundary from '../components/ErrorBoundary';
import { logError } from '../utils/errorHandler';
import { USE_FIREBASE } from '../config/features';

/**
 * Public Invoice View - No authentication required
 * Customers can view and pay invoices via shareable link
 * @param {string} invoiceId - Invoice ID from URL or props
 * @param {string} token - Access token from URL or props
 */
export default function PublicInvoice({ invoiceId, token }) {
  // Support both props and URL params (for future router implementation)
  const id = invoiceId || window.location.pathname.split('/')[2];
  const accessToken = token || window.location.pathname.split('/')[3];
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id, accessToken]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate invoice ID and token
      if (!id || !accessToken) {
        throw new Error('Invalid invoice link');
      }

      let invoiceData = null;

      if (USE_FIREBASE) {
        // Fetch invoice from Firestore
        const invoiceRef = doc(db, 'invoices', id);
        const invoiceDoc = await getDoc(invoiceRef);

        if (!invoiceDoc.exists()) {
          throw new Error('Invoice not found');
        }

        invoiceData = {
          id: invoiceDoc.id,
          ...invoiceDoc.data()
        };
      } else {
        // Fetch invoice from localStorage
        const invoices = JSON.parse(localStorage.getItem('sleek_invoices_v1') || '[]');
        const localInvoice = invoices.find(inv => inv.id === id);

        if (!localInvoice) {
          throw new Error('Invoice not found');
        }

        invoiceData = localInvoice;
      }

      // Verify the access token
      if (invoiceData.publicToken !== accessToken) {
        throw new Error('Invalid access token');
      }

      // Check if invoice is viewable
      if (invoiceData.status === 'cancelled' || invoiceData.status === 'deleted') {
        throw new Error('This invoice is no longer available');
      }

      setInvoice(invoiceData);

      // Debug logging for payment methods
      console.log('PublicInvoice - Full invoice data:', JSON.stringify(invoiceData, null, 2));
      console.log('PublicInvoice - Payment methods in invoice:', JSON.stringify(invoiceData.paymentMethods, null, 2));
      console.log('PublicInvoice - Individual payment fields:', {
        business_paypal: invoiceData.business_paypal,
        business_venmo: invoiceData.business_venmo,
        business_zelle: invoiceData.business_zelle,
        business_cashapp: invoiceData.business_cashapp
      });

      // Check if already paid
      if (invoiceData.status === 'paid') {
        setPaymentComplete(true);
      }

      // Track view
      if (!USE_FIREBASE) {
        // Update view count in localStorage
        const invoices = JSON.parse(localStorage.getItem('sleek_invoices_v1') || '[]');
        const invoice = invoices.find(inv => inv.id === id);
        if (invoice) {
          invoice.viewCount = (invoice.viewCount || 0) + 1;
          invoice.lastViewedAt = new Date().toISOString();
          localStorage.setItem('sleek_invoices_v1', JSON.stringify(invoices));
        }
      }
    } catch (err) {
      logError('PublicInvoice.loadInvoice', err);
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleShowPaymentInstructions = () => {
    setShowPaymentInstructions(true);
  };

  const handleDownloadPDF = () => {
    // Trigger PDF download
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <Skeleton height="32px" width="200px" className="mb-4" />
            <Skeleton height="400px" className="mb-4" />
            <Skeleton height="48px" width="150px" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Unable to Load Invoice
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Please check the link and try again, or contact the sender for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Payment complete state
  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            {/* Success message */}
            <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-100">
                    Payment Successful!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Thank you for your payment. A receipt has been sent to your email.
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice preview */}
            <InvoicePreviewSimple invoice={invoice} />

            {/* Action buttons */}
            <div className="mt-6 flex gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={handleDownloadPDF}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Receipt
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main invoice view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Invoice #{invoice?.number}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              From {invoice?.business_name || invoice?.businessName || 'Business'}
            </p>
          </div>

          {/* Status badge */}
          {invoice?.status === 'paid' ? (
            <div className="mb-6 inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Paid
            </div>
          ) : invoice?.status === 'overdue' ? (
            <div className="mb-6 inline-flex items-center px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Overdue
            </div>
          ) : (
            <div className="mb-6 inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Pending Payment
            </div>
          )}

          {/* Invoice content */}
          <ErrorBoundary name="PublicInvoicePreview">
            <InvoicePreviewSimple invoice={invoice} hideButtons={true} />
          </ErrorBoundary>

          {/* Payment section - Always show payment and actions */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            {invoice?.status !== 'paid' ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Payment Options
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Total Amount Due: <span className="font-bold text-xl text-gray-900 dark:text-gray-100">
                    ${invoice?.total?.toFixed(2) || '0.00'}
                  </span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    onClick={handleShowPaymentInstructions}
                    className="flex-1"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    View Payment Options
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleDownloadPDF}
                    className="flex-1 sm:flex-initial"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </Button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  Multiple secure payment options available. Choose your preferred method.
                </p>
              </div>
            ) : (
              /* Show just the download button for paid invoices */
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={handleDownloadPDF}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Receipt
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Questions about this invoice?</p>
          <p>Contact {invoice?.business_email || invoice?.companyEmail || 'the sender'}</p>
        </div>
      </div>

      {/* Payment Instructions Modal */}
      <PaymentInstructionsModal
        open={showPaymentInstructions}
        onClose={() => setShowPaymentInstructions(false)}
        invoice={invoice}
        businessInfo={{
          business_name: invoice?.business_name || invoice?.businessName,
          email: invoice?.business_email || invoice?.companyEmail,
          // Payment methods from invoice data - check all possible locations
          paymentMethods: {
            paypalEmail: invoice?.paymentMethods?.paypalEmail || invoice?.business_paypal || invoice?.paypal || '',
            venmoHandle: invoice?.paymentMethods?.venmoHandle || invoice?.business_venmo || invoice?.venmo || '',
            zelleEmail: invoice?.paymentMethods?.zelleEmail || invoice?.business_zelle || invoice?.zelle || '',
            cashappHandle: invoice?.paymentMethods?.cashappHandle || invoice?.business_cashapp || invoice?.cashapp || '',
            bankName: invoice?.paymentMethods?.bankName || invoice?.bank?.name || '',
            bankAccount: invoice?.paymentMethods?.bankAccount || invoice?.bank?.account || '',
            bankRouting: invoice?.paymentMethods?.bankRouting || invoice?.bank?.routing || ''
          }
        }}
      />
    </div>
  );
}