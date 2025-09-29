import React, { useState, useRef, useEffect } from 'react';
import { cn } from './cn';

/**
 * Tooltip component for providing contextual help text
 * Supports multiple positions and automatic repositioning
 */
const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 700,
  className = '',
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check if tooltip fits in viewport and adjust position if needed
  const adjustPosition = () => {
    if (!tooltipRef.current || !triggerRef.current) return;

    const tooltip = tooltipRef.current;
    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let newPosition = position;

    // Check if tooltip goes outside viewport
    if (position === 'top' && rect.top - tooltipRect.height < 0) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && rect.bottom + tooltipRect.height > window.innerHeight) {
      newPosition = 'top';
    } else if (position === 'left' && rect.left - tooltipRect.width < 0) {
      newPosition = 'right';
    } else if (position === 'right' && rect.right + tooltipRect.width > window.innerWidth) {
      newPosition = 'left';
    }

    if (newPosition !== actualPosition) {
      setActualPosition(newPosition);
    }
  };

  const handleMouseEnter = () => {
    if (disabled || !content) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Adjust position after tooltip is rendered
      setTimeout(adjustPosition, 0);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    setActualPosition(position);
  };

  const handleFocus = () => {
    if (disabled || !content) return;
    setIsVisible(true);
    setTimeout(adjustPosition, 0);
  };

  const handleBlur = () => {
    setIsVisible(false);
    setActualPosition(position);
  };

  // Touch handling for mobile
  const handleTouchStart = () => {
    if (disabled || !content) return;
    setIsVisible(true);
    setTimeout(adjustPosition, 0);

    // Hide after 3 seconds on mobile
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  };

  if (!content) {
    return <>{children}</>;
  }

  // Position styles
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  // Arrow position styles
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1'
  };

  // Arrow rotation styles
  const arrowRotation = {
    top: 'rotate-180',
    bottom: '',
    left: 'rotate-90',
    right: '-rotate-90'
  };

  // Clone the child element and add event handlers
  const child = React.Children.only(children);
  const childWithProps = React.cloneElement(child, {
    onMouseEnter: (e) => {
      handleMouseEnter();
      if (child.props.onMouseEnter) child.props.onMouseEnter(e);
    },
    onMouseLeave: (e) => {
      handleMouseLeave();
      if (child.props.onMouseLeave) child.props.onMouseLeave(e);
    },
    onFocus: (e) => {
      handleFocus();
      if (child.props.onFocus) child.props.onFocus(e);
    },
    onBlur: (e) => {
      handleBlur();
      if (child.props.onBlur) child.props.onBlur(e);
    },
    onTouchStart: (e) => {
      handleTouchStart();
      if (child.props.onTouchStart) child.props.onTouchStart(e);
    },
    ref: triggerRef
  });

  return (
    <>
      {childWithProps}

      {isVisible && triggerRef.current && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'fixed z-50 pointer-events-none',
            'tooltip-enter'
          )}
          style={{
            left: triggerRef.current ? (
              actualPosition === 'left'
                ? triggerRef.current.getBoundingClientRect().left - 8
                : actualPosition === 'right'
                ? triggerRef.current.getBoundingClientRect().right + 8
                : triggerRef.current.getBoundingClientRect().left + triggerRef.current.getBoundingClientRect().width / 2
            ) : 0,
            top: triggerRef.current ? (
              actualPosition === 'top'
                ? triggerRef.current.getBoundingClientRect().top - 8
                : actualPosition === 'bottom'
                ? triggerRef.current.getBoundingClientRect().bottom + 8
                : triggerRef.current.getBoundingClientRect().top + triggerRef.current.getBoundingClientRect().height / 2
            ) : 0,
            transform: actualPosition === 'top'
              ? 'translateX(-50%) translateY(-100%)'
              : actualPosition === 'bottom'
              ? 'translateX(-50%)'
              : actualPosition === 'left'
              ? 'translateX(-100%) translateY(-50%)'
              : 'translateY(-50%)'
          }}
        >
          <div
            className={cn(
              'px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg',
              'whitespace-nowrap max-w-xs',
              className
            )}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                'absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45',
                arrowClasses[actualPosition],
                arrowRotation[actualPosition]
              )}
            />
          </div>
        </div>
      )}
    </>
  );
};

/**
 * IconButton with built-in tooltip support
 */
export const IconButton = ({
  icon,
  label,
  onClick,
  variant = 'ghost',
  size = 'sm',
  className = '',
  disabled = false,
  ...props
}) => {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const variantClasses = {
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    solid: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
    danger: 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
  };

  return (
    <Tooltip content={label} disabled={disabled}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          'rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          sizeClasses[size],
          variantClasses[variant],
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  );
};

export default Tooltip;