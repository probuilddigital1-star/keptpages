import { logError, logInfo } from '../utils/errorHandler';
import { useRef, useState, useMemo, useEffect } from 'react';
import { fmtMoney } from '../utils/money';
import useSettings from '../hooks/useSettings';
import { downloadNodeAsPDF, printNode } from '../utils/pdf';
import { canUse } from '../store/subscription';
import { ensureFontLoaded } from '../utils/fontLoader';
import { generateInvoicePDF } from '../services/emailService';
import { auth } from '../firebase/config';
import PreviewViewport from './PreviewViewport';
import { getBrandLogoUrl } from '../utils/branding.js';
import Button from './ui/Button';

const BASE_SIZES = {
  Letter: { width: 816, minHeight: 1056 }, // 8.5"×11" @96dpi
  A4: { width: 794, minHeight: 1123 },     // 210×297mm @96dpi
  Legal: { width: 816, minHeight: 1344 }   // 8.5"×14" @96dpi
};

export default function InvoicePreviewSimple({ invoice, hideButtons = false }) {
  const ref = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [useCloudPDF, setUseCloudPDF] = useState(true); // Use cloud PDF by default
  const settings = useSettings();
  const { template, font, paper, logoDataUrl } = settings;
  const showWatermark = canUse('watermark'); // true for basic plan (shows watermark)
  const canShowLogo = canUse('logo');

  // Load font when it changes
  useEffect(() => { 
    (async () => { await ensureFontLoaded(font); })(); 
  }, [font]);
  
  // Font family with support for all fonts
  const fontFamily = useMemo(() => {
    if (font === 'System') {
      return 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    }
    return `"${font}", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  }, [font]);
  
  // Template-specific styles for all 6 templates
  const templateStyles = useMemo(() => {
    switch(template) {
      case 'Traditional':
        return {
          headerBg: 'bg-gray-900 text-white',
          headerStyle: 'traditional',
          tableBg: 'bg-gray-100',
          borderColor: 'border-gray-900',
          accentColor: 'text-gray-900'
        };
      case 'Creative':
        return {
          headerBg: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
          headerStyle: 'creative',
          tableBg: 'bg-gradient-to-r from-purple-50 to-pink-50',
          borderColor: 'border-purple-600',
          accentColor: 'text-purple-600'
        };
      case 'Corporate':
        return {
          headerBg: 'bg-gradient-to-r from-blue-900 to-blue-800 text-white',
          headerStyle: 'corporate',
          tableBg: 'bg-blue-50',
          borderColor: 'border-blue-900',
          accentColor: 'text-blue-900'
        };
      case 'Medical':
        return {
          headerBg: 'bg-gradient-to-r from-teal-600 to-teal-700 text-white',
          headerStyle: 'medical',
          tableBg: 'bg-teal-50',
          borderColor: 'border-teal-600',
          accentColor: 'text-teal-600'
        };
      case 'Minimal':
        return {
          headerBg: 'bg-white',
          headerStyle: 'minimal',
          tableBg: 'bg-gray-50',
          borderColor: 'border-gray-300',
          accentColor: 'text-gray-700'
        };
      default: // Modern
        return {
          headerBg: 'bg-gradient-to-r from-slate-950 to-indigo-950 text-white',
          headerStyle: 'modern',
          tableBg: 'bg-gray-50',
          borderColor: 'border-gray-200',
          accentColor: 'text-blue-600'
        };
    }
  }, [template]);

  // Paper size dimensions
  const baseSize = BASE_SIZES[paper] || BASE_SIZES.Letter;
  const baseWidth = baseSize.width;
  const minHeight = baseSize.minHeight;
  
  if (!invoice) return <div>No invoice data</div>;

  const onPrint = () => {
    if (ref.current) printNode(ref.current, { paper, font });
  };

  const onDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      // Try to use Firebase PDF generator first
      if (useCloudPDF) {
        try {
          // Enrich invoice with settings data
          const enrichedInvoice = {
            ...invoice,
            companyName: settings?.business_name || invoice.companyName || 'Your Business',
            businessName: settings?.business_name || invoice.businessName || 'Your Business',
            companyEmail: settings?.email || invoice.companyEmail,
            companyPhone: settings?.phone || invoice.companyPhone,
            companyAddress: settings?.address || invoice.companyAddress,
            logoUrl: settings?.logoDataUrl || settings?.logoUrl || '',
            template: template || 'professional',
            status: invoice.status || 'PENDING',
            brandColor: settings?.brandColor || '#3B82F6'
          };

          const pdfBase64 = await generateInvoicePDF(enrichedInvoice);

          // Convert base64 to blob and download
          const byteCharacters = atob(pdfBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Invoice-${invoice?.number || 'Draft'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          logInfo('PDF downloaded successfully using cloud generator');
        } catch (cloudError) {
          // console.warn('Cloud PDF generation failed, falling back to browser print:', cloudError.message);
          // Fallback to browser print method
          if (ref.current) {
            await downloadNodeAsPDF(ref.current, `Invoice-${invoice?.number || 'Draft'}.pdf`, { paper, font });
          }
        }
      } else {
        // Use browser print method
        if (ref.current) {
          await downloadNodeAsPDF(ref.current, `Invoice-${invoice?.number || 'Draft'}.pdf`, { paper, font });
        }
      }
    } catch (error) {
      logError('InvoicePreviewSimple.pdf', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6" key={`${template}-${font}-${paper}`}>
      {/* Action Buttons */}
      {!hideButtons && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button
            variant="tertiary"
            onClick={onPrint}
          >
            Print
          </Button>
          <Button
            variant="secondary"
            onClick={onDownload}
            loading={downloading}
            disabled={downloading}
          >
            {downloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      )}

      {/* Responsive wrapper for mobile */}
      <PreviewViewport baseWidth={baseWidth}>
        {/* Invoice Document */}
        <div 
          ref={ref}
          className="bg-white text-gray-900 rounded-xl overflow-hidden shadow-lg print:shadow-none print:rounded-none print:border-0"
          style={{ fontFamily, width: baseWidth, minHeight: minHeight }}
        >
          {/* Dynamic Header based on template */}
          <div className={`${templateStyles.headerBg} px-8 py-6`}>
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                {(() => {
                  const logoUrl = getBrandLogoUrl({
                    plan: canShowLogo ? 'pro' : 'free',
                    orgLogoUrl: logoDataUrl
                  });

                  if (logoUrl) {
                    return (
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-14 w-auto object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    );
                  } else {
                    // Show business name as fallback for free users without logo
                    const businessName = settings?.business_name || invoice?.companyName || invoice?.businessName || 'Your Business';
                    return (
                      <div className="flex items-center justify-center h-14 min-w-[100px]">
                        <span className={`text-lg font-bold ${
                          templateStyles.headerStyle === 'minimal' ? 'text-gray-900' : ''
                        }`}>
                          {businessName}
                        </span>
                      </div>
                    );
                  }
                })()}
                <div>
                  <h1 className={`text-2xl font-bold ${templateStyles.headerStyle === 'minimal' ? 'text-gray-900' : ''}`}>
                    INVOICE
                  </h1>
                  <p className={`text-sm ${templateStyles.headerStyle === 'minimal' ? 'text-gray-600' : 'opacity-90'}`}>
                    #{invoice?.number || 'DRAFT'} • {invoice?.date || new Date().toLocaleDateString()}
                  </p>
                  {invoice?.dueDate && (
                    <p className={`text-sm mt-1 ${templateStyles.headerStyle === 'minimal' ? 'text-gray-600' : 'opacity-90'}`}>
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const due = new Date(invoice.dueDate);
                        due.setHours(0, 0, 0, 0);
                        return due < today && invoice?.status !== 'paid' ? (
                          <span className="text-red-600 font-semibold ml-2">OVERDUE</span>
                        ) : null;
                      })()}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium ${templateStyles.headerStyle === 'minimal' ? 'text-gray-900' : ''}`}>
                  {invoice?.client_name || invoice?.client || 'Client Name'}
                </p>
                <p className={`text-sm ${templateStyles.headerStyle === 'minimal' ? 'text-gray-600' : 'opacity-90'}`}>
                  {invoice?.client_email || ''}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Items Table with template styling */}
            <section className={`rounded-lg overflow-hidden border ${templateStyles.borderColor}`}>
              <div className={`grid grid-cols-12 ${templateStyles.tableBg} px-4 py-3 text-sm font-semibold ${templateStyles.accentColor}`}>
                <div className="col-span-2">Item</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              <div className="divide-y divide-gray-200">
                {invoice?.items?.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 px-4 py-3 bg-white" style={{ breakInside: 'avoid' }}>
                    <div className="col-span-2">
                      <div className="font-medium text-gray-900">
                        {item.title || 'Item'}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="text-gray-700 whitespace-pre-line">
                        {item.description || ''}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">{item.qty || item.quantity || 0}</div>
                    <div className="col-span-2 text-right">{fmtMoney(item.rate || 0)}</div>
                    <div className="col-span-2 text-right font-medium">
                      {fmtMoney((item.qty || item.quantity || 0) * (item.rate || 0))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Totals with template accent color */}
            <section className="flex flex-col items-end" style={{ breakInside: 'avoid' }}>
              <div className="w-full sm:w-80 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{fmtMoney(invoice?.subtotal || 0)}</span>
                </div>
                {invoice?.tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{fmtMoney(invoice?.tax || 0)}</span>
                  </div>
                )}
                {invoice?.discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span>-{fmtMoney(invoice?.discount || 0)}</span>
                  </div>
                )}
                <div className={`flex justify-between text-lg font-bold pt-2 border-t-2 ${templateStyles.borderColor} ${templateStyles.accentColor}`}>
                  <span>Total</span>
                  <span>{fmtMoney(invoice?.total || 0)}</span>
                </div>
              </div>
            </section>

            {/* Payment Terms & Notes */}
            <div className="flex flex-col gap-4">
              {invoice?.payment_terms && (
                <section className="pt-4">
                  <h3 className={`text-sm font-semibold mb-2 ${templateStyles.accentColor}`}>Payment Terms</h3>
                  <p className="text-sm text-gray-600">{invoice.payment_terms}</p>
                  {invoice?.dueDate && (
                    <p className="text-sm text-gray-600 mt-1">
                      Payment due by {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </section>
              )}

              {invoice?.notes && invoice.notes.trim() && (
                <section className={invoice?.payment_terms ? "" : "pt-6 border-t border-gray-200"} style={{ pageBreakInside: 'avoid' }}>
                  <h3 className={`text-sm font-semibold mb-2 ${templateStyles.accentColor}`}>Notes</h3>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap" style={{ minHeight: '20px' }}>
                    {invoice.notes}
                  </div>
                </section>
              )}
            </div>

            {/* Watermark */}
            {showWatermark && (
              <div className="mt-10 pt-4 border-t border-gray-200 text-center text-xs text-gray-500" style={{ breakInside: 'avoid' }}>
                Created with Sleek Invoice. Upgrade to remove this note.
              </div>
            )}
          </div>
        </div>
      </PreviewViewport>
    </div>
  );
}