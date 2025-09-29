import React from 'react';
import { cn } from './cn';

/**
 * Skeleton loader component for loading states
 * Provides visual feedback while content is loading
 */
const Skeleton = ({
  className = '',
  variant = 'text',
  width,
  height,
  rounded = 'md',
  animate = true,
  children
}) => {
  // Variant styles
  const variantStyles = {
    text: 'h-4',
    title: 'h-6',
    button: 'h-11 w-24',
    avatar: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full',
    image: 'h-48 w-full',
    input: 'h-11 w-full'
  };

  // Rounded styles
  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  // Base skeleton styles
  const baseStyles = cn(
    'bg-gray-200 dark:bg-gray-700',
    animate && 'animate-pulse',
    variantStyles[variant],
    roundedStyles[rounded],
    className
  );

  // Apply custom dimensions if provided
  const style = {
    ...(width && { width }),
    ...(height && { height })
  };

  if (children) {
    // Skeleton wrapper for complex layouts
    return (
      <div className={cn('space-y-3', className)}>
        {children}
      </div>
    );
  }

  return <div className={baseStyles} style={style} aria-hidden="true" />;
};

/**
 * Skeleton group for multiple skeleton items
 */
export const SkeletonGroup = ({ count = 3, className = '', children }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {children ||
        Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} />
        ))
      }
    </div>
  );
};

/**
 * Invoice card skeleton
 */
export const InvoiceCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2">
        <Skeleton variant="title" width="120px" />
        <Skeleton width="150px" />
      </div>
      <Skeleton width="80px" height="24px" rounded="full" />
    </div>
    <div className="space-y-2">
      <Skeleton width="200px" />
      <Skeleton width="160px" />
    </div>
    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <Skeleton width="100px" />
      <div className="flex gap-2">
        <Skeleton variant="button" width="60px" />
        <Skeleton variant="button" width="60px" />
      </div>
    </div>
  </div>
);

/**
 * Client card skeleton
 */
export const ClientCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="title" width="150px" />
        <Skeleton width="180px" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton width="120px" />
      <Skeleton width="100px" />
    </div>
  </div>
);

/**
 * Table skeleton
 */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? "150px" : "100px"} />
        ))}
      </div>
    </div>
    {/* Rows */}
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                width={colIndex === 0 ? "180px" : colIndex === columns - 1 ? "80px" : "120px"}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;