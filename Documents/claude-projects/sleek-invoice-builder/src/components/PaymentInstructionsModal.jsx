import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { copyToClipboard } from '../utils/invoiceSharing';
import { getSettings } from '../store/settings';

export default function PaymentInstructionsModal({ open, onClose, invoice, businessInfo }) {
  const [copiedField, setCopiedField] = useState('');
  const [paymentMethods, setPaymentMethods] = useState({});

  useEffect(() => {
    console.log('PaymentInstructionsModal - businessInfo:', JSON.stringify(businessInfo, null, 2));
    console.log('PaymentInstructionsModal - invoice paymentMethods:', JSON.stringify(invoice?.paymentMethods, null, 2));

    // First check if payment methods are passed through businessInfo (for public portal)
    if (businessInfo?.paymentMethods) {
      // Map the payment methods from businessInfo structure
      const methods = businessInfo.paymentMethods;
      console.log('PaymentInstructionsModal - methods from businessInfo:', JSON.stringify(methods, null, 2));

      setPaymentMethods({
        paypal: methods.paypalEmail || '',
        venmo: methods.venmoHandle || '',
        zelle: methods.zelleEmail || '',
        cashapp: methods.cashappHandle || '',
        bank: {
          name: methods.bankName || '',
          account: methods.bankAccount || '',
          routing: methods.bankRouting || ''
        }
      });
    } else {
      // Only try to load from settings if not in public portal context
      // This is for when the modal is used within the app by the business owner
      const settings = getSettings();
      console.log('PaymentInstructionsModal - settings:', JSON.stringify(settings, null, 2));

      if (settings.paymentMethods) {
        setPaymentMethods({
          paypal: settings.paymentMethods.paypalEmail || '',
          venmo: settings.paymentMethods.venmoHandle || '',
          zelle: settings.paymentMethods.zelleEmail || '',
          cashapp: settings.paymentMethods.cashappHandle || '',
          bank: {
            name: settings.paymentMethods.bankName || '',
            account: settings.paymentMethods.bankAccount || '',
            routing: settings.paymentMethods.bankRouting || ''
          }
        });
      }
    }
  }, [businessInfo]);

  if (!open) return null;

  const handleCopy = async (text, field) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  const amount = `$${invoice?.total?.toFixed(2) || '0.00'}`;
  const invoiceRef = `Invoice #${invoice?.number}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Payment Instructions
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Amount Due */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount Due</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{amount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Reference: {invoiceRef}</p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Payment Method
            </h3>

            {/* Check if any payment methods are configured */}
            {!paymentMethods.paypal && !paymentMethods.venmo && !paymentMethods.zelle &&
             !paymentMethods.cashapp && !paymentMethods.bank?.account && (
              <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">No Payment Methods Available</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please contact {businessInfo?.business_name || 'the business'} directly for payment instructions.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Email: {businessInfo?.email || invoice?.business_email || invoice?.companyEmail || 'Not provided'}
                </p>
              </div>
            )}

            {/* PayPal */}
            {paymentMethods.paypal && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">PP</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">PayPal</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{paymentMethods.paypal}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(paymentMethods.paypal, 'paypal')}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {copiedField === 'paypal' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {paymentMethods.paypal.includes('@') ? (
                  <button
                    onClick={() => window.location.href = `https://paypal.me/${paymentMethods.paypal.split('@')[0]}/${invoice?.total}`}
                    className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Send via PayPal
                  </button>
                ) : (
                  <a
                    href={`https://paypal.me/${paymentMethods.paypal}/${invoice?.total}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center"
                  >
                    Send via PayPal
                  </a>
                )}
              </div>
            )}

            {/* Venmo */}
            {paymentMethods.venmo && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">V</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Venmo</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{paymentMethods.venmo.replace('@', '')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`@${paymentMethods.venmo.replace('@', '')}`, 'venmo')}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {copiedField === 'venmo' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Zelle */}
            {paymentMethods.zelle && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">Z</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Zelle</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{paymentMethods.zelle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(paymentMethods.zelle, 'zelle')}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {copiedField === 'zelle' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Cash App */}
            {paymentMethods.cashapp && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400 font-bold text-sm">$</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Cash App</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">${paymentMethods.cashapp.replace('$', '')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`$${paymentMethods.cashapp.replace('$', '')}`, 'cashapp')}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {copiedField === 'cashapp' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Bank Transfer */}
            {paymentMethods.bank?.account && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Bank Transfer</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{paymentMethods.bank.name}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Account:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{paymentMethods.bank.account}</span>
                      <button
                        onClick={() => handleCopy(paymentMethods.bank.account, 'bankAccount')}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        {copiedField === 'bankAccount' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  {paymentMethods.bank.routing && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Routing:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{paymentMethods.bank.routing}</span>
                        <button
                          onClick={() => handleCopy(paymentMethods.bank.routing, 'bankRouting')}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          {copiedField === 'bankRouting' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No payment methods configured */}
            {!paymentMethods.paypal && !paymentMethods.venmo && !paymentMethods.zelle && !paymentMethods.cashapp && !paymentMethods.bank?.account && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">
                  No payment methods available.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Please contact {businessInfo?.business_name || invoice?.business_name || 'the business'} directly for payment instructions.
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Important:</strong> Please include "{invoiceRef}" in your payment reference or memo.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}