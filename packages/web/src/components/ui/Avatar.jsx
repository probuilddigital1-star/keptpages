import { useState } from 'react';
import clsx from 'clsx';

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = 'md', className }) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-ui font-semibold select-none shrink-0 overflow-hidden',
        !showImage && 'bg-terracotta text-white',
        sizeMap[size],
        className,
      )}
      aria-label={name || 'User avatar'}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
