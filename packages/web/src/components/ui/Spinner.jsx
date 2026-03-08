import clsx from 'clsx';

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Spinner({ size = 'md', className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        'inline-block rounded-full border-terracotta/30 border-t-terracotta animate-spin',
        sizeMap[size],
        className,
      )}
    />
  );
}
