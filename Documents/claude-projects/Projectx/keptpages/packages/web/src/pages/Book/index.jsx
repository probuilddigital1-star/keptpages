import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useBookStore } from '@/stores/bookStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { BOOK_PRICING } from '@/config/plans';
import { formatCurrency } from '@/utils/formatters';

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless serif typography with cream pages and ornamental dividers.',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean sans-serif layout with generous white space and minimal borders.',
  },
  {
    id: 'rustic',
    name: 'Rustic',
    description: 'Warm earth tones with hand-drawn frames and textured paper feel.',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Gold accents, refined borders, and a luxurious presentation.',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Maximum focus on content with a quiet, understated design.',
  },
];

const COLOR_SCHEMES = [
  { id: 'default', label: 'Classic Cream', bg: '#FAF4E8', accent: '#C65D3E' },
  { id: 'midnight', label: 'Midnight', bg: '#1a1a2e', accent: '#e2b04a' },
  { id: 'forest', label: 'Forest', bg: '#f0f4f0', accent: '#2d5a3d' },
  { id: 'plum', label: 'Plum', bg: '#f8f0f6', accent: '#7b3f6e' },
  { id: 'ocean', label: 'Ocean', bg: '#eef4f8', accent: '#2a6496' },
];

const STEPS = ['Template', 'Cover', 'Preview', 'Order'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BookPage() {
  const { id: collectionId } = useParams();
  const navigate = useNavigate();

  // Book store
  const template = useBookStore((s) => s.template);
  const coverDesign = useBookStore((s) => s.coverDesign);
  const generatingPdf = useBookStore((s) => s.generatingPdf);
  const bookLoading = useBookStore((s) => s.loading);
  const book = useBookStore((s) => s.book);
  const updateTemplate = useBookStore((s) => s.updateTemplate);
  const updateCover = useBookStore((s) => s.updateCover);
  const generatePdf = useBookStore((s) => s.generatePdf);
  const createBook = useBookStore((s) => s.createBook);
  const orderBook = useBookStore((s) => s.orderBook);

  // Local state
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [shipping, setShipping] = useState({
    name: '',
    email: '',
    street1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  // Dummy page count (would come from the book store in a real app)
  const pageCount = book?.pageCount || 48;

  // Price calculation
  const extraPages = Math.max(0, pageCount - 40);
  const basePrice = BOOK_PRICING.base * 100; // cents
  const extraCost = extraPages * BOOK_PRICING.perExtraPage * 100;
  let unitPrice = basePrice + extraCost;
  if (unitPrice > BOOK_PRICING.max * 100) unitPrice = BOOK_PRICING.max * 100;
  const discount =
    quantity >= BOOK_PRICING.familyPackMinQty
      ? BOOK_PRICING.familyPackDiscount
      : 0;
  const totalCents = Math.round(unitPrice * quantity * (1 - discount));

  const canGoNext = useCallback(() => {
    if (step === 0) return !!template;
    if (step === 1) return !!coverDesign.title.trim();
    if (step === 2) return true;
    if (step === 3) {
      return (
        shipping.name.trim() &&
        shipping.email.trim() &&
        shipping.street1.trim() &&
        shipping.city.trim() &&
        shipping.state.trim() &&
        shipping.postalCode.trim()
      );
    }
    return true;
  }, [step, template, coverDesign.title, shipping]);

  const handleNext = useCallback(async () => {
    if (step === 2) {
      // Generate PDF when moving from Preview to Order
      try {
        if (!book) {
          await createBook(collectionId);
        }
        await generatePdf(book?.id || collectionId);
        toast('PDF generated successfully!');
      } catch {
        toast('Failed to generate PDF. Please try again.', 'error');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, book, collectionId, createBook, generatePdf]);

  const handleOrder = useCallback(async () => {
    try {
      const result = await orderBook(book?.id || collectionId, shipping, quantity);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        toast('Order placed! You will receive a confirmation email.', 'success');
        navigate('/app');
      }
    } catch {
      toast('Failed to place order. Please try again.', 'error');
    }
  }, [book, collectionId, shipping, quantity, orderBook, navigate]);

  // Handle cover photo upload
  const handlePhotoUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        updateCover({ photo: reader.result });
      };
      reader.readAsDataURL(file);
    },
    [updateCover],
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-container-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 font-ui text-sm text-walnut-secondary hover:text-walnut transition-colors mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h1 className="font-display text-2xl sm:text-3xl font-bold text-walnut mb-8">
        Create Your Book
      </h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-pill font-ui text-sm font-medium transition-all',
                i === step
                  ? 'bg-terracotta text-white shadow-sm'
                  : i < step
                    ? 'bg-terracotta-light text-terracotta cursor-pointer hover:bg-terracotta/20'
                    : 'bg-cream-alt text-walnut-muted cursor-not-allowed',
              )}
            >
              <span
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  i === step
                    ? 'bg-white/20 text-white'
                    : i < step
                      ? 'bg-terracotta text-white'
                      : 'bg-walnut-muted/20 text-walnut-muted',
                )}
              >
                {i < step ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  'w-8 h-px',
                  i < step ? 'bg-terracotta' : 'bg-border',
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* =============== Step 1: Template =============== */}
      {step === 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-walnut mb-2">
            Choose a Template
          </h2>
          <p className="font-body text-walnut-secondary mb-6">
            Select a design that matches the personality of your collection.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <Card
                key={t.id}
                hover
                className={clsx(
                  'p-5 cursor-pointer transition-all',
                  template === t.id
                    ? 'border-terracotta border-2 shadow-md'
                    : 'border-border-light',
                )}
                onClick={() => updateTemplate(t.id)}
              >
                {/* Template preview placeholder */}
                <div className="aspect-[3/4] bg-cream-alt rounded mb-4 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-10 h-10 text-walnut-muted/40"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <h3 className="font-ui font-semibold text-walnut text-base mb-1">
                  {t.name}
                </h3>
                <p className="font-body text-sm text-walnut-secondary">
                  {t.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* =============== Step 2: Cover =============== */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <h2 className="font-display text-xl font-semibold text-walnut mb-6">
              Design Your Cover
            </h2>

            <div className="flex flex-col gap-5">
              <Input
                label="Book Title"
                placeholder="Our Family Recipes"
                value={coverDesign.title}
                onChange={(e) => updateCover({ title: e.target.value })}
              />
              <Input
                label="Subtitle (optional)"
                placeholder="Passed down through generations"
                value={coverDesign.subtitle}
                onChange={(e) => updateCover({ subtitle: e.target.value })}
              />

              {/* Cover photo upload */}
              <div className="flex flex-col gap-1.5">
                <label className="font-ui text-sm font-medium text-walnut">
                  Cover Photo
                </label>
                <label className="flex items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-terracotta/40 hover:bg-cream-alt transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoUpload}
                  />
                  {coverDesign.photo ? (
                    <img
                      src={coverDesign.photo}
                      alt="Cover"
                      className="h-full w-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-walnut-muted">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-8 h-8"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span className="font-ui text-xs">Click to upload</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Color scheme picker */}
              <div className="flex flex-col gap-1.5">
                <label className="font-ui text-sm font-medium text-walnut">
                  Color Scheme
                </label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      type="button"
                      onClick={() => updateCover({ colorScheme: scheme.id })}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 p-2 rounded-md transition-all',
                        coverDesign.colorScheme === scheme.id
                          ? 'ring-2 ring-terracotta bg-cream-alt'
                          : 'hover:bg-cream-alt',
                      )}
                      title={scheme.label}
                    >
                      <div className="flex">
                        <div
                          className="w-6 h-6 rounded-l-full border border-border-light"
                          style={{ backgroundColor: scheme.bg }}
                        />
                        <div
                          className="w-6 h-6 rounded-r-full border border-border-light"
                          style={{ backgroundColor: scheme.accent }}
                        />
                      </div>
                      <span className="font-ui text-[10px] text-walnut-secondary">
                        {scheme.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live cover preview */}
          <div>
            <h3 className="font-ui text-sm font-medium text-walnut mb-3">
              Preview
            </h3>
            <div
              className="aspect-[3/4] rounded-lg shadow-lg flex flex-col items-center justify-center p-8 text-center border"
              style={{
                backgroundColor:
                  COLOR_SCHEMES.find((s) => s.id === coverDesign.colorScheme)?.bg || '#FAF4E8',
                borderColor:
                  COLOR_SCHEMES.find((s) => s.id === coverDesign.colorScheme)?.accent || '#C65D3E',
              }}
            >
              {coverDesign.photo && (
                <img
                  src={coverDesign.photo}
                  alt="Cover"
                  className="w-28 h-28 object-cover rounded-full mb-6 border-4"
                  style={{
                    borderColor:
                      COLOR_SCHEMES.find((s) => s.id === coverDesign.colorScheme)?.accent ||
                      '#C65D3E',
                  }}
                />
              )}
              <h2
                className="font-display text-2xl font-bold leading-tight mb-2"
                style={{
                  color:
                    coverDesign.colorScheme === 'midnight' ? '#fff' : '#2C1810',
                }}
              >
                {coverDesign.title || 'Your Book Title'}
              </h2>
              {coverDesign.subtitle && (
                <p
                  className="font-body text-sm"
                  style={{
                    color:
                      COLOR_SCHEMES.find((s) => s.id === coverDesign.colorScheme)?.accent ||
                      '#C65D3E',
                  }}
                >
                  {coverDesign.subtitle}
                </p>
              )}
              <div
                className="mt-6 w-16 h-px"
                style={{
                  backgroundColor:
                    COLOR_SCHEMES.find((s) => s.id === coverDesign.colorScheme)?.accent ||
                    '#C65D3E',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* =============== Step 3: Preview =============== */}
      {step === 2 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-walnut mb-2">
            Review Your Book
          </h2>
          <p className="font-body text-walnut-secondary mb-6">
            Review the contents before generating your print-ready PDF.
          </p>

          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-ui text-sm font-medium text-walnut">
                Estimated Page Count
              </span>
              <span className="font-display text-2xl font-bold text-terracotta">
                {pageCount} pages
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-ui text-walnut-secondary">
              <span>Template:</span>
              <span className="font-medium text-walnut capitalize">
                {template}
              </span>
            </div>
          </Card>

          {/* Page list placeholder */}
          <div className="space-y-2">
            <h3 className="font-ui text-sm font-medium text-walnut mb-3">
              Document Order
            </h3>
            {(book?.chapters || []).length > 0 ? (
              book.chapters.map((chapter, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 bg-cream-surface border border-border-light rounded-md"
                >
                  <span className="font-ui text-xs text-walnut-muted w-6 text-right">
                    {i + 1}.
                  </span>
                  <span className="font-ui text-sm text-walnut">
                    {chapter.title || `Document ${i + 1}`}
                  </span>
                </div>
              ))
            ) : (
              <p className="font-body text-sm text-walnut-secondary italic">
                Documents from your collection will appear here in order.
              </p>
            )}
          </div>

          {generatingPdf && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Spinner size="md" />
              <span className="font-ui text-sm text-walnut-secondary">
                Generating your PDF...
              </span>
            </div>
          )}
        </div>
      )}

      {/* =============== Step 4: Order =============== */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping form */}
          <div>
            <h2 className="font-display text-xl font-semibold text-walnut mb-6">
              Shipping Details
            </h2>

            <div className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="Jane Smith"
                value={shipping.name}
                onChange={(e) =>
                  setShipping((s) => ({ ...s, name: e.target.value }))
                }
              />
              <Input
                label="Email"
                type="email"
                placeholder="jane@example.com"
                value={shipping.email}
                onChange={(e) =>
                  setShipping((s) => ({ ...s, email: e.target.value }))
                }
              />
              <Input
                label="Street Address"
                placeholder="123 Main Street"
                value={shipping.street1}
                onChange={(e) =>
                  setShipping((s) => ({ ...s, street1: e.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  placeholder="Cleveland"
                  value={shipping.city}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, city: e.target.value }))
                  }
                />
                <Input
                  label="State"
                  placeholder="OH"
                  value={shipping.state}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, state: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ZIP / Postal Code"
                  placeholder="44101"
                  value={shipping.postalCode}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, postalCode: e.target.value }))
                  }
                />
                <Input
                  label="Country"
                  value={shipping.country}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, country: e.target.value }))
                  }
                />
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <label className="font-ui text-sm font-medium text-walnut">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-md border border-border flex items-center justify-center font-ui text-lg text-walnut hover:bg-cream-alt transition-colors"
                  >
                    -
                  </button>
                  <span className="font-ui text-lg font-semibold text-walnut w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 rounded-md border border-border flex items-center justify-center font-ui text-lg text-walnut hover:bg-cream-alt transition-colors"
                  >
                    +
                  </button>
                </div>
                {quantity >= BOOK_PRICING.familyPackMinQty && (
                  <p className="font-ui text-xs text-sage mt-1">
                    Family pack discount applied! 15% off for 5+ copies.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <h3 className="font-ui text-sm font-medium text-walnut mb-3">
              Order Summary
            </h3>
            <Card className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between font-ui text-sm">
                  <span className="text-walnut-secondary">Book ({pageCount} pages)</span>
                  <span className="text-walnut">{formatCurrency(unitPrice)}</span>
                </div>
                <div className="flex justify-between font-ui text-sm">
                  <span className="text-walnut-secondary">Quantity</span>
                  <span className="text-walnut">&times; {quantity}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between font-ui text-sm text-sage">
                    <span>Family Pack Discount</span>
                    <span>-{(discount * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div className="h-px bg-border" />
                <div className="flex justify-between font-ui text-base font-semibold">
                  <span className="text-walnut">Total</span>
                  <span className="text-terracotta">{formatCurrency(totalCents)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                loading={bookLoading}
                disabled={!canGoNext()}
                onClick={handleOrder}
              >
                Order Book
              </Button>

              <p className="font-ui text-xs text-walnut-muted text-center mt-3">
                You will be redirected to Stripe for secure payment.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border-light">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Button>

        {step < STEPS.length - 1 && (
          <Button
            onClick={handleNext}
            disabled={!canGoNext()}
            loading={generatingPdf}
          >
            {step === 2 ? 'Generate PDF & Continue' : 'Next'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
