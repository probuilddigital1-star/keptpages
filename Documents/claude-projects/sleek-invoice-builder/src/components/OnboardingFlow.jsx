import React, { useState, useEffect } from 'react';
import { hasCompletedOnboarding, completeOnboarding } from '../store/uxFlags';
import { getBusinessName, setBusinessName } from '../store/settings';

function OnboardingFlow({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [businessName, setBusinessNameState] = useState('');

  useEffect(() => {
    // Load existing business name if any
    const existingName = getBusinessName();
    if (existingName) {
      setBusinessNameState(existingName);
    }
  }, []);

  const handleBusinessNameSave = () => {
    if (businessName.trim()) {
      setBusinessName(businessName.trim());
    }
    handleNext();
  };

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Sleek Invoice Builder!',
      description: 'Create professional invoices in seconds',
      image: (
        <svg className="w-32 h-32 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: 'Get Started'
    },
    {
      id: 'business-setup',
      title: 'Set Up Your Business',
      description: 'Enter your business name to personalize your invoices',
      customContent: (
        <div className="mt-6 space-y-4">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessNameState(e.target.value)}
            placeholder="Your Business Name"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-lg"
            autoFocus
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            This will appear on all your invoices
          </p>
        </div>
      ),
      action: 'Continue',
      onAction: handleBusinessNameSave
    },
    {
      id: 'create',
      title: 'Create Your First Invoice',
      description: 'Tap the + button to create a new invoice. Add your client details and items.',
      highlight: 'fab',
      position: 'bottom-right',
      action: 'Next'
    },
    {
      id: 'templates',
      title: 'Choose Professional Templates',
      description: 'Select from our collection of beautiful invoice templates to match your brand.',
      highlight: 'templates',
      position: 'center',
      action: 'Next'
    },
    {
      id: 'send',
      title: 'Send Invoices Instantly',
      description: 'Email invoices directly to clients or download as PDF.',
      highlight: 'send-button',
      position: 'top',
      action: 'Next'
    },
    {
      id: 'track',
      title: 'Track Payments',
      description: 'Monitor invoice status and get notified when clients view or pay.',
      highlight: 'dashboard',
      position: 'center',
      action: 'Next'
    },
    {
      id: 'upgrade',
      title: 'Unlock Premium Features',
      description: 'Get unlimited invoices, remove watermarks, and access all templates.',
      image: (
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
            <svg className="w-16 h-16 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">$2.99</span>
              <span className="text-gray-500">/month</span>
            </div>
            <p className="text-sm text-gray-600">Starter Plan - 50 invoices/month</p>
          </div>
        </div>
      ),
      action: 'Start Free Trial'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    completeOnboarding();
    onComplete?.();
  };

  const handleSkip = () => {
    completeOnboarding();
    onSkip?.();
  };

  const currentStepData = steps[currentStep];

  // Welcome screen
  if (showWelcome && currentStep === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          {currentStepData.image}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {currentStepData.title}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {currentStepData.description}
          </p>
          <button
            onClick={() => setShowWelcome(false)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all transform hover:scale-105"
          >
            {currentStepData.action}
          </button>
          <button
            onClick={handleSkip}
            className="mt-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip Tutorial
          </button>
        </div>
      </div>
    );
  }

  // Tutorial overlays
  return (
    <div className="onboarding-overlay">
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-75 z-40" onClick={handleSkip} />

      {/* Highlight element */}
      {currentStepData.highlight && (
        <div
          className="onboarding-highlight"
          data-highlight={currentStepData.highlight}
        />
      )}

      {/* Tooltip */}
      <div
        className={`onboarding-tooltip ${currentStepData.position || 'center'}`}
        style={{
          position: 'fixed',
          zIndex: 50,
          ...(currentStepData.position === 'bottom-right' && {
            bottom: '140px',
            right: '20px',
            left: 'auto'
          }),
          ...(currentStepData.position === 'center' && {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }),
          ...(currentStepData.position === 'top' && {
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)'
          })
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm p-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4">
            {steps.slice(1).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index + 1 <= currentStep
                    ? 'bg-blue-600 w-6'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentStepData.image && currentStepData.image}

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {currentStepData.title}
          </h3>
          <p className="text-gray-600 mb-6">
            {currentStepData.description}
          </p>

          {currentStepData.customContent && currentStepData.customContent}

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={currentStepData.onAction || handleNext}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                currentStep === steps.length - 1
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentStepData.action}
            </button>
          </div>
        </div>

        {/* Arrow pointing to element */}
        {currentStepData.highlight && currentStepData.position === 'bottom-right' && (
          <div className="absolute -bottom-4 right-12">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingFlow;