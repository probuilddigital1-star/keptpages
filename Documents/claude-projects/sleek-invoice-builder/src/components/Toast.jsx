import { useEffect } from 'react';

export default function Toast({ message, type = 'info', duration = 3000, onClose, action }) {
  useEffect(() => {
    if (message && duration > 0 && !action) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose, action]);

  if (!message) return null;

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-orange-600',
    info: 'bg-gray-900 dark:bg-gray-700'
  }[type] || 'bg-gray-900 dark:bg-gray-700';

  return (
    <div className="fixed bottom-4 right-4 z-50 toast-enter">
      <div className={`${bgColor} text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
        {type === 'success' && (
          <svg className="w-4 h-4 animate-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span>{message}</span>
        {action && (
          <button 
            onClick={action.onClick}
            className="ml-2 px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors font-medium"
          >
            {action.label}
          </button>
        )}
        <button 
          onClick={onClose}
          className="ml-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}