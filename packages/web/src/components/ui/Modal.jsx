import { useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';

const sizeMap = {
  sm: 'max-w-container-sm',
  md: 'max-w-container-md',
  lg: 'max-w-container-lg',
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, size = 'md' }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  // Close on Escape + focus trap
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(FOCUSABLE);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  // Focus the first focusable element (or close button) when modal opens
  useEffect(() => {
    if (open && panelRef.current) {
      const first = panelRef.current.querySelector(FOCUSABLE);
      if (first) first.focus();
      else panelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-walnut/40 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={clsx(
          'relative w-full bg-cream-surface rounded-lg shadow-xl p-6 sm:p-8',
          'animate-slide-up focus:outline-none',
          'max-h-[90svh] overflow-y-auto',
          sizeMap[size],
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-walnut">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-walnut-muted hover:text-walnut transition-colors p-1 -mr-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
