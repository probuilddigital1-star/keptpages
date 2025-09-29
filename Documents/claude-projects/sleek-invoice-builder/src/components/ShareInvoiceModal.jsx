import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import {
  enableInvoiceSharing,
  disableInvoiceSharing,
  regenerateInvoiceToken,
  copyToClipboard,
  shareInvoice,
  formatShareMessage
} from '../utils/invoiceSharing';
import { logError } from '../utils/errorHandler';
import { sendInvoiceEmail } from '../services/emailService';
import { getSettings } from '../store/settings';

export default function ShareInvoiceModal({ open, onClose, invoice }) {
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [error, setError] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      // Check if sharing is already enabled
      if (invoice.publicToken && invoice.sharingEnabled) {
        setSharingEnabled(true);
        const link = `${window.location.origin}/invoice/${invoice.id}/${invoice.publicToken}`;
        setShareLink(link);
      } else {
        setSharingEnabled(false);
        setShareLink('');
      }
    }
  }, [open, invoice]);

  const handleEnableSharing = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await enableInvoiceSharing(invoice.id);

      if (result.success) {
        setShareLink(result.link);
        setSharingEnabled(true);
      } else {
        setError(result.error || 'Failed to enable sharing');
      }
    } catch (err) {
      logError('ShareInvoiceModal.handleEnableSharing', err);
      setError('Failed to enable sharing');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSharing = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await disableInvoiceSharing(invoice.id);

      if (result.success) {
        setShareLink('');
        setSharingEnabled(false);
      } else {
        setError(result.error || 'Failed to disable sharing');
      }
    } catch (err) {
      logError('ShareInvoiceModal.handleDisableSharing', err);
      setError('Failed to disable sharing');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateLink = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await regenerateInvoiceToken(invoice.id);

      if (result.success) {
        setShareLink(result.link);
        setCopied(false);
      } else {
        setError(result.error || 'Failed to regenerate link');
      }
    } catch (err) {
      logError('ShareInvoiceModal.handleRegenerateLink', err);
      setError('Failed to regenerate link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNativeShare = async () => {
    await shareInvoice(invoice, shareLink);
  };

  const handleWhatsAppShare = () => {
    const message = formatShareMessage(invoice, shareLink, 'whatsapp');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSMSShare = () => {
    const message = formatShareMessage(invoice, shareLink, 'sms');
    window.location.href = `sms:${invoice.client_phone || ''}?body=${encodeURIComponent(message)}`;
  };

  const handleEmailShare = async () => {
    try {
      setEmailSending(true);
      setError('');

      // Get business info from settings
      const settings = getSettings();
      const businessName = settings.businessName || 'Business';
      const businessEmail = settings.businessEmail || 'noreply@business.com';
      const businessPhone = settings.businessPhone || '';

      // Format client name and invoice details
      const clientName = invoice.client_name || 'Customer';
      const amount = invoice.total ? `$${invoice.total.toFixed(2)}` : '$0.00';
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Due on receipt';

      // Prepare email body with portal link
      const emailBody = `Hi ${clientName},

Your invoice #${invoice.number} is ready to view and pay online.

Invoice Details:
• Amount Due: ${amount}
• Due Date: ${dueDate}

Click here to view and pay your invoice:
${shareLink}

This link provides secure access to:
• View invoice details
• Download PDF copy
• Access payment options

If you have any questions, please don't hesitate to contact us.

Best regards,
${businessName}
${businessEmail}
${businessPhone ? `Phone: ${businessPhone}` : ''}`;

      // Prepare email data in the format expected by Firebase Function
      const emailData = {
        invoice: invoice,  // Pass the full invoice object
        to: invoice.email || invoice.client_email || '',
        subject: `Invoice #${invoice.number} from ${businessName} - View & Pay Online`,
        body: emailBody,
        templateId: null,  // No template for portal share
        logoUrl: settings.logoDataUrl || settings.logoUrl || '',
        template: settings.template || 'professional'
      };

      // Send email via Firebase Functions
      const result = await sendInvoiceEmail(emailData);

      if (result.success || result) {  // Handle both success formats
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        setError(result.error || 'Failed to send email');
      }
    } catch (err) {
      logError('ShareInvoiceModal.handleEmailShare', err);
      setError('Failed to send email. Please try again.');
    } finally {
      setEmailSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Share Invoice #{invoice?.number}
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!sharingEnabled ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.024A9.663 9.663 0 0112 21c-2.29 0-4.393-.794-6.032-2.118m12.064 0A9.664 9.664 0 0021 12a9.664 9.664 0 00-2.968-6.882m0 13.764C16.393 20.206 14.29 21 12 21a9.663 9.663 0 01-5.716-1.882m11.748 0A9.015 9.015 0 0112 3c-2.175 0-4.172.77-5.716 2.118" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Enable Public Sharing
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Generate a secure link that allows your client to view and pay this invoice online without logging in.
              </p>
              <Button
                variant="primary"
                onClick={handleEnableSharing}
                disabled={loading}
              >
                {loading ? 'Enabling...' : 'Enable Sharing'}
              </Button>
            </div>
          ) : (
            <>
              {/* Share link */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleCopyLink}
                    className="whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <svg className="w-5 h-5 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Share options */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Share via
                </h4>

                {!invoice?.email && !invoice?.client_email && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ No client email address. Add email to enable email sharing.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>

                  <button
                    onClick={handleEmailShare}
                    disabled={emailSending || !invoice?.email && !invoice?.client_email}
                    className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                      emailSending || (!invoice?.email && !invoice?.client_email)
                        ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : emailSent
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {emailSent ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Sent!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {emailSending ? 'Sending...' : 'Email'}
                      </>
                    )}
                  </button>

                    {invoice?.client_phone && (
                    <button
                      onClick={handleSMSShare}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      SMS
                    </button>
                  )}

                  {navigator.share && (
                    <button
                      onClick={handleNativeShare}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.024A9.663 9.663 0 0112 21c-2.29 0-4.393-.794-6.032-2.118m12.064 0A9.664 9.664 0 0021 12a9.664 9.664 0 00-2.968-6.882m0 13.764C16.393 20.206 14.29 21 12 21a9.663 9.663 0 01-5.716-1.882m11.748 0A9.015 9.015 0 0112 3c-2.175 0-4.172.77-5.716 2.118" />
                      </svg>
                      More
                    </button>
                  )}
                </div>
              </div>

              {/* Security options */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Security Options
                </h4>

                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    onClick={handleRegenerateLink}
                    disabled={loading}
                    className="w-full justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate Link
                  </Button>

                  <Button
                    variant="tertiary"
                    onClick={handleDisableSharing}
                    disabled={loading}
                    className="w-full justify-center text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Disable Sharing
                  </Button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  The link provides read-only access to view and pay this invoice. You can regenerate or disable the link at any time.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}