import { useEffect, useMemo, useRef } from 'react';
import useSettings from '../hooks/useSettings';
import { downloadNodeAsPDF, printNode } from '../utils/pdf';
import { limits } from '../store/subscription';
import { ensureFontLoaded } from '../utils/fontLoader';
import PreviewViewport from './PreviewViewport';

const BASE_SIZES = {
  Letter: { width: 816, minHeight: 1056 }, // 8.5"×11" @96dpi
  A4: { width: 794, minHeight: 1123 },     // 210×297mm @96dpi
  Legal: { width: 816, minHeight: 1344 }   // 8.5"×14" @96dpi
};

export default function InvoicePreview({ invoice }) {
  const ref = useRef(null);
  const plan = limits();
  const { template, font, paper, logoDataUrl } = useSettings();

  // Load selected webfont so it applies in preview immediately
  useEffect(() => { (async () => { await ensureFontLoaded(font); })(); }, [font]);

  const onPrint = () => { if (ref.current) printNode(ref.current, { paper, font }); };
  const onDownload = async () => {
    if (ref.current) await downloadNodeAsPDF(ref.current, `Invoice-${invoice?.number || 'Draft'}.pdf`, { paper, font });
  };

  const fontFamily = useMemo(() =>
    font === 'System'
      ? 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      : `${font}, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
  , [font]);

  const headerClass = useMemo(() =>
    template === 'Minimal' ? 'mb-6 pb-4 border-b'
    : template === 'Statement' ? 'mb-8'
    : 'mb-8'
  , [template]);

  const tableClass = useMemo(() =>
    template === 'Minimal' ? 'rounded-lg border'
    : template === 'Statement' ? 'shadow-sm rounded-xl border'
    : 'rounded-xl border'
  , [template]);

  const baseSize = BASE_SIZES[paper] || BASE_SIZES.Letter;
  const baseWidth = baseSize.width;
  const minHeight = baseSize.minHeight;

  return (
    <div className="space-y-4 sm:space-y-6" key={`${template}-${font}-${paper}`}>
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onPrint} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700">Print</button>
        <button onClick={onDownload} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Download PDF</button>
      </div>

      {/* Responsive, scaled preview that still renders at real size on wide screens */}
      <PreviewViewport baseWidth={baseWidth}>
        <div
          ref={ref}
          className="bg-white text-gray-900 rounded-xl border border-gray-200 p-6 sm:p-8 relative print:p-8"
          style={{ fontFamily, width: baseWidth, minHeight: minHeight }}
        >
          {/* header */}
          <header className={`flex items-start justify-between gap-6 ${headerClass}`}>
            <div className="flex items-center gap-4">
              {logoDataUrl && !plan.watermark ? (
                <img src={logoDataUrl} alt="Logo" className="h-14 w-auto object-contain" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-gray-200 grid place-items-center text-sm text-gray-500">Logo</div>
              )}
              <div>
                <h1 className="text-xl font-semibold">Invoice</h1>
                <p className="text-sm text-gray-500">#{invoice?.number || 'Draft'} • {invoice?.date || ''}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{invoice?.client || ''}</p>
            </div>
          </header>

          {/* items */}
          <section className={`${tableClass} overflow-hidden border-gray-200`}>
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-sm text-gray-600 no-break">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="divide-y divide-gray-200">
              {invoice?.items?.map((it, i) => (
                <div key={i} className="grid grid-cols-12 px-4 py-3 no-break">
                  <div className="col-span-6">{it.description}</div>
                  <div className="col-span-2 text-right">{it.qty}</div>
                  <div className="col-span-2 text-right">${Number(it.rate).toFixed(2)}</div>
                  <div className="col-span-2 text-right font-medium">${Number(it.qty * it.rate).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* totals */}
          <section className="mt-6 flex flex-col items-end gap-2 no-break">
            <div className="w-full sm:w-80 space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>${Number(invoice?.subtotal || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>${Number(invoice?.tax || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>${Number(invoice?.discount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>${Number(invoice?.total || 0).toFixed(2)}</span></div>
            </div>
          </section>

          {/* watermark */}
          {plan.watermark && (
            <div className="mt-10 pt-4 border-t border-gray-200 text-center text-xs text-gray-500 no-break">
              Created with Sleek Invoice. Upgrade to remove this note.
            </div>
          )}
        </div>
      </PreviewViewport>
    </div>
  );
}