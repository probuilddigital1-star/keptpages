import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ToastContainer } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { AuthGuard, GuestGuard } from '@/routes/guards';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';

// Lazy-loaded pages
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Auth/Login'));
const Signup = lazy(() => import('@/pages/Auth/Signup'));
const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ScanPage = lazy(() => import('@/pages/Scan'));
const ScanDetail = lazy(() => import('@/pages/Scan/ScanDetail'));
const CollectionPage = lazy(() => import('@/pages/Collection'));
const BookPage = lazy(() => import('@/pages/Book'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const SharedCollection = lazy(() => import('@/pages/Shared'));
const CheckoutSuccess = lazy(() => import('@/pages/CheckoutSuccess'));
const CheckoutCancel = lazy(() => import('@/pages/CheckoutCancel'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      {/* Paper grain overlay */}
      <div className="paper-grain">
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {/* Top color bar */}
      <div className="top-bar" />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Marketing pages */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Landing />} />
          </Route>

          {/* Auth pages (guest only) */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* App pages (authenticated) */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/scan" element={<ScanPage />} />
              <Route path="/app/scan/:id" element={<ScanDetail />} />
              <Route path="/app/collection/:id" element={<CollectionPage />} />
              <Route path="/app/book/:id" element={<BookPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Checkout result pages (no auth required — user may land here after Stripe redirect) */}
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />

          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/shared/:token" element={<SharedCollection />} />
          </Route>
        </Routes>
      </Suspense>

      <ToastContainer />
    </>
  );
}
