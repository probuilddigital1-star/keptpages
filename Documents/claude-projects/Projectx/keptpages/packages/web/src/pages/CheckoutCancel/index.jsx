import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * Shown when a user cancels / abandons the Stripe Checkout flow.
 * Accessible at /checkout/cancel
 */
export default function CheckoutCancel() {
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
        <div className="max-w-md w-full text-center">
          <Card className="p-8">
            {/* Warning icon */}
            <div className="w-16 h-16 rounded-full bg-cream-alt flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-walnut-secondary"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-walnut mb-3">
              Payment Cancelled
            </h1>

            <p className="font-body text-walnut-secondary mb-2">
              No worries — your payment was not processed and you have not been
              charged. You can try again whenever you are ready.
            </p>

            <p className="font-ui text-xs text-walnut-muted mb-8">
              If you ran into an issue, feel free to reach out to our support team.
            </p>

            <div className="flex flex-col gap-3">
              <Link to="/app/settings">
                <Button className="w-full" size="lg">
                  Try Again
                </Button>
              </Link>
              <Link to="/app">
                <Button variant="ghost" className="w-full">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
