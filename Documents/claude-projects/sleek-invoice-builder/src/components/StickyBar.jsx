import React from 'react';
import { cn } from './ui/cn';

/**
 * Sticky bottom action bar component
 * Appears at bottom of screen with slide/fade animation
 */
export default function StickyBar({ children, visible = false, className = '' }) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700',
        'px-4 sm:px-6 py-4',
        'shadow-lg',
        'animate-slide-up',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-end">
        {children}
      </div>
    </div>
  );
}