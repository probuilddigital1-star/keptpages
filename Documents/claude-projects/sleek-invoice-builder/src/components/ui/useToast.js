import { useState, useCallback } from 'react';

/**
 * Custom hook for toast notifications
 * Works with the existing Toast component
 */
export function useToast() {
  const [toastState, setToastState] = useState({
    message: '',
    type: 'info',
    action: null
  });

  const toast = useCallback(({
    title,
    description,
    variant = 'info',
    action
  }) => {
    // Map variant to type for existing Toast component
    const typeMap = {
      default: 'info',
      destructive: 'error',
      success: 'success',
      warning: 'warning'
    };

    const message = description ? `${title}: ${description}` : title;

    setToastState({
      message,
      type: typeMap[variant] || variant,
      action
    });

    // Auto-clear after duration if no action
    if (!action) {
      setTimeout(() => {
        setToastState({ message: '', type: 'info', action: null });
      }, 3000);
    }
  }, []);

  const dismiss = useCallback(() => {
    setToastState({ message: '', type: 'info', action: null });
  }, []);

  return {
    toast,
    dismiss,
    toastState
  };
}