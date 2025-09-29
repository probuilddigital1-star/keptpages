import React, { useEffect, useRef } from 'react';
import Button from './ui/Button';
import { cn } from './ui/cn';

/**
 * Confirmation dialog component for destructive actions
 * Manages focus trap and returns focus to trigger on close
 */
export default function ConfirmDialog({
  open = false,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
  loading = false
}) {
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement;
      // Focus the cancel button when dialog opens
      setTimeout(() => {
        cancelRef.current?.focus();
      }, 100);
    } else if (previousFocusRef.current) {
      // Return focus to the trigger element when dialog closes
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !loading) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full max-w-md',
          'bg-white dark:bg-gray-900',
          'rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-gray-700',
          'p-6',
          'animate-scale-in'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <h2
          id="confirm-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
        >
          {title}
        </h2>

        {description && (
          <p
            id="confirm-description"
            className="text-gray-600 dark:text-gray-400 mb-6"
          >
            {description}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}