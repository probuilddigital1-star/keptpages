import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/bookStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import {
  BOOK_PRICING,
  PRINT_OPTIONS,
  DEFAULT_PRINT_OPTIONS,
  calculateBookPrice,
} from '@/config/plans';
import { formatCurrency } from '@/utils/formatters';
import api from '@/services/api';
import OrderStatusPanel from './OrderStatusPanel';

function PrintOptionGroup({ groupKey, config, selected, onChange }) {
  return (
    <div>
      <label className="font-ui text-xs font-semibold text-walnut mb-1.5 block">{config.label}</label>
      <div className="space-y-1.5">
        {config.options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
              selected === opt.value
                ? 'border-terracotta bg-terracotta/5'
                : 'border-border hover:border-walnut-muted'
            }`}
          >
            <input
              type="radio"
              name={groupKey}
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => onChange(groupKey, opt.value)}
              className="accent-terracotta"
            />
            <div className="flex-1 min-w-0">
              <span className="font-ui text-xs text-walnut">{opt.label}</span>
              <span className="font-ui text-[10px] text-walnut-muted ml-1.5">{opt.description}</span>
            </div>
            {opt.modifier > 0 && (
              <span className="font-ui text-[10px] text-terracotta whitespace-nowrap">
                +{formatCurrency(opt.modifier)}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

const POST_ORDER_STATUSES = ['ordered', 'printing', 'shipped', 'delivered', 'cancelled', 'error'];

export default function OrderPanel({ bookId }) {
  const navigate = useNavigate();
  const book = useBookStore((s) => s.book);
  const generatingPdf = useBookStore((s) => s.generatingPdf);
  const generatePdf = useBookStore((s) => s.generatePdf);
  const orderBook = useBookStore((s) => s.orderBook);
  const loading = useBookStore((s) => s.loading);

  const [quantity, setQuantity] = useState(1);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printOptions, setPrintOptions] = useState({ ...DEFAULT_PRINT_OPTIONS });
  const [shipping, setShipping] = useState({
    name: '', email: '', street1: '', city: '', state: '', postalCode: '', country: 'US',
  });

  const handleOptionChange = useCallback((group, value) => {
    setPrintOptions((prev) => ({ ...prev, [group]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!bookId) return;
    try {
      await generatePdf(bookId);
      toast('PDF generated successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast(err?.message || 'Failed to generate PDF.', 'error');
    }
  }, [bookId, generatePdf]);

  const handleDownload = useCallback(async () => {
    if (!bookId) return;
    try {
      setDownloadingPdf(true);
      const blob = await api.getBlob(`/books/${bookId}/preview`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast('Failed to download PDF.', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  }, [bookId]);

  const handleOrder = useCallback(async () => {
    if (!bookId) return;
    try {
      const result = await orderBook(bookId, shipping, quantity, printOptions);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        toast('Order placed!', 'success');
        navigate('/app');
      }
    } catch {
      toast('Failed to place order.', 'error');
    }
  }, [bookId, shipping, quantity, printOptions, orderBook, navigate]);

  // Show order status view for post-order books (after all hooks)
  const isPostOrder = POST_ORDER_STATUSES.includes(book?.status);
  if (isPostOrder) return <OrderStatusPanel bookId={bookId} />;

  const pageCount = book?.pageCount || 0;
  const unitPrice = calculateBookPrice(pageCount, printOptions);
  const discount = quantity >= BOOK_PRICING.familyPackMinQty ? BOOK_PRICING.familyPackDiscount : 0;
  const totalCents = Math.round(unitPrice * quantity * (1 - discount));

  const canOrder = shipping.name.trim() && shipping.email.trim() && shipping.street1.trim() &&
    shipping.city.trim() && shipping.state.trim() && shipping.postalCode.trim() && book?.status === 'ready';

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Generate, Print Options & Shipping */}
        <div className="space-y-6">
          {/* Generate PDF */}
          <Card className="p-5">
            <h3 className="font-ui text-sm font-semibold text-walnut mb-3">Generate PDF</h3>
            <div className="flex items-center gap-3">
              <Button onClick={handleGenerate} loading={generatingPdf} disabled={!bookId}>
                {book?.status === 'ready' ? 'Regenerate PDF' : 'Generate PDF'}
              </Button>
              {book?.status === 'ready' && (
                <Button variant="ghost" onClick={handleDownload} loading={downloadingPdf}>
                  Download Preview
                </Button>
              )}
            </div>
            {book?.status === 'ready' && pageCount > 0 && (
              <p className="font-ui text-xs text-walnut-muted mt-2">{pageCount} pages generated</p>
            )}
            {generatingPdf && (
              <div className="flex items-center gap-2 mt-3">
                <Spinner size="sm" />
                <span className="font-ui text-xs text-walnut-secondary">Generating PDF...</span>
              </div>
            )}
          </Card>

          {/* Print Options */}
          <Card className="p-5">
            <h3 className="font-ui text-sm font-semibold text-walnut mb-4">Print Options</h3>
            <div className="space-y-4">
              {Object.entries(PRINT_OPTIONS).map(([key, config]) => (
                <PrintOptionGroup
                  key={key}
                  groupKey={key}
                  config={config}
                  selected={printOptions[key]}
                  onChange={handleOptionChange}
                />
              ))}
            </div>
          </Card>

          {/* Shipping form */}
          <Card className="p-5">
            <h3 className="font-ui text-sm font-semibold text-walnut mb-3">Shipping Details</h3>
            <div className="space-y-3">
              <Input label="Full Name" placeholder="Jane Smith" value={shipping.name}
                onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))} />
              <Input label="Email" type="email" placeholder="jane@example.com" value={shipping.email}
                onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))} />
              <Input label="Street Address" placeholder="123 Main St" value={shipping.street1}
                onChange={(e) => setShipping((s) => ({ ...s, street1: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" placeholder="Cleveland" value={shipping.city}
                  onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} />
                <Input label="State" placeholder="OH" value={shipping.state}
                  onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="ZIP Code" placeholder="44101" value={shipping.postalCode}
                  onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))} />
                <Input label="Country" value={shipping.country}
                  onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div>
          <Card className="p-5 lg:sticky lg:top-6">
            <h3 className="font-ui text-sm font-semibold text-walnut mb-4">Order Summary</h3>

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-4">
              <label className="font-ui text-xs text-walnut">Quantity</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded border border-border flex items-center justify-center font-ui text-walnut hover:bg-cream-alt">-</button>
                <span className="font-ui text-sm font-semibold text-walnut w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded border border-border flex items-center justify-center font-ui text-walnut hover:bg-cream-alt">+</button>
              </div>
              {quantity >= BOOK_PRICING.familyPackMinQty && (
                <span className="font-ui text-[10px] text-sage">15% family discount!</span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between font-ui text-xs">
                <span className="text-walnut-secondary">Book{pageCount ? ` (${pageCount} pages)` : ''}</span>
                <span className="text-walnut">{formatCurrency(BOOK_PRICING.base)}</span>
              </div>
              {pageCount > BOOK_PRICING.freePages && (
                <div className="flex justify-between font-ui text-xs">
                  <span className="text-walnut-secondary">Extra pages ({pageCount - BOOK_PRICING.freePages})</span>
                  <span className="text-walnut">+{formatCurrency((pageCount - BOOK_PRICING.freePages) * BOOK_PRICING.perExtraPage)}</span>
                </div>
              )}
              {Object.entries(printOptions).map(([group, value]) => {
                const config = PRINT_OPTIONS[group];
                const opt = config?.options.find((o) => o.value === value);
                if (!opt || opt.modifier === 0) return null;
                return (
                  <div key={group} className="flex justify-between font-ui text-xs">
                    <span className="text-walnut-secondary">{opt.label}</span>
                    <span className="text-walnut">+{formatCurrency(opt.modifier)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-ui text-xs">
                <span className="text-walnut-secondary">Unit Price</span>
                <span className="text-walnut">{formatCurrency(unitPrice)}</span>
              </div>
              <div className="flex justify-between font-ui text-xs">
                <span className="text-walnut-secondary">Quantity</span>
                <span className="text-walnut">&times; {quantity}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between font-ui text-xs text-sage">
                  <span>Family Pack Discount</span>
                  <span>-{(discount * 100).toFixed(0)}%</span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex justify-between font-ui text-sm font-semibold">
                <span className="text-walnut">Total</span>
                <span className="text-terracotta">{formatCurrency(totalCents)}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" loading={loading} disabled={!canOrder} onClick={handleOrder}>
              Order Book
            </Button>
            <p className="font-ui text-[10px] text-walnut-muted text-center mt-2">
              Redirects to Stripe for secure payment.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
