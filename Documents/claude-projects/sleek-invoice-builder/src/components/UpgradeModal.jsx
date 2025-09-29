import { useState, useEffect } from 'react';
import {
  PRICING,
  setStarterMonthly,
  setStarterYearly,
  setProMonthly,
  setProYearly,
  setLifetimeActive,
  getLifetimePrice,
  endIntroLifetimePromo,
  getSubscription
} from '../store/subscription';
import { shouldShowKeyboardShortcuts } from '../utils/deviceDetection';
import subscriptionService from '../services/subscriptionService';
import stripeService from '../services/stripeService';
import { showToast } from '../utils/toast';

export default function UpgradeModal({ open, onClose, onUpgraded }) {
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  // Detect platform
  const isWeb = typeof window !== 'undefined' && !window.ReactNativeWebView;
  const isMobile = !isWeb;

  // Handle Escape key (desktop only)
  useEffect(() => {
    if (!open) return;
    // Only add keyboard shortcuts on devices with keyboards
    if (!shouldShowKeyboardShortcuts()) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const lifetimePrice = getLifetimePrice();
  const currentSubscription = getSubscription();

  const handleUpgrade = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Construct plan type
      let planType = '';
      if (selectedPlan === 'lifetime') {
        planType = 'lifetime';
      } else {
        planType = `${selectedPlan}_${billingCycle}`;
      }

      // Handle payment based on platform
      if (isWeb) {
        // Web: Use Stripe
        await stripeService.purchaseSubscription(planType);
        // Stripe will redirect to checkout, no need to close modal
      } else {
        // Mobile: Use Google Play Billing
        const productId = getProductIdForPlan(selectedPlan, billingCycle);

        if (selectedPlan === 'lifetime') {
          await subscriptionService.purchaseLifetime();
        } else {
          await subscriptionService.purchaseSubscription(productId);
        }

        // Update local state
        updateLocalSubscription(selectedPlan, billingCycle);

        showToast('Subscription activated successfully!', 'success');
        onUpgraded?.();
        onClose?.();
      }
    } catch (error) {
      console.error('Purchase error:', error);
      showToast(error.message || 'Purchase failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to get Google Play product ID
  const getProductIdForPlan = (plan, cycle) => {
    const productMap = {
      'starter_monthly': 'com.sleekInvoice.starter.monthly',
      'starter_yearly': 'com.sleekInvoice.starter.yearly',
      'pro_monthly': 'com.sleekInvoice.pro.monthly',
      'pro_yearly': 'com.sleekInvoice.pro.yearly',
      'lifetime': 'com.sleekInvoice.pro.lifetime'
    };
    return productMap[`${plan}_${cycle}`] || productMap.lifetime;
  };

  // Update local subscription state
  const updateLocalSubscription = (plan, cycle) => {
    if (plan === 'lifetime') {
      setLifetimeActive();
      if (lifetimePrice === PRICING.lifetime.introUSD) {
        endIntroLifetimePromo();
      }
    } else if (plan === 'starter') {
      if (cycle === 'monthly') {
        setStarterMonthly();
      } else {
        setStarterYearly();
      }
    } else if (plan === 'pro') {
      if (cycle === 'monthly') {
        setProMonthly();
      } else {
        setProYearly();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-6xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Choose Your Plan</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Start with our free tier or unlock premium features</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center gap-3 mt-6">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors"
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-gray-300 rounded-full shadow-md transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Yearly
            </span>
            <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
              Save up to 20%
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid md:grid-cols-4 gap-6">

            {/* FREE Plan */}
            <div className={`rounded-xl border-2 ${
              currentSubscription.tier === 'free'
                ? 'border-gray-400 bg-gray-50 dark:bg-gray-800'
                : 'border-gray-300 dark:border-gray-700'
            } p-5 relative`}>
              {currentSubscription.tier === 'free' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-600 text-white text-xs font-semibold rounded-full">
                  CURRENT PLAN
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Free</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$0</span>
                  <span className="text-gray-500 dark:text-gray-400">/month</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Perfect for trying out</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">10 invoices/month</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">3 clients</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">1 template</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 line-through">Watermark removed</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 line-through">Custom logo</span>
                </li>
              </ul>

              <button
                disabled
                className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-medium cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>

            {/* STARTER Plan */}
            <button
              onClick={() => setSelectedPlan('starter')}
              className={`text-left rounded-xl border-2 p-5 relative transition-all ${
                selectedPlan === 'starter'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg scale-105'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-full">
                POPULAR
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Starter</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    ${billingCycle === 'monthly' ? PRICING.starter.monthlyUSD : (PRICING.starter.yearlyUSD / 12).toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">/month</span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Billed ${PRICING.starter.yearlyUSD} yearly
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Best for freelancers</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">50 invoices/month</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">20 clients</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">3 templates</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">No watermark</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Custom logo</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Email support</span>
                </li>
              </ul>
            </button>

            {/* PRO Plan */}
            <button
              onClick={() => setSelectedPlan('pro')}
              className={`text-left rounded-xl border-2 p-5 relative transition-all ${
                selectedPlan === 'pro'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-lg scale-105'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full">
                BEST VALUE
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pro</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    ${billingCycle === 'monthly' ? PRICING.pro.monthlyUSD : (PRICING.pro.yearlyUSD / 12).toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">/month</span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Billed ${PRICING.pro.yearlyUSD} yearly
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Best for businesses</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Unlimited everything</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">All templates</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Recurring invoices</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">API access</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Priority support</span>
                </li>
              </ul>
            </button>

            {/* LIFETIME Plan */}
            <button
              onClick={() => setSelectedPlan('lifetime')}
              className={`text-left rounded-xl border-2 p-5 relative transition-all ${
                selectedPlan === 'lifetime'
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 shadow-lg scale-105'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold rounded-full">
                ONE TIME
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Lifetime</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    ${lifetimePrice}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"> once</span>
                </div>
                {lifetimePrice === PRICING.lifetime.introUSD && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1 font-medium">
                    First 1000 users only!
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Pay once, use forever</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">All Pro features</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Lifetime updates</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">No recurring fees</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Early adopter badge</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Future features included</span>
                </li>
              </ul>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {selectedPlan && selectedPlan !== 'lifetime' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {billingCycle === 'yearly' ? 'Save 20% with yearly billing' : 'Switch to yearly and save 20%'}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={!selectedPlan || selectedPlan === currentSubscription.tier || isProcessing}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedPlan && selectedPlan !== currentSubscription.tier && !isProcessing
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessing
                  ? 'Processing...'
                  : selectedPlan === 'lifetime'
                    ? `Get Lifetime Access`
                    : selectedPlan
                      ? `Upgrade to ${PRICING[selectedPlan]?.name || selectedPlan}`
                      : 'Select a Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}