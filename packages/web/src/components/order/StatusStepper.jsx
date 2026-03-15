import clsx from 'clsx';

const STEPS = [
  { key: 'ordered', label: 'Ordered' },
  { key: 'printing', label: 'Printing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_INDEX = { ordered: 0, printing: 1, shipped: 2, delivered: 3 };

export function StatusStepper({ status }) {
  const currentIdx = STATUS_INDEX[status] ?? -1;
  const isError = status === 'error';
  const isCancelled = status === 'cancelled';

  if (isError || isCancelled) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={clsx(
          'inline-block w-2.5 h-2.5 rounded-full',
          isError ? 'bg-red-500' : 'bg-walnut-muted',
        )} />
        <span className={clsx(
          'font-ui text-xs font-medium',
          isError ? 'text-red-600' : 'text-walnut-muted',
        )}>
          {isError ? 'Error' : 'Cancelled'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" role="list" aria-label="Order status">
      {STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1" role="listitem">
            {idx > 0 && (
              <div className={clsx(
                'w-4 sm:w-6 h-0.5 rounded-full',
                done ? 'bg-sage' : 'bg-border',
              )} />
            )}
            <div className="flex items-center gap-1">
              <span className={clsx(
                'inline-block w-2.5 h-2.5 rounded-full border-2',
                done ? 'bg-sage border-sage' : 'bg-transparent border-border',
                active && 'ring-2 ring-sage/30',
              )} />
              <span className={clsx(
                'font-ui text-[10px] sm:text-xs',
                done ? 'text-walnut font-medium' : 'text-walnut-muted',
              )}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
