import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ToastContainer } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePageTracking } from '@/hooks/usePageTracking';
import { AuthGuard, GuestGuard, AdminGuard } from '@/routes/guards';
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
const Orders = lazy(() => import('@/pages/Orders'));
const AdminOrders = lazy(() => import('@/pages/Admin/Orders'));
const AuthCallback = lazy(() => import('@/pages/Auth/Callback'));
const ArticleListing = lazy(() => import('@/pages/Articles'));
const ArticleDetail = lazy(() => import('@/pages/Articles/ArticleDetail'));
const Terms = lazy(() => import('@/pages/Legal/Terms'));
const Privacy = lazy(() => import('@/pages/Legal/Privacy'));
const FairUse = lazy(() => import('@/pages/Legal/FairUse'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  usePageTracking();

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

      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Marketing pages */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/between-the-pages" element={<ArticleListing />} />
            <Route path="/between-the-pages/:slug" element={<ArticleDetail />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/fair-use" element={<FairUse />} />
          </Route>

          {/* Public scan (anonymous, no auth required) */}
          <Route path="/try" element={<ScanPage />} />

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
              <Route path="/app/orders" element={<Orders />} />
            </Route>
          </Route>

          {/* Admin pages (authenticated + admin role) */}
          <Route element={<AdminGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/app/admin/orders" element={<AdminOrders />} />
            </Route>
          </Route>

          {/* OAuth callback (must be outside AuthGuard so tokens can be processed) */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Checkout result pages (no auth required — user may land here after Stripe redirect) */}
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />

          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/shared/:token" element={<SharedCollection />} />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>

      <ToastContainer />
    </>
  );
}
