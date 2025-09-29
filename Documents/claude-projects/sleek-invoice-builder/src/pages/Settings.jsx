import { useState } from 'react';
import PageShell from '../components/PageShell';
import LogoUploader from '../components/LogoUploader';
import UpgradeModal from '../components/UpgradeModal';
import { getLifetimePrice, PRICING } from '../store/subscription';
import TemplateAndFontSelector from '../components/TemplateAndFontSelector';
import BusinessInfoSection from '../components/BusinessInfoSection';
import PaymentMethodsSection from '../components/PaymentMethodsSection';
import { loadTestData } from '../utils/testData';
import { useAuth } from '../contexts/AuthContext';
import { logInfo, logError } from '../utils/errorHandler';
import unifiedSubscriptionService from '../services/unifiedSubscriptionService';
// Import logo sync utilities for debugging
import '../utils/fixLogoSync';

export default function SettingsPage({ onBack }) {
  const [show, setShow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { userProfile, refreshUserProfile, getSubscriptionStatus } = useAuth();

  // Get subscription status from AuthContext (Firestore data)
  const subscriptionData = getSubscriptionStatus();
  const isPremium = subscriptionData.tier !== 'free' && subscriptionData.status === 'active';

  // Debug functions removed - subscription is now managed through Stripe

  // Manual refresh subscription status
  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    try {
      logInfo('Settings', 'Manually refreshing subscription status');

      // Clear any localStorage subscription data to ensure we read from Firestore
      localStorage.removeItem('subscription_tier');
      localStorage.removeItem('subscription_status');
      localStorage.removeItem('subscription_type');
      localStorage.removeItem('isPremium');
      localStorage.removeItem('premium_active');
      logInfo('Settings', 'Cleared localStorage subscription cache');

      // Try to re-verify the last payment session
      // Use the known session ID from your last payment
      const lastSessionId = 'cs_test_a1uN342LlcXjdVOxx0l967WlG06kK9ql5ScLqHrpGdam0EZpYr9NHii3od';

      logInfo('Settings', 'Attempting to verify last payment session');
      try {
        const stripeService = (await import('../services/stripeService')).default;
        await stripeService.verifyPayment(lastSessionId);
        logInfo('Settings', 'Payment verification completed');
      } catch (verifyError) {
        logError('Payment verification error', verifyError);
      }

      await refreshUserProfile();
      // Small delay to show loading state
      setTimeout(() => {
        setRefreshing(false);
        window.location.reload();
      }, 1000);
    } catch (error) {
      setRefreshing(false);
      logError('Failed to refresh subscription', error);
    }
  };

  return (
    <PageShell
      title="Settings"
      actions={<button onClick={onBack} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700">Back</button>}
    >
      <div className="max-w-3xl space-y-6">
        {/* Subscription Management Section - FIRST for prominence */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Subscription</h2>
            <button
              onClick={handleRefreshSubscription}
              disabled={refreshing}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Status
                </>
              )}
            </button>
          </div>
          
          {isPremium ? (
            <div className="space-y-4">
              {/* Premium Status */}
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">{subscriptionData.tier === 'pro' ? 'Pro Plan Active' : subscriptionData.tier === 'starter' ? 'Starter Plan Active' : 'Premium Active'}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {subscriptionData.tier === 'pro' ? 'You have unlimited access to all features' : subscriptionData.tier === 'starter' ? 'You have access to starter features' : 'You have access to all premium features'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Features Grid - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Features</p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Unlimited invoices
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> 6 premium templates
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Custom logo
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> No watermark
                    </li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Additional Benefits</p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> 12 premium fonts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Unlimited clients
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Unlimited items
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Priority support
                    </li>
                  </ul>
                </div>
              </div>

              {/* Subscription Management */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={async () => {
                    try {
                      const result = await unifiedSubscriptionService.manageSubscription();

                      if (result.showMessage) {
                        // Show message for admin/promotional subscriptions
                        alert(result.message);
                      }
                    } catch (error) {
                      logError('Failed to manage subscription', error);
                      alert('Unable to open subscription management. Please try again.');
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage Subscription
                </button>

                {/* Generic helper text */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                  {(() => {
                    const status = unifiedSubscriptionService.getSubscriptionStatus();
                    if (status.provider === 'admin' || status.provider === 'promotional') {
                      return "Complimentary account • Contact support for changes";
                    }
                    return "Cancel anytime • Update payment method • View billing history";
                  })()}
                </p>

                {/* Test Data Button - Keep for development */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => {
                      if (loadTestData()) {
                        window.location.reload();
                      }
                    }}
                    className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Load Sample Invoices (Dev Only)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Plan Status */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{subscriptionData.tier === 'free' ? 'Free Plan' : `${subscriptionData.tier.charAt(0).toUpperCase() + subscriptionData.tier.slice(1)} Plan`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Limit</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{subscriptionData.tier === 'free' ? '10 invoices' : subscriptionData.tier === 'starter' ? '50 invoices' : 'Unlimited'}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Plans</h3>

                {/* Starter Plan */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">Starter</span>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">POPULAR</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Perfect for freelancers</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                        <li>• 50 invoices/month</li>
                        <li>• No watermark</li>
                        <li>• 3 templates</li>
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">$2.99</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">or $29.99/year</p>
                    </div>
                  </div>
                </div>

                {/* Pro Plan */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">Pro</span>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">BEST VALUE</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">For growing businesses</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                        <li>• Unlimited everything</li>
                        <li>• All templates</li>
                        <li>• Analytics & API</li>
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">$7.99</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">or $79.99/year</p>
                    </div>
                  </div>
                </div>

                {/* Lifetime Plan */}
                <div className="p-4 rounded-lg border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">Lifetime</span>
                        <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs rounded-full">LIMITED OFFER</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">One-time payment</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                        <li>• All Pro features</li>
                        <li>• Lifetime updates</li>
                        <li>• First 1000 users only</li>
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        ${getLifetimePrice()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">one time</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Save ${(7.99 * 24 - getLifetimePrice()).toFixed(0)}+</p>
                    </div>
                  </div>
                </div>

                {/* Upgrade Button */}
                <button
                  onClick={() => setShow(true)}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-medium transition-all hover:shadow-lg"
                >
                  View All Plans & Upgrade
                </button>
              </div>

              {/* Testing Controls - Always visible */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Testing Mode - For Development Only
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        // Can't activate through localStorage anymore - must use Stripe
                        setShow(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
                    >
                      Activate Premium
                    </button>
                    <button
                      onClick={() => {
                        if (loadTestData()) {
                          window.location.reload();
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-sm font-medium"
                    >
                      Load Sample Invoices
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Business Information Section */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 bg-white dark:bg-gray-900">
          <BusinessInfoSection />
        </section>

        {/* Payment Methods Section */}
        <PaymentMethodsSection />

        {/* Branding Section */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Branding and Templates</h2>
            <span className={`text-xs px-2 py-1 rounded-full border ${
              isPremium 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                : 'border-gray-300 dark:border-gray-700'
            }`}>
              {(subscriptionData.tier || 'free').toUpperCase()}
            </span>
          </div>
          <LogoUploader onNeedUpgrade={() => setShow(true)} />
          <div className="mt-6">
            <TemplateAndFontSelector onNeedUpgrade={() => setShow(true)} />
          </div>
        </section>

        {/* About Section */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-3">About</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>Sleek Invoice Builder v1.0</p>
            <p>Create professional invoices in minutes</p>
            <p className="pt-2 text-xs">
              Built for freelancers and small businesses
            </p>
          </div>
        </section>
      </div>
      <UpgradeModal open={show} onClose={() => setShow(false)} onUpgraded={() => window.location.reload()} />
    </PageShell>
  );
}