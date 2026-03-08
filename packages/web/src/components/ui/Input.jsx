import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export const Input = forwardRef(function Input(
  { label, error, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="font-ui text-sm font-medium text-walnut"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={clsx(
          'w-full bg-cream-surface border rounded-md px-4 py-2.5 font-body text-walnut placeholder:text-walnut-muted',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta',
          error
            ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
            : 'border-border',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="font-ui text-xs text-red-500">{error}</p>
      )}
    </div>
  );
});
