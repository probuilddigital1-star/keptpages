import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/bookStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import {
  BOOK_TIERS,
  BOOK_ADDONS,
  BOOK_PRICING,
  BINDING_PAGE_LIMITS,
  calculateBookPrice,
  resolvePrintOptions,
} from '@/config/plans';
import { formatCurrency } from '@/utils/formatters';
import api from '@/services/api';
import OrderStatusPanel from './OrderStatusPanel';

const POST_ORDER_STATUSES = ['ordered', 'printing', 'shipped', 'delivered', 'cancelled', 'error'];

export default function OrderPanel({ bookId }) {
  const navigate = useNavigate();
  const book = useBookStore((s) => s.book);
  const generatingPdf = useBookStore((s) => s.generatingPdf);
  const generatePdf = useBookStore((s) => s.generatePdf);
  const orderBook = useBookStore((s) => s.orderBook);
  const loading = useBookStore((s) => s.loading);
  const bookDiscount = useSubscriptionStore((s) => s.bookDiscount);
  const tier = useSubscriptionStore((s) => s.tier);

  const [quantity, setQuantity] = useState(1);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [bookTier, setBookTier] = useState('premium');
  const [addons, setAddons] = useState([]);
  const [shipping, setShipping] = useState({
    name: '', email: '', phone: '', street1: '', city: '', state: '', postalCode: '', country: 'US',
  });

  const handleToggleAddon = useCallback((addonId) => {
    setAddons((prev) =>
      prev.includes(addonId) ? prev.filter((a) => a !== addonId) : [...prev, addonId]
    );
  }, []);

  const handleTierChange = useCallback((tierId) => {
    setBookTier(tierId);
    // Remove addons that are not valid for the new tier
    setAddons((prev) =>
      prev.filter((addonId) => {
        const addon = BOOK_ADDONS[addonId];
        if (!addon) return false;
        if (addon.tiers === 'all') return true;
        return Array.isArray(addon.tiers) && addon.tiers.includes(tierId);
      })
    );
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
      const result = await orderBook(bookId, shipping, quantity, bookTier, addons);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        toast('Order placed!', 'success');
        navigate('/app');
      }
    } catch {
      toast('Failed to place order.', 'error');
    }
  }, [bookId, shipping, quantity, bookTier, addons, orderBook, navigate]);

  // Compute which tiers are eligible based on page count + binding
  const blueprintPageCount = useBookStore((s) => s.blueprint?.pages?.length || 0);
  const effectivePageCount = book?.pageCount || blueprintPageCount || 0;

  const tierEligibility = useMemo(() => {
    const result = {};
    for (const [tierId, config] of Object.entries(BOOK_TIERS)) {
      const opts = resolvePrintOptions(tierId, addons);
      const limit = BINDING_PAGE_LIMITS[opts.binding];
      const eligible = !limit || effectivePageCount >= limit.min;
      result[tierId] = {
        eligible,
        binding: opts.binding,
        minPages: limit?.min || 0,
        bindingLabel: limit?.label || '',
      };
    }
    return result;
  }, [effectivePageCount, addons]);

  // Auto-select first eligible tier when current becomes ineligible
  useEffect(() => {
    if (tierEligibility[bookTier] && !tierEligibility[bookTier].eligible) {
      const firstEligible = Object.keys(BOOK_TIERS).find((t) => tierEligibility[t]?.eligible);
      if (firstEligible) handleTierChange(firstEligible);
    }
  }, [tierEligibility, bookTier, handleTierChange]);

  // Show order status view for post-order books (after all hooks)
  const isPostOrder = POST_ORDER_STATUSES.includes(book?.status);
  if (isPostOrder) return <OrderStatusPanel bookId={bookId} />;

  const pageCount = book?.pageCount || 0;
  const keeperDiscount = typeof bookDiscount === 'function' ? bookDiscount() : bookDiscount || 0;
  const hasKeeperDiscount = keeperDiscount > 0;
  const totalCents = calculateBookPrice(pageCount, bookTier, addons, quantity, hasKeeperDiscount);

  // Compute line-item details for order summary
  const tierConfig = BOOK_TIERS[bookTier];
  const tierBasePrice = tierConfig?.price || 0;
  const extraPages = Math.max(0, pageCount - BOOK_PRICING.freePages);
  const extraPagesCost = extraPages * BOOK_PRICING.perExtraPage;

  const activeAddons = addons
    .map((id) => ({ id, ...BOOK_ADDONS[id] }))
    .filter((a) => a.label && (a.tiers === 'all' || (Array.isArray(a.tiers) && a.tiers.includes(bookTier))));

  const addonTotal = activeAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = tierBasePrice + addonTotal + extraPagesCost;

  const multiCopyDiscount = quantity >= 5 ? 0.20 : quantity >= 3 ? 0.15 : 0;

  const canOrder = shipping.name.trim() && shipping.email.trim() && shipping.phone.trim() &&
    shipping.street1.trim() && shipping.city.trim() && shipping.state.trim() &&
    shipping.postalCode.trim() && book?.status === 'ready';

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Generate, Book Tier, Add-Ons & Shipping */}
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

          {/* Choose Your Book */}
          <Card className="p-5">
            <h3 className="font-ui text-sm font-semibold text-walnut mb-4">Choose Your Book</h3>
            <div className="space-y-2.5">
              {Object.entries(BOOK_TIERS).map(([tierId, config]) => {
                const elig = tierEligibility[tierId];
                const disabled = elig && !elig.eligible;
                return (
                  <label
                    key={tierId}
                    className={`relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                      disabled
                        ? 'border-border opacity-50 cursor-not-allowed'
                        : bookTier === tierId
                          ? 'border-terracotta bg-terracotta/5 shadow-sm cursor-pointer'
                          : 'border-border hover:border-walnut-muted cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bookTier"
                      value={tierId}
                      checked={bookTier === tierId}
                      onChange={() => !disabled && handleTierChange(tierId)}
                      disabled={disabled}
                      className="accent-terracotta mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-ui text-sm font-semibold text-walnut">{config.label}</span>
                        {config.featured && !disabled && (
                          <span className="font-ui text-[10px] font-semibold bg-terracotta text-white px-1.5 py-0.5 rounded-full">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="font-ui text-xs text-walnut-muted mt-0.5">{config.description}</p>
                      {disabled && (
                        <div className="mt-1.5">
                          <p className="font-ui text-[10px] text-red-600">
                            Requires {elig.minPages} pages (you have {effectivePageCount})
                          </p>
                          {!addons.includes('coil') && (
                            <p className="font-ui text-[10px] text-sage mt-0.5">
                              Add coil binding (+$8) to unlock — lays flat for kitchen use
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="font-ui text-sm font-semibold text-walnut whitespace-nowrap">
                      {formatCurrency(config.price)}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Add-Ons */}
            <div className="mt-5 pt-4 border-t border-border">
              <h4 className="font-ui text-xs font-semibold text-walnut mb-3">Add-Ons</h4>
              <div className="space-y-2.5">
                {Object.entries(BOOK_ADDONS).map(([addonId, addon]) => {
                  // Only show if available for current tier
                  const available = addon.tiers === 'all' || (Array.isArray(addon.tiers) && addon.tiers.includes(bookTier));
                  if (!available) return null;

                  const isActive = addons.includes(addonId);
                  const showCoilBadge = addonId === 'coil' && effectivePageCount < 24;
                  return (
                    <label
                      key={addonId}
                      className={`flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-colors ${
                        isActive
                          ? 'border-sage bg-sage/5'
                          : 'border-border hover:border-walnut-muted'
                      }`}
                    >
                      {/* Toggle switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        onClick={() => handleToggleAddon(addonId)}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                          isActive ? 'bg-sage' : 'bg-walnut-muted/30'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                            isActive ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-ui text-xs text-walnut">{addon.label}</span>
                          {showCoilBadge && (
                            <span className="font-ui text-[9px] font-semibold bg-terracotta/10 text-terracotta px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              Best for Kitchen Use
                            </span>
                          )}
                        </div>
                        <p className="font-ui text-[10px] text-walnut-muted">{addon.description}</p>
                      </div>
                      <span className="font-ui text-[10px] text-walnut-secondary whitespace-nowrap">
                        {addon.price === 0 ? 'Free' : `+${formatCurrency(addon.price)}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Multi-copy discount note */}
            <p className="font-ui text-[10px] text-walnut-muted mt-3">
              15% off at 3+ copies, 20% off at 5+
            </p>
          </Card>

          {/* Shipping form */}
          <Card className="p-5">
            <h3 className="font-ui text-sm font-semibold text-walnut mb-3">Shipping Details</h3>
            <div className="space-y-3">
              <Input label="Full Name" placeholder="Jane Smith" value={shipping.name}
                onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))} />
              <Input label="Email" type="email" placeholder="jane@example.com" value={shipping.email}
                onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))} />
              <Input label="Phone Number" type="tel" placeholder="(555) 123-4567" value={shipping.phone}
                onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))} />
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
              {multiCopyDiscount > 0 && (
                <span className="font-ui text-[10px] text-sage">
                  {quantity >= 5 ? '20%' : '15%'} multi-copy discount!
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {/* Tier base price */}
              <div className="flex justify-between font-ui text-xs">
                <span className="text-walnut-secondary">{tierConfig?.label} book{pageCount ? ` (${pageCount} pages)` : ''}</span>
                <span className="text-walnut">{formatCurrency(tierBasePrice)}</span>
              </div>

              {/* Add-on prices */}
              {activeAddons.map((addon) => (
                <div key={addon.id} className="flex justify-between font-ui text-xs">
                  <span className="text-walnut-secondary">{addon.label}</span>
                  <span className="text-walnut">
                    {addon.price === 0 ? 'Free' : `+${formatCurrency(addon.price)}`}
                  </span>
                </div>
              ))}

              {/* Extra pages */}
              {extraPages > 0 && (
                <div className="flex justify-between font-ui text-xs">
                  <span className="text-walnut-secondary">Extra pages ({extraPages} x {formatCurrency(BOOK_PRICING.perExtraPage)}/pg)</span>
                  <span className="text-walnut">+{formatCurrency(extraPagesCost)}</span>
                </div>
              )}

              {/* Unit price */}
              <div className="flex justify-between font-ui text-xs">
                <span className="text-walnut-secondary">Unit Price</span>
                <span className="text-walnut">{formatCurrency(unitPrice)}</span>
              </div>

              {/* Quantity */}
              <div className="flex justify-between font-ui text-xs">
                <span className="text-walnut-secondary">Quantity</span>
                <span className="text-walnut">&times; {quantity}</span>
              </div>

              {/* Multi-copy discount */}
              {multiCopyDiscount > 0 && (
                <div className="flex justify-between font-ui text-xs text-sage">
                  <span>Multi-Copy Discount</span>
                  <span>-{(multiCopyDiscount * 100).toFixed(0)}%</span>
                </div>
              )}

              {/* Keeper Pass discount */}
              {hasKeeperDiscount && (
                <div className="flex justify-between font-ui text-xs text-sage">
                  <span>Keeper Pass discount</span>
                  <span>-15%</span>
                </div>
              )}

              <div className="h-px bg-border" />
              <div className="flex justify-between font-ui text-sm font-semibold">
                <span className="text-walnut">Total</span>
                <span className="text-terracotta">{formatCurrency(totalCents)}</span>
              </div>
            </div>

            {/* Keeper Pass callout for non-keeper users */}
            {tier !== 'keeper' && (
              <div className="bg-terracotta-light rounded-md px-3 py-2 border border-terracotta/15 mb-3">
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-terracotta shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <div>
                    <p className="font-ui text-xs font-medium text-walnut">Save 15% with Keeper Pass</p>
                    <p className="font-ui text-[10px] text-walnut-muted">
                      $59 one-time ·{' '}
                      <button
                        onClick={() => navigate('/app/settings#subscription')}
                        className="underline hover:text-terracotta transition-colors"
                      >
                        Learn more
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}

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
