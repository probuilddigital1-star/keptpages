import { useState, useEffect } from 'react';
import { toICSEvent, downloadICS } from '../utils/ics';
import { shouldShowKeyboardShortcuts } from '../utils/deviceDetection';

export default function RecurringModal({ open, onClose, invoice }) {
  const [config, setConfig] = useState({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    frequency: 'MONTHLY',
    interval: 1,
    count: 12
  });

  // Handle Escape key (desktop only)
  useEffect(() => {
    if (!open) return;
    // Only add keyboard shortcuts on devices with keyboards
    if (!shouldShowKeyboardShortcuts()) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleCreate() {
    const start = new Date(`${config.startDate}T${config.startTime}`);
    const title = `Create invoice for ${invoice?.client_name || invoice?.client || 'Client'}`;
    const description = `Recurring invoice reminder\nClient: ${invoice?.client_name || invoice?.client || 'Unknown'}\nAmount: $${invoice?.total || 0}\nPrevious invoice: #${invoice?.number || 'DRAFT'}`;
    
    const icsContent = toICSEvent({
      title,
      start,
      freq: config.frequency,
      interval: config.interval,
      count: config.count,
      description,
      url: window.location.href
    });
    
    downloadICS(icsContent, `recurring_invoice_${invoice?.number || 'reminder'}.ics`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Set Up Recurring Invoice</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input 
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({...config, startDate: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time
              </label>
              <input 
                type="time"
                value={config.startTime}
                onChange={(e) => setConfig({...config, startTime: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select 
              value={config.frequency}
              onChange={(e) => setConfig({...config, frequency: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interval
              </label>
              <input 
                type="number"
                min="1"
                max="12"
                value={config.interval}
                onChange={(e) => setConfig({...config, interval: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Every {config.interval} {config.frequency.toLowerCase().replace('ly', '')}(s)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Occurrences
              </label>
              <input 
                type="number"
                min="1"
                max="52"
                value={config.count}
                onChange={(e) => setConfig({...config, count: parseInt(e.target.value) || 12})}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {config.count} reminders total
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">How it works:</p>
                <p className="text-xs">
                  This will download a calendar file (.ics) that you can import into Google Calendar, 
                  Outlook, or Apple Calendar. The calendar will remind you to create invoices on the scheduled dates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Download Calendar File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}