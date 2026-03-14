import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * Shown after a successful Stripe Checkout redirect.
 * Accessible at /checkout/success?session_id=...&type=keeper|book
 */
export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type') || 'keeper';

  // Simple confetti-style dots animation state
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const isBook = type === 'book';
  const isKeeper = type === 'keeper';

  // Determine title, message, and feature list based on checkout type
  let title, message, features;
  if (isKeeper) {
    title = 'Welcome to Keeper Pass!';
    message =
      'Your Keeper Pass is now active. You have unlimited access to all KeptPages features and 15% off every book order.';
    features = [
      'Unlimited scans',
      'Unlimited collections',
      'Full PDF export',
      'Family sharing',
      '15% off all books',
    ];
  } else if (isBook) {
    title = 'Book Order Confirmed!';
    message =
      'Your book order has been placed successfully. We will begin preparing your beautiful keepsake book right away. Your account has been upgraded to Book Purchaser with unlimited scans!';
    features = null;
  } else {
    title = 'Purchase Complete!';
    message = 'Your purchase was successful. Thank you for using KeptPages!';
    features = null;
  }

  return (
    <div className="min-h-screen bg-cream pt-[3px] flex flex-col">
      {/* Header */}
      <header className="sticky top-[3px] z-30 bg-cream-surface/95 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center justify-between px-6 py-3 max-w-container-lg mx-auto">
          <Link to="/" className="font-display text-lg font-extrabold text-walnut">
            Kept<span className="text-terracotta">Pages</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center relative">
          {/* Confetti dots */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute rounded-full animate-bounce"
                  style={{
                    width: `${6 + Math.random() * 8}px`,
                    height: `${6 + Math.random() * 8}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 60}%`,
                    backgroundColor: [
                      '#C65D3E', // terracotta
                      '#7A8B6F', // sage
                      '#D4A853', // gold
                      '#2C1810', // walnut
                      '#E8D5B7', // cream-alt
                    ][i % 5],
                    animationDelay: `${Math.random() * 1.5}s`,
                    animationDuration: `${1 + Math.random() * 1.5}s`,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          )}

          <Card className="p-8 relative z-10">
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-sage"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-walnut mb-3">
              {title}
            </h1>

            <p className="font-body text-walnut-secondary mb-2">
              {message}
            </p>

            {sessionId && (
              <p className="font-ui text-xs text-walnut-muted mb-6">
                Session: {sessionId.slice(0, 20)}...
              </p>
            )}

            {!sessionId && <div className="mb-6" />}

            <div className="flex flex-col gap-3">
              <Link to="/app">
                <Button className="w-full" size="lg">
                  Go to Dashboard
                </Button>
              </Link>
              {isBook && (
                <Link to="/app/settings">
                  <Button variant="ghost" className="w-full">
                    View Order Status
                  </Button>
                </Link>
              )}
            </div>

            {features && (
              <div className="mt-8 pt-6 border-t border-border-light">
                <h3 className="font-ui text-sm font-medium text-walnut mb-3">
                  What you can do now
                </h3>
                <ul className="text-left space-y-2">
                  {features.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 font-ui text-sm text-walnut-secondary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 text-terracotta shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
