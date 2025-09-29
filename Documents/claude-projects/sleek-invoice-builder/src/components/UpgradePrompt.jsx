import React, { useState, useEffect } from 'react';
import { countInvoicesThisMonth } from '../store/invoices';
import { getSubscription, FREE_INVOICE_LIMIT } from '../store/subscription';

function UpgradePrompt({ trigger, onUpgrade, onDismiss }) {
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState(null);

  const prompts = {
    // After creating 3rd invoice
    invoiceLimit: {
      title: 'You\'re on a roll',
      message: `You've created ${FREE_INVOICE_LIMIT} invoices this month. Upgrade to create unlimited invoices and remove watermarks.`,
      icon: null,
      cta: 'Upgrade to Starter $2.99/mo',
      highlight: 'Most Popular'
    },

    // When trying to use premium template
    premiumTemplate: {
      title: 'Premium Template',
      message: 'This professional template is available for Pro users. Upgrade to access all templates and customize your brand.',
      icon: null,
      cta: 'Unlock All Templates',
      highlight: 'Pro Feature'
    },

    // After sending first invoice
    firstSend: {
      title: 'Invoice Sent Successfully',
      message: 'Track when clients view and pay your invoices. Pro users get real-time notifications.',
      icon: null,
      cta: 'Get Payment Notifications',
      highlight: 'New'
    },

    // When marking invoice as paid
    firstPayment: {
      title: 'Congratulations on Getting Paid',
      message: 'Pro users can generate payment reports and export data for accounting.',
      icon: null,
      cta: 'Unlock Analytics',
      highlight: 'Save Time'
    },

    // After 7 days of use
    retention: {
      title: 'Enjoying Sleek Invoice?',
      message: 'You\'ve been using the app for a week! Upgrade to Pro for unlimited features and priority support.',
      icon: null,
      cta: 'Go Pro - 50% Off',
      highlight: 'Limited Offer'
    },

    // When accessing clients/items
    dataManagement: {
      title: 'Organize Your Business',
      message: 'Pro users can save unlimited clients and products for faster invoice creation.',
      icon: null,
      cta: 'Save Time with Pro',
      highlight: 'Efficiency'
    },

    // Export attempt
    exportData: {
      title: 'Export Your Data',
      message: 'Download invoices as CSV, generate tax reports, and integrate with accounting software.',
      icon: null,
      cta: 'Enable Exports',
      highlight: 'Pro Feature'
    }
  };

  useEffect(() => {
    const checkTrigger = async () => {
      const subscription = getSubscription();

      // Don't show prompts to paid users
      if (subscription.tier !== 'free') return;

      // Check various triggers
      if (trigger === 'invoiceCount') {
        const count = await countInvoicesThisMonth();
        if (count >= FREE_INVOICE_LIMIT) {
          setPrompt(prompts.invoiceLimit);
          setShow(true);
        }
      } else if (trigger && prompts[trigger]) {
        setPrompt(prompts[trigger]);
        setShow(true);
      }
    };

    checkTrigger();
  }, [trigger]);

  if (!show || !prompt) return null;

  return (
    <div className="upgrade-prompt-overlay">
      <div className="upgrade-prompt-card">
        {/* Close button */}
        <button
          className="upgrade-prompt-close"
          onClick={() => {
            setShow(false);
            onDismiss?.();
          }}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Highlight badge */}
        {prompt.highlight && (
          <div className="upgrade-prompt-badge">
            {prompt.highlight}
          </div>
        )}

        {/* Icon */}
        {prompt.icon && (
          <div className="upgrade-prompt-icon">
            {prompt.icon}
          </div>
        )}

        {/* Content */}
        <h3 className="upgrade-prompt-title">{prompt.title}</h3>
        <p className="upgrade-prompt-message">{prompt.message}</p>

        {/* Features list */}
        <div className="upgrade-prompt-features">
          <div className="feature-item">
            <svg className="feature-check" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Unlimited Invoices
          </div>
          <div className="feature-item">
            <svg className="feature-check" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            No Watermarks
          </div>
          <div className="feature-item">
            <svg className="feature-check" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            All Premium Templates
          </div>
        </div>

        {/* Actions */}
        <div className="upgrade-prompt-actions">
          <button
            className="upgrade-prompt-cta"
            onClick={() => {
              setShow(false);
              onUpgrade?.();
            }}
          >
            {prompt.cta}
          </button>
          <button
            className="upgrade-prompt-later"
            onClick={() => {
              setShow(false);
              onDismiss?.();
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePrompt;

// CSS for the component
const styles = `
.upgrade-prompt-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.upgrade-prompt-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.upgrade-prompt-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: #6B7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.upgrade-prompt-close:hover {
  background: #F3F4F6;
}

.upgrade-prompt-badge {
  display: inline-block;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.upgrade-prompt-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  text-align: center;
}

.upgrade-prompt-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
  text-align: center;
}

.upgrade-prompt-message {
  color: #6B7280;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  text-align: center;
}

.upgrade-prompt-features {
  background: #F9FAFB;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: #4B5563;
  font-size: 0.875rem;
}

.feature-check {
  width: 20px;
  height: 20px;
  color: #10B981;
  flex-shrink: 0;
}

.upgrade-prompt-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upgrade-prompt-cta {
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.upgrade-prompt-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.upgrade-prompt-cta:active {
  transform: translateY(0);
}

.upgrade-prompt-later {
  background: transparent;
  color: #6B7280;
  padding: 0.75rem;
  border-radius: 12px;
  font-weight: 500;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.upgrade-prompt-later:hover {
  background: #F3F4F6;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .upgrade-prompt-card {
    padding: 1.5rem;
    margin: 1rem;
  }

  .upgrade-prompt-title {
    font-size: 1.25rem;
  }

  .upgrade-prompt-message {
    font-size: 0.875rem;
  }
}
`;

// Export styles to be included in the app
export { styles as upgradePromptStyles };