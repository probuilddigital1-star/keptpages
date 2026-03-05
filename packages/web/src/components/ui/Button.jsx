import { forwardRef } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

const base =
  'inline-flex items-center justify-center font-ui font-medium rounded-pill transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:-translate-y-[0.5px] active:translate-y-0';

const variants = {
  primary:
    'bg-terracotta text-white shadow-btn-primary hover:bg-terracotta-hover hover:shadow-btn-primary-hover',
  secondary:
    'bg-cream-surface text-walnut border border-border hover:border-terracotta/30 hover:shadow-sm',
  light:
    'bg-cream text-walnut shadow-btn-light hover:bg-cream-alt',
  ghost:
    'bg-transparent text-terracotta hover:bg-terracotta-light',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700',
};

const sizes = {
  sm: 'text-sm px-4 py-1.5 gap-1.5',
  md: 'text-sm px-6 py-2.5 gap-2',
  lg: 'text-base px-8 py-3 gap-2.5',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    children,
    className,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Spinner size="sm" className="shrink-0" />}
      {children}
    </button>
  );
});
