import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import PageShell from './components/PageShell';
import Dashboard from './pages/Dashboard';
import InvoiceEditor from './pages/InvoiceEditor';
import InvoicePreviewSimple from './components/InvoicePreviewSimple';
import PublicInvoice from './pages/PublicInvoice';
import SettingsPage from './pages/Settings';
import ClientsPage from './pages/Clients';
import ItemsPage from './pages/Items';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import UpgradeModal from './components/UpgradeModal';
import SendModal from './components/SendModal';
import ShareInvoiceModal from './components/ShareInvoiceModal';
import Toast from './components/Toast';
import MobileNav from './components/MobileNav';
import OnboardingFlow from './components/OnboardingFlow';
import ErrorBoundary from './components/ErrorBoundary';
import DebugSubscription from './components/DebugSubscription';
import { listInvoices, saveInvoice as saveInvoiceToStore } from './store/invoices';
import { createSampleInvoice } from './utils/sample';
import { completeFirstRun, hasCompletedOnboarding } from './store/uxFlags';
import { canCreateInvoice, incrementInvoiceCount, getInvoicesRemaining, getInvoiceCountThisMonth, FREE_INVOICE_LIMIT } from './store/subscription';
import { logError, logInfo, logDebug } from './utils/errorHandler';
import Button from './components/ui/Button';
import stripeService from './services/stripeService';
import authService from './services/authService';
import './index.css';

const AppContent = () => {
  const { user, signOut } = useAuth();

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen />;
  }

  // Otherwise show the main app
  return <MainApp user={user} signOut={signOut} />;
};

