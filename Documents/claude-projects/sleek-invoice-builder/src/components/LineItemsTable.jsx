import { toNumber, fmtMoney } from '../utils/money';
import { IconButton } from './ui/Tooltip';

export default function LineItemsTable({ items, setItems }) {
  const update = (i, key, val) => {
    const next = items.slice();
    next[i] = { ...next[i], [key]: key === 'qty' || key === 'rate' ? toNumber(val) : val };
    setItems(next);
  };
  const add = () => setItems([...items, { title: '', description: '', qty: 1, rate: 0 }]);
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i));
  const amount = (it) => toNumber(it.qty) * toNumber(it.rate);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300">
        <div className="col-span-5 sm:col-span-7">Item</div>
        <div className="col-span-2 sm:col-span-1 text-center">Qty</div>
        <div className="col-span-2 text-right">Rate</div>
        <div className="col-span-3 sm:col-span-2 text-right">Amount</div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((it, i) => (
          <div key={i} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <div className="grid grid-cols-12 gap-2">
              {/* Item name and description - responsive width */}
              <div className="col-span-5 sm:col-span-7 space-y-2">
                <input
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="Item name"
                  value={it.title || it.description || ''}
                  onChange={(e) => update(i, 'title', e.target.value)}
                />
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  placeholder="Description (optional) - you can add multiple lines"
                  value={it.title ? (it.description || '') : ''}
                  onChange={(e) => update(i, 'description', e.target.value)}
                  rows="3"
                />
              </div>

              {/* Qty - more space on mobile */}
              <div className="col-span-2 sm:col-span-1">
                <input
                  className="w-full px-1 sm:px-2 py-2 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  inputMode="decimal"
                  placeholder="1"
                  value={it.qty}
                  onChange={(e) => update(i, 'qty', e.target.value)}
                />
              </div>

              {/* Rate */}
              <div className="col-span-2">
                <input
                  className="w-full px-1 sm:px-2 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={it.rate}
                  onChange={(e) => update(i, 'rate', e.target.value)}
                  onBlur={(e) => update(i, 'rate', toNumber(e.target.value))}
                />
              </div>

              {/* Amount - more space on mobile */}
              <div className="col-span-3 sm:col-span-2 flex items-start justify-between">
                <div className="text-right font-medium text-gray-900 dark:text-gray-100 pt-2 flex-1 text-sm sm:text-base">
                  {fmtMoney(amount(it))}
                </div>
                {items.length > 1 && (
                  <IconButton
                    onClick={() => remove(i)}
                    label={`Remove line ${i + 1}`}
                    variant="danger"
                    size="sm"
                    className="ml-2"
                    icon={
                      <span className="text-red-600 dark:text-red-400">✕</span>
                    }
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add line button */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={add}
          className="w-full py-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 dark:text-blue-400 transition-colors flex items-center justify-center gap-2"
        >
          <span>+ Add line</span>
          {items.length === 0 && (
            <span className="text-xs text-gray-500">(or press Enter)</span>
          )}
        </button>
      </div>
    </div>
  );
}