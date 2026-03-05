import clsx from 'clsx';

const variants = {
  default: 'bg-cream-alt text-walnut-secondary',
  terracotta: 'bg-terracotta-light text-terracotta',
  sage: 'bg-sage-light text-sage',
  gold: 'bg-gold-light text-gold',
};

export function Badge({ variant = 'default', children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-ui text-xs font-medium px-2.5 py-0.5 rounded-pill',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
