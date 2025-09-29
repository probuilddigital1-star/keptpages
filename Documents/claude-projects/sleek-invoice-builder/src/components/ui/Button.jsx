import React, { forwardRef } from 'react';
import { cn } from './cn';
import Spinner from './Spinner';

/**
 * Button component with variants and sizes
 * Follows WCAG accessibility guidelines with 44x44 min touch targets
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leadingIcon,
  trailingIcon,
  children,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  // Size system with min touch targets
  const sizeClasses = {
    sm: 'px-3 h-9 text-sm', // 36px height
    md: 'px-4 h-11 text-base', // 44px height (min touch target)
    lg: 'px-6 h-12 text-lg' // 48px height
  };

  // Base styles with button press animation
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed button-press';

  // Variant styles matching the design spec
  const variantClasses = {
    primary: cn(
      'bg-blue-600 text-white shadow-sm',
      'hover:bg-blue-700 active:bg-blue-800',
      'disabled:bg-gray-400 disabled:text-gray-200',
      'focus-visible:ring-blue-500'
    ),
    secondary: cn(
      'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900',
      'text-gray-700 dark:text-gray-200',
      'hover:bg-gray-50 dark:hover:bg-gray-800',
      'active:bg-gray-100 dark:active:bg-gray-700',
      'disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200',
      'focus-visible:ring-gray-500'
    ),
    tertiary: cn(
      'text-gray-700 dark:text-gray-300',
      'hover:bg-gray-50 dark:hover:bg-gray-800/50',
      'active:bg-gray-100 dark:active:bg-gray-800',
      'disabled:text-gray-400',
      'focus-visible:ring-gray-500'
    ),
    destructive: cn(
      'bg-red-600 text-white shadow-sm',
      'hover:bg-red-700 active:bg-red-800',
      'disabled:bg-gray-400 disabled:text-gray-200',
      'focus-visible:ring-red-500'
    )
  };

  // Handle loading or disabled state
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        isDisabled && 'opacity-50',
        className
      )}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading && (
        <Spinner
          size="sm"
          className={cn(
            'mr-1',
            variant === 'primary' || variant === 'destructive' ? 'text-white' : 'text-current'
          )}
        />
      )}
      {!loading && leadingIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <span>{children}</span>
      {!loading && trailingIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;