const MainApp = ({ user, signOut }) => {
  const { refreshUserProfile } = useAuth();
  const verificationProcessing = useRef(new Set());

  // Check if this is a public invoice URL or admin URL
  const urlPath = window.location.pathname;
  const publicInvoiceMatch = urlPath.match(/^\/invoice\/([^\/]+)\/([^\/]+)$/);
  const isPublicInvoice = !!publicInvoiceMatch;
  const isAdminPath = urlPath === '/admin' || urlPath.startsWith('/admin/');

  const [view, setView] = useState(isPublicInvoice ? 'public' : 'dashboard'); // dashboard | editor | preview | settings | clients | items | public
  const [adminView, setAdminView] = useState(isAdminPath ? 'dashboard' : null); // dashboard | users | null
  const [current, setCurrent] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [publicInvoiceData, setPublicInvoiceData] = useState(
    publicInvoiceMatch ? { id: publicInvoiceMatch[1], token: publicInvoiceMatch[2] } : null
  );

  // Initialize app and test localStorage
  useEffect(() => {
    try {
      // Test localStorage
      localStorage.setItem('test_key', 'test_value');
      const testValue = localStorage.getItem('test_key');
      localStorage.removeItem('test_key');

      // Check existing invoices
      const invoices = listInvoices();
      
      // Make test functions available globally
      window.debugInvoiceApp = {
        listInvoices,
        saveTestInvoice: () => {
          const testInvoice = {
            id: 'test_' + Date.now(),
            client_name: 'Debug Test Client',
            number: 'TEST-' + Date.now().toString().slice(-6),
            total: 100,
            status: 'Draft',
            created_at: new Date()
          };
          saveInvoiceToStore(testInvoice);
          window.dispatchEvent(new Event('storage'));
          return testInvoice;
        },
        getCurrentView: () => view,
        setView: (v) => setView(v),
        checkAdmin: () => {
          console.log('User Profile:', authService.userProfile);
          console.log('Is Admin field:', authService.userProfile?.isAdmin);
          console.log('isAdmin() method:', authService.isAdmin());
          return authService.isAdmin();
        },
        goToAdmin: () => {
          setAdminView('dashboard');
          console.log('Forced admin view to dashboard');
        }
      };
      // Debug functions available at window.debugInvoiceApp
    } catch (e) {
      logError('App.initialization', e, { phase: 'startup' });
    }
  }, []);

  // Secret admin keyboard shortcut (Ctrl+Alt+Shift+A)
  useEffect(() => {
    const handleAdminShortcut = (e) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (authService.isAdmin()) {
          window.location.href = '/admin';
        }
      }
    };

    document.addEventListener('keydown', handleAdminShortcut);
    return () => document.removeEventListener('keydown', handleAdminShortcut);
  }, []);

  // Track when user profile loads
  useEffect(() => {
    const checkProfile = setInterval(() => {
      if (authService.userProfile) {
        console.log('[Admin Check] User profile loaded:', authService.userProfile);
        console.log('[Admin Check] Is admin?', authService.userProfile?.isAdmin);
        console.log('[Admin Check] authService.isAdmin() returns:', authService.isAdmin());
        setProfileLoaded(true);
        clearInterval(checkProfile);
      }
    }, 100);

    // Cleanup
    return () => clearInterval(checkProfile);
  }, []);

  // Re-check admin path when user profile loads
  useEffect(() => {
    if (profileLoaded && isAdminPath && adminView === null) {
      // User profile loaded and we're on admin path but not showing admin view
      if (authService.isAdmin()) {
        setAdminView('dashboard');
      }
    }
  }, [profileLoaded, isAdminPath, adminView]);

  // Handle Stripe payment verification on redirect
  useEffect(() => {
    const handlePaymentVerification = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const sessionId = urlParams.get('session_id');

      // Debug logging
      if (window.location.search) {
        logInfo('Payment redirect detected', {
          fullUrl: window.location.href,
          search: window.location.search,
          paymentStatus,
          sessionId,
          allParams: Object.fromEntries(urlParams.entries())
        });
      }

      if (paymentStatus === 'success' && sessionId) {
        // Check if we're already processing this session
        if (verificationProcessing.current.has(sessionId)) {
          logInfo('Payment verification', 'Already processing session: ' + sessionId);
          return;
        }

        // Mark as processing to prevent duplicate calls
        verificationProcessing.current.add(sessionId);
        logInfo('Payment verification', 'Processing Stripe payment verification with session: ' + sessionId);

        try {
          // Verify the payment with Firebase
          const result = await stripeService.verifyPayment(sessionId);

          // Refresh user profile to get updated subscription
          if (refreshUserProfile) {
            await refreshUserProfile();
          }

          // Show success message
          setToastMsg('Payment successful! Your subscription has been activated.');
          setToastType('success');

          // Clean URL after processing
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (error) {
          logError('Payment verification failed', error);
          setToastMsg('Payment verification failed. Please contact support if the issue persists.');
          setToastType('error');

          // Clean URL even on error
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } finally {
          // Remove from processing set after a delay
          setTimeout(() => {
            verificationProcessing.current.delete(sessionId);
          }, 5000);
        }
      } else if (paymentStatus === 'cancelled') {
        setToastMsg('Payment was cancelled. You can try again anytime.');
        setToastType('info');

        // Clean URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    };

    handlePaymentVerification();
  }, [refreshUserProfile]);

  // Check if onboarding should be shown
  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      // Show onboarding after a short delay to let the app fully load
      setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
    }
  }, []);

  // Refresh dashboard when returning from editor
  const refreshDashboard = () => {
    setView('dashboard');
    // Force re-render of dashboard by changing key
    window.dispatchEvent(new Event('storage'));
  };

  const openEditor = (invoice = null, options = {}) => {
    // Check invoice limit for new invoices (not editing existing)
    if (!invoice && !options.sample) {
      const currentCount = getInvoiceCountThisMonth();
      const remaining = getInvoicesRemaining();
      console.log('[App.web] Invoice limits check:', { currentCount, remaining, limit: FREE_INVOICE_LIMIT });

      if (!canCreateInvoice()) {
        showToast(`You've reached your monthly limit (${currentCount}/${FREE_INVOICE_LIMIT}). Upgrade to create more invoices.`, 'warning');
        setShowUpgrade(true);
        return;
      }
    }

    // Handle sample invoice creation
    if (options.sample) {
      const sampleInvoice = createSampleInvoice();
      completeFirstRun();
      setCurrent(sampleInvoice);
      setView('editor');
      showToast('Sample invoice created! Feel free to edit and save.', 'success');
      return;
    }
    setCurrent(invoice);
    setView('editor');
  };

  const showToast = (message, type = 'info') => {
    setToastMsg(message);
    setToastType(type);
  };

  const saveInvoice = (payload) => {
    setCurrent(payload);
    setView('preview');
  };

  const handleSelectInvoice = (invoice) => {
    setCurrent(invoice);
    setView('preview');
  };

  const openUpgrade = () => setShowUpgrade(true);
  const closeUpgrade = () => setShowUpgrade(false);

  // Public Invoice View (no auth required)
  if (view === 'public' && publicInvoiceData) {
    // For public invoice view, we'll render the PublicInvoice component
    // But since PublicInvoice uses useParams from react-router, we need to pass props
    // Let's render it directly
    return <PublicInvoice invoiceId={publicInvoiceData.id} token={publicInvoiceData.token} />;
  }

  // Clients View
  if (view === 'clients') {
    return (
      <>
        <ClientsPage
          onBack={() => setView('dashboard')}
          onSelect={(client) => {
            // When selecting a client from the Clients page, go to new invoice with client data
            setCurrent({
              client_name: client.name,
              client_email: client.email,
              client_address: client.address,
              payment_terms: client.terms || 'Net 15'
            });
            setView('editor');
          }}
          onUpgrade={openUpgrade}
        />
        <ErrorBoundary name="MobileNav" onReset={() => window.location.reload()}>
          <MobileNav
            currentView={view}
            onNavigate={setView}
            onNewInvoice={() => openEditor()}
          />
        </ErrorBoundary>
        <UpgradeModal 
          open={showUpgrade} 
          onClose={closeUpgrade} 
          onUpgraded={() => {
            closeUpgrade();
            window.location.reload();
          }} 
        />
      </>
    );
  }

  // Items View
  if (view === 'items') {
    return (
      <>
        <ItemsPage
          onBack={() => setView('dashboard')}
          onUpgrade={openUpgrade}
        />
        <ErrorBoundary name="MobileNav" onReset={() => window.location.reload()}>
          <MobileNav
            currentView={view}
            onNavigate={setView}
            onNewInvoice={() => openEditor()}
          />
        </ErrorBoundary>
        <UpgradeModal 
          open={showUpgrade} 
          onClose={closeUpgrade} 
          onUpgraded={() => {
            closeUpgrade();
            window.location.reload();
          }} 
        />
      </>
    );
  }

  // Admin Panel - Completely separate from main app
  if (adminView !== null) {
    // Wait for auth to load before checking admin status
    if (!profileLoaded) {
      // Still loading user profile, show a loading state
      return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading admin panel...</p>
          </div>
        </div>
      );
    }

    // Check if user is admin (after profile is loaded)
    if (!authService.isAdmin()) {
      // Silently redirect non-admins to main app
      window.history.replaceState(null, '', '/');
      setAdminView(null);
      return null;
    }

    // Render admin panel
    if (adminView === 'users') {
      return (
        <>
          <PageShell
            title="User Management"
            onLogoClick={() => window.location.href = '/'}
            actions={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setAdminView('dashboard')}>
                  Back to Admin Dashboard
                </Button>
                <Button variant="tertiary" onClick={() => window.location.href = '/'}>
                  Exit Admin
                </Button>
              </div>
            }
          >
            <AdminUsers
              onNavigate={(view) => setAdminView(view === 'admin' ? 'dashboard' : 'users')}
            />
          </PageShell>
          <Toast
            message={toastMsg}
            type={toastType}
            onClose={() => setToastMsg('')}
          />
        </>
      );
    }

    // Admin Dashboard (default admin view)
    return (
      <>
        <PageShell
          title="Admin Dashboard"
          onLogoClick={() => window.location.href = '/'}
          actions={
            <Button variant="tertiary" onClick={() => window.location.href = '/'}>
              Exit Admin Panel
            </Button>
          }
        >
          <AdminDashboard
            onNavigate={(view) => setAdminView(view === 'admin-users' ? 'users' : 'dashboard')}
          />
        </PageShell>
        <Toast
          message={toastMsg}
          type={toastType}
          onClose={() => setToastMsg('')}
        />
      </>
    );
  }

  // Settings View
  if (view === 'settings') {
    return (
      <>
        <SettingsPage
          onBack={() => setView('dashboard')}
          onLogoClick={() => setView('dashboard')}
        />
        <ErrorBoundary name="MobileNav" onReset={() => window.location.reload()}>
          <MobileNav
            currentView={view}
            onNavigate={setView}
            onNewInvoice={() => openEditor()}
          />
        </ErrorBoundary>
        <UpgradeModal
          open={showUpgrade}
          onClose={closeUpgrade}
          onUpgraded={() => {
            closeUpgrade();
            window.location.reload();
          }}
        />
      </>
    );
  }

  // Editor View
  if (view === 'editor') {
    return (
      <>
        <ErrorBoundary name="InvoiceEditor" onReset={() => setView('dashboard')}>
          <InvoiceEditor
            initial={current}
            onCancel={refreshDashboard}
            onSave={saveInvoice}
            onLogoClick={() => setView('dashboard')}
            onOpenClients={() => setView('clients')}
            onOpenItems={() => setView('items')}
          />
        </ErrorBoundary>
        <UpgradeModal 
          open={showUpgrade} 
          onClose={closeUpgrade} 
          onUpgraded={() => {
            closeUpgrade();
            window.location.reload();
          }} 
        />
      </>
    );
  }

  // Preview View
  if (view === 'preview' && current) {
    return (
      <>
        <PageShell 
          title={`Invoice #${current.number}`}
          onLogoClick={() => setView('dashboard')}
          actions={
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="tertiary"
                onClick={() => openEditor(current)}
                className="min-w-[80px]"
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowShare(true)}
                className="min-w-[80px]"
              >
                Share
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowSend(true)}
                className="min-w-[80px]"
              >
                Send
              </Button>
            </div>
          }
        >
          <ErrorBoundary name="InvoicePreview" onReset={() => setView('dashboard')}>
            <InvoicePreviewSimple invoice={current} />
          </ErrorBoundary>
        </PageShell>
        <SendModal
          open={showSend}
          onClose={() => {
            setShowSend(false);
            // Refresh to show updated status
            window.dispatchEvent(new Event('storage'));
          }}
          invoice={current}
        />
        <ShareInvoiceModal
          open={showShare}
          onClose={() => setShowShare(false)}
          invoice={current}
        />
        <UpgradeModal 
          open={showUpgrade} 
          onClose={closeUpgrade} 
          onUpgraded={() => {
            closeUpgrade();
            window.location.reload();
          }} 
        />
      </>
    );
  }

  // Dashboard View (default)
  return (
    <>
      <ErrorBoundary name="Dashboard" onReset={() => window.location.reload()}>
        <Dashboard
          onCreate={() => openEditor()}
          onOpenInvoice={handleSelectInvoice}
          onOpenSettings={() => setView('settings')}
          onOpenClients={() => setView('clients')}
          onOpenItems={() => setView('items')}
          onUpgrade={openUpgrade}
          onSignOut={signOut}
          user={user}
        />
      </ErrorBoundary>

      <MobileNav
        currentView={view}
        onNavigate={setView}
        onNewInvoice={() => openEditor()}
      />

      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            showToast('Welcome! Create your first invoice to get started.', 'success');
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <UpgradeModal
        open={showUpgrade}
        onClose={closeUpgrade}
        onUpgraded={() => {
          closeUpgrade();
          window.location.reload();
        }}
      />

      <Toast
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg('')}
      />

      <DebugSubscription />
    </>
  );
};

const AppWeb = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default AppWeb;