import { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
let nextId = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  add: (toast) => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    return id;
  },
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience function -- call from anywhere:
//   toast('Saved!');
//   toast('Oops', 'error');
export function toast(message, variant = 'success') {
  return useToastStore.getState().add({ message, variant });
}

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------
const variantStyles = {
  success: 'border-sage/40 bg-sage-light text-sage',
  error: 'border-red-300 bg-red-50 text-red-600',
  info: 'border-terracotta/30 bg-terracotta-light text-terracotta',
};

function ToastItem({ id, message, variant = 'success', onDismiss }) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(id), 200);
  }, [id, onDismiss]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-center gap-3 rounded-md border px-4 py-3 shadow-md font-ui text-sm',
        'transition-all duration-200',
        exiting
          ? 'translate-x-full opacity-0'
          : 'animate-slide-in-right',
        variantStyles[variant],
      )}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
  );
}

// ---------------------------------------------------------------------------
// Container -- render once near app root: <ToastContainer />
// ---------------------------------------------------------------------------
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-80"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onDismiss={remove} />
      ))}
    </div>
  );
}
