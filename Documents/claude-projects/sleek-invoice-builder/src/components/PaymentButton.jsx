import { logError, logInfo } from '../utils/errorHandler';
import React, { useState } from 'react';
import paypalService from '../services/paypalService';
import QRCodeDisplay from './QRCodeDisplay';
import { FiSettings, FiCreditCard, FiHome } from 'react-icons/fi';
import { FaPaypal } from 'react-icons/fa';

/**
 * PaymentButton Component
 * Professional payment button with PayPal integration and QR code option
 * Uses premium indigo color for CTAs to encourage payments
 */
const PaymentButton = ({ 
  invoice, 
  isPremium = false,
  onPaymentInitiated,
  showQRCode = false,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Generate payment link and handle payment initiation
  const handlePayment = async () => {
    if (!isPremium) {
      setError('Payment collection is a Pro feature. Upgrade to accept payments directly.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Generate PayPal payment link
      const link = paypalService.generatePaymentLink(invoice);
      setPaymentLink(link);

      // Track payment initiation
      paypalService.updatePaymentStatus(invoice.id, 'processing');
      
      // Callback to parent component
      if (onPaymentInitiated) {
        onPaymentInitiated(link);
      }

      // Open payment link in new window
      window.open(link.paymentUrl, '_blank', 'width=800,height=600');

      // Start checking payment status
      checkPaymentStatus(link.reference);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check payment status periodically
  const checkPaymentStatus = async (reference) => {
    // Poll for payment status (in production, use webhooks)
    const checkInterval = setInterval(async () => {
      try {
        const status = await paypalService.checkPaymentStatus(reference);
        setPaymentStatus(status.status);
        
        if (status.status === 'completed') {
          clearInterval(checkInterval);
        }
      } catch (err) {
        logError('PaymentButton.checking', err);
      }
    }, 5000); // Check every 5 seconds

    // Stop checking after 10 minutes
    setTimeout(() => clearInterval(checkInterval), 600000);
  };

  // Toggle QR code display
  const toggleQRCode = () => {
    if (!isPremium) {
      setError('QR code payments are a Pro feature. Upgrade to enable mobile payments.');
      return;
    }

    if (!paymentLink) {
      try {
        const link = paypalService.generatePaymentLink(invoice);
        setPaymentLink(link);
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    setShowQR(!showQR);
  };

  // Render payment status badge
  const renderStatusBadge = () => {
    const statusColors = {
      pending: 'bg-gray-100 text-gray-600',
      processing: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };

    const statusIcons = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Paid',
      failed: 'Failed',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColors[paymentStatus]}`}>
        <span>{statusIcons[paymentStatus]}</span>
        <span>{paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}</span>
      </span>
    );
  };

  return (
    <div className={`payment-button-container ${className}`}>
      {/* Main Payment Section */}
      <div className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-amber-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Options</h3>
            <p className="text-sm text-gray-600">
              {isPremium 
                ? 'Accept payments directly through your invoice' 
                : 'Upgrade to Pro to accept payments'}
            </p>
          </div>
          {renderStatusBadge()}
        </div>

        {/* PayPal Button */}
        <button
          onClick={handlePayment}
          disabled={isProcessing || !isPremium}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 ${
            isPremium
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          style={isPremium ? {
            background: '#4F46E5',
          } : {}}
        >
          {isProcessing ? (
            <>
              <FiSettings className="animate-spin w-4 h-4" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Pay ${invoice.total.toFixed(2)} with PayPal</span>
              {!isPremium && <span className="text-xs ml-2">Pro</span>}
            </>
          )}
        </button>

        {/* QR Code Button */}
        <button
          onClick={toggleQRCode}
          disabled={!isPremium}
          className={`w-full mt-3 py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            isPremium
              ? 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>{showQR ? 'Hide' : 'Show'} QR Code for Mobile Payment</span>
          {!isPremium && <span className="text-xs ml-2">Pro</span>}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            {!isPremium && (
              <button
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-1"
                onClick={() => alert('Upgrade flow would open here')}
              >
                Upgrade to Pro →
              </button>
            )}
          </div>
        )}

        {/* QR Code Display */}
        {showQR && paymentLink && isPremium && (
          <div className="mt-6 p-6 bg-white rounded-lg border-2 border-indigo-200 text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Scan to Pay</h4>
            <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
              <QRCodeDisplay 
                value={paymentLink.qrData}
                size={200}
                color="#4F46E5"
              />
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Scan with PayPal app or mobile camera
            </p>
            <div className="mt-3 p-3 bg-gray-50 rounded text-left">
              <p className="text-xs text-gray-600 font-medium mb-1">Payment Details:</p>
              <p className="text-xs text-gray-500">Amount: ${invoice.total.toFixed(2)} {paymentLink.currency}</p>
              <p className="text-xs text-gray-500">Reference: {paymentLink.reference}</p>
            </div>
          </div>
        )}

        {/* Payment Methods List */}
        <div className="mt-6 pt-6 border-t border-amber-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Accepted Payment Methods</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {paypalService.getPaymentMethods().map((method) => (
              <div
                key={method.id}
                className={`p-3 rounded-lg border ${
                  method.enabled
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  {method.icon === 'paypal' && <FaPaypal className="w-5 h-5 text-[#00457c]" />}
                  {method.icon === 'bank' && <FiHome className="w-5 h-5 text-gray-600" />}
                  {method.icon === 'card' && <FiCreditCard className="w-5 h-5 text-gray-600" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{method.name}</p>
                    {method.comingSoon && (
                      <p className="text-xs text-gray-500">Coming soon</p>
                    )}
                  </div>
                  {method.enabled && (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Features Highlight */}
        {!isPremium && (
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Pro Payment Features
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Accept PayPal payments directly</li>
              <li>• QR codes for instant mobile payments</li>
              <li>• Automatic payment tracking</li>
              <li>• Payment reminder emails</li>
              <li>• Multiple payment methods (coming soon)</li>
            </ul>
            <button
              className="mt-3 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all"
              onClick={() => alert('Upgrade flow would open here')}
            >
              Upgrade to Pro - $4.99/month
            </button>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            Secure Payments
          </span>
          <span className="flex items-center gap-1">
            Instant Processing
          </span>
          <span className="flex items-center gap-1">
            Buyer Protection
          </span>
        </div>
      </div>

      {/* Payment Status Tracking (for Premium users) */}
      {isPremium && paymentStatus !== 'pending' && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Status</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {renderStatusBadge()}
              <span className="text-sm text-gray-600">
                {paymentStatus === 'processing' && 'Payment is being processed...'}
                {paymentStatus === 'completed' && 'Payment received successfully!'}
                {paymentStatus === 'failed' && 'Payment failed. Please try again.'}
              </span>
            </div>
            {paymentStatus === 'completed' && (
              <span className="text-green-600 font-semibold">
                ${invoice.total.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentButton;