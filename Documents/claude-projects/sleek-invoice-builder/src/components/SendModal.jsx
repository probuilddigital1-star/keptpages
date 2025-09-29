import { useMemo, useState, useEffect } from 'react';
import { setInvoiceStatus } from '../store/invoices';
import { listTemplates } from '../store/emailTemplates';
import { getSettings } from '../store/settings';
import { sendInvoiceEmail, checkEmailServiceStatus } from '../services/emailService';
import { auth } from '../firebase/config';
import TemplateManager from './TemplateManager';
import Toast from './Toast';
import { logError } from '../utils/errorHandler';
import { shouldShowKeyboardShortcuts } from '../utils/deviceDetection';

export default function SendModal({ open, onClose, invoice }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');
  const [sending, setSending] = useState(false);
  const [emailServiceAvailable, setEmailServiceAvailable] = useState(false);
  const [useRealEmail, setUseRealEmail] = useState(false);

  const templates = listTemplates();
  const settings = getSettings();
  const currentUser = auth.currentUser;

  // Check if email service is available
  useEffect(() => {
    checkEmailServiceStatus().then(status => {
      setEmailServiceAvailable(status);
      // Auto-enable real email if service is available
      // For testing, we'll enable it even without auth
      if (status) {
        setUseRealEmail(true);
      }
    });
  }, [currentUser]);

  // Handle Escape key (desktop only)
  useEffect(() => {
    if (!open) return;
    // Only add keyboard shortcuts on devices with keyboards
    if (!shouldShowKeyboardShortcuts()) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !sending) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, sending]);
  
  // Token replacement
  function replaceTokens(text) {
    if (!text) return '';
    
    const tokens = {
      '{{CLIENT}}': invoice?.client_name || invoice?.client || 'Client',
      '{{NUMBER}}': invoice?.number || 'DRAFT',
      '{{TOTAL}}': `$${Number(invoice?.total || 0).toFixed(2)}`,
      '{{DATE}}': invoice?.date || new Date().toLocaleDateString(),
      '{{DUE_DATE}}': invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt',
      '{{TERMS}}': invoice?.payment_terms || invoice?.terms || 'Net 30',
      '{{COMPANY}}': settings?.business_name || 'Your Company'
    };
    
    let result = text;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }
    return result;
  }
  
  const defaultSubject = replaceTokens(`Invoice #{{NUMBER}} for {{CLIENT}}`);
  const defaultBody = replaceTokens(`Hi {{CLIENT}},

Please find your invoice #{{NUMBER}} attached for {{TOTAL}}.

Payment is due {{TERMS}}. Please let me know if you have any questions.

Thank you for your business!

Best regards,
{{COMPANY}}`);

  const [to, setTo] = useState(invoice?.client_email || '');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  // No auto-resize needed - using fixed height

  const mailto = useMemo(() => {
    const u = new URL('mailto:' + (to || ''));
    u.searchParams.set('subject', subject || '');
    u.searchParams.set('body', body || '');
    return u.toString();
  }, [to, subject, body]);

  const handleSend = async () => {
    if (useRealEmail && emailServiceAvailable) {
      // Use real email service
      setSending(true);
      try {
        // Get logo and template from settings
        const logoUrl = settings?.logoDataUrl || settings?.logoUrl || '';
        const template = settings?.template || 'professional';

        const emailData = {
          invoice,
          to,
          subject,
          body,
          templateId: selectedTemplate?.id,
          logoUrl,
          template
        };

        const result = await sendInvoiceEmail(emailData);

        // Mark invoice as sent
        if (invoice?.id) {
          setInvoiceStatus(invoice.id, 'sent');
        }

        showToast('Invoice sent successfully!', 'success');
        setTimeout(() => onClose?.(), 1500);
      } catch (error) {
        logError('SendModal', error, { action: 'sendEmail', invoiceId: invoice?.id, to });
        showToast(`Failed to send: ${error.message}`, 'error');
      } finally {
        setSending(false);
      }
    } else {
      // Fallback to mailto method
      // Mark invoice as sent
      if (invoice?.id) {
        setInvoiceStatus(invoice.id, 'sent');
      }
      // Close modal after opening email client
      setTimeout(() => onClose?.(), 100);
    }
  };

  function loadTemplate(template) {
    setSelectedTemplate(template);
    setSubject(replaceTokens(template.subject));
    setBody(replaceTokens(template.body));
    showToast(`Template "${template.name}" loaded`, 'success');
  }

  async function copyToClipboard(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`, 'success');
    } catch (err) {
      showToast(`Failed to copy ${label}`, 'error');
    }
  }

  function showToast(message, type = 'info') {
    setToastMsg(message);
    setToastType(type);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
        <div className="w-full sm:max-w-2xl h-[75vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-2 sm:px-6 py-2 sm:py-4 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Send Invoice</h2>
              <button 
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Template selector - Hidden on mobile */}
            <div className="hidden sm:block px-3 sm:px-6 pt-2 sm:pt-4">
              <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Template:
              </label>
              <select 
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  if (template) loadTemplate(template);
                }}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="">Custom</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowTemplates(true)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                Manage
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="p-2 sm:p-6 space-y-2 sm:space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  To
                </label>
              </div>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@example.com"
                type="email"
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subject
                </label>
                <button
                  onClick={() => copyToClipboard(subject, 'Subject')}
                  className="hidden sm:inline text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Copy
                </button>
              </div>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Invoice subject"
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message
                </label>
                <button
                  onClick={() => copyToClipboard(body, 'Message')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Copy
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  height: '220px',
                  overflow: 'auto',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
                className="w-full px-2 sm:px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm leading-relaxed resize-none"
              />
            </div>

            {/* Email method toggle (if service available) - Hidden on mobile */}
            {emailServiceAvailable && (
              <div className="hidden sm:block rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-1.5 sm:p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1 items-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-green-800 dark:text-green-300">
                      Ready
                    </span>
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Send</span>
                    <input
                      type="checkbox"
                      checked={useRealEmail}
                      onChange={(e) => setUseRealEmail(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Attachment guidance (for mailto method) - Hidden on mobile */}
            {!useRealEmail && (
              <div className="hidden sm:block rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 sm:p-3">
                <div className="flex gap-2 sm:gap-3">
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">How to attach the invoice PDF:</p>
                    <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 text-xs">
                      <li>Click "Download PDF" in the preview to save the invoice</li>
                      <li>Click "Open Email App" below</li>
                      <li>Attach the downloaded PDF to your email</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="flex-shrink-0 sticky bottom-0 border-t border-gray-200 dark:border-gray-700 px-2 sm:px-6 py-2 sm:py-4 bg-white dark:bg-gray-900 shadow-lg">
            <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                {useRealEmail && emailServiceAvailable ? (
                  <button
                    onClick={handleSend}
                    disabled={sending || !to}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="hidden sm:inline">Sending...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span className="hidden sm:inline">Send Invoice</span>
                        <span className="sm:hidden">Send</span>
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href={mailto}
                    onClick={handleSend}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-semibold"
                  >
                    <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Open Email App</span>
                    <span className="sm:hidden">Email</span>
                  </a>
                )}
            </div>
          </div>
        </div>
      </div>
      {/* Template Manager Modal */}
      <TemplateManager 
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={loadTemplate}
      />

      <Toast 
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg('')}
      />
    </>
  );
}