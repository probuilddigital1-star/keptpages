import { forwardRef } from 'react';
import clsx from 'clsx';

export const Card = forwardRef(function Card(
  { hover = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        'bg-cream-surface border border-border-light rounded-md shadow-sm',
        hover &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
