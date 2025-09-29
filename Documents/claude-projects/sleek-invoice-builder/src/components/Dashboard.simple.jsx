import { logError, logInfo } from '../utils/errorHandler';
import { useEffect, useMemo, useState } from 'react';
import { listInvoices, countInvoicesThisMonth } from '../store/invoices';
import { limits } from '../store/subscription';
import { isFirstRunDone } from '../store/uxFlags';
import OnboardingChecklist from './OnboardingChecklist';

const STATUS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'];

export default function Dashboard({
  onCreateInvoice,
  onSelectInvoice,
  onUpgrade // optional callback to open upgrade modal
}) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [used, setUsed] = useState(0);
  const [countLoading, setCountLoading] = useState(true);

  const cap = limits();
  const atLimit = !cap.unlimited && used >= cap.monthlyLimit;
  const firstRun = !isFirstRunDone() && invoices.length === 0;

  // Load invoice count asynchronously
  useEffect(() => {
    const loadCount = async () => {
      try {
        const count = await countInvoicesThisMonth();
        setUsed(count);
      } catch (error) {
        // console.warn('Error loading invoice count:', error);
        setUsed(0);
      } finally {
        setCountLoading(false);
      }
    };
    loadCount();
  }, []);

  useEffect(() => {
    // Load invoices from localStorage
    const loadInvoices = async () => {
      try {
        const savedInvoices = await listInvoices();
        setInvoices(savedInvoices);
      } catch (error) {
        logError('DashboardSimple.loadInvoices', error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();

    // Reload when storage changes (for multi-tab support)
    const handleStorageChange = () => loadInvoices();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter(inv => {
      const matchesQ =
        !q ||
        (inv.client_name?.toLowerCase()?.includes(q) || 
         inv.client_email?.toLowerCase()?.includes(q) ||
         String(inv.id).includes(q) ||
         String(inv.number).includes(q));
      const invStatus = inv.status || 'Draft';
      const matchesS = status === 'All' ? true : invStatus === status;
      return matchesQ && matchesS;
    });
  }, [invoices, query, status]);

  const handleCreate = () => {
    if (atLimit) {
      if (onUpgrade) onUpgrade();
      return;
    }
    onCreateInvoice?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-lg text-gray-600 dark:text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Onboarding checklist for first run */}
      {firstRun && (
        <OnboardingChecklist
          onAddBusiness={() => onUpgrade?.()}
          onCreateSample={() => {
            if (onCreateInvoice) {
              onCreateInvoice({ sample: true });
            }
          }}
          onDownloadPdf={() => {
            if (onCreateInvoice) {
              onCreateInvoice({ sample: true });
            }
          }}
          onClose={() => window.location.reload()}
        />
      )}
      
      {/* Top controls - Mobile optimized */}
      <div className="space-y-4">
        {/* Status filters - Horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STATUS.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={
                'px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap ' +
                (status === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')
              }
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search and Create - Stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Invoice counter */}
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium sm:hidden">
            {cap.unlimited ? (
              <span className="text-green-600 dark:text-green-400">Unlimited invoices</span>
            ) : (
              <span className={used >= cap.monthlyLimit ? 'text-red-600 dark:text-red-400' : ''}>
                This month: {used} of {cap.monthlyLimit}
              </span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative flex-1">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by client or number"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Desktop invoice counter */}
          <div className="hidden sm:flex items-center text-sm text-gray-600 dark:text-gray-400 font-medium">
            {cap.unlimited ? (
              <span className="text-green-600 dark:text-green-400">Unlimited invoices</span>
            ) : (
              <span className={used >= cap.monthlyLimit ? 'text-red-600 dark:text-red-400' : ''}>
                {used}/{cap.monthlyLimit} this month
              </span>
            )}
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={atLimit}
            title={atLimit ? 'Reached free monthly limit. Upgrade to continue' : 'Create Invoice'}
            className={
              'w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors ' +
              (atLimit
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700')
            }
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            atLimit={atLimit}
            onCreate={handleCreate}
            onUpgrade={onUpgrade}
            hasInvoices={invoices.length > 0}
            onClearFilters={() => {
              setStatus('All');
              setQuery('');
            }}
          />
        ) : (
          filtered.map(inv => (
            <div
              key={inv.id}
              onClick={() => onSelectInvoice?.(inv)}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {inv.client_name || 'Unknown Client'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {inv.client_email || 'No email'}
                  </p>
                </div>
                <span
                  className={
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ' +
                    badgeClass(inv.status || 'Draft')
                  }
                >
                  {inv.status || 'Draft'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-600 dark:text-gray-400">
                  #{inv.number || inv.id}
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  ${Number(inv.total || 0).toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(inv.date || inv.created_at)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* Header row */}
        <div className="grid grid-cols-12 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
          <div className="col-span-4">Client</div>
          <div className="col-span-2">Number</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {/* Rows or empty state */}
        {filtered.length === 0 ? (
          <EmptyState
            atLimit={atLimit}
            onCreate={handleCreate}
            onUpgrade={onUpgrade}
            hasInvoices={invoices.length > 0}
            onClearFilters={() => {
              setStatus('All');
              setQuery('');
            }}
          />
        ) : (
          filtered.map(inv => (
            <div
              key={inv.id}
              onClick={() => onSelectInvoice?.(inv)}
              className="grid grid-cols-12 px-4 py-4 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all hover:shadow-sm"
            >
              <div className="col-span-4 pr-2">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {inv.client_name || 'Unknown Client'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {inv.client_email || 'No email'}
                </div>
              </div>
              <div className="col-span-2 text-gray-600 dark:text-gray-400">
                #{inv.number || inv.id}
              </div>
              <div className="col-span-2 text-gray-600 dark:text-gray-400">
                {formatDate(inv.date || inv.created_at)}
              </div>
              <div className="col-span-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                ${Number(inv.total || 0).toFixed(2)}
              </div>
              <div className="col-span-2 text-right">
                <span
                  className={
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ' +
                    badgeClass(inv.status || 'Draft')
                  }
                >
                  {inv.status || 'Draft'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Limit banner */}
      {atLimit && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/20 p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Monthly limit reached
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                You've created {cap.monthlyLimit} invoices this month. Upgrade to Premium for unlimited invoices, remove watermarks, and unlock professional templates.
              </p>
              <button
                onClick={() => onUpgrade?.()}
                className="mt-3 inline-flex items-center px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-medium transition-colors"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(v) {
  if (!v) return '';
  try {
    const d = new Date(v);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return v;
  }
}

function badgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (s === 'overdue') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (s === 'sent') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

function EmptyState({ atLimit, onCreate, onUpgrade, hasInvoices, onClearFilters }) {
  // Two modes
  // 1. No invoices at all: friendly welcome
  // 2. Search returned no results: show guidance
  if (!hasInvoices) {
    return (
      <div className="p-8 sm:p-12 text-center text-gray-600 dark:text-gray-400">
        {/* Simple invoice SVG illustration */}
        <svg className="mx-auto h-16 sm:h-20 w-16 sm:w-20 text-gray-300 dark:text-gray-600 mb-4" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3" width="16" height="18" rx="2" className="stroke-current" strokeWidth="1.5" />
          <path d="M8 7h8M8 11h8M8 15h5" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="17" cy="17" r="3" className="fill-blue-500 dark:fill-blue-400" opacity="0.2" />
          <path d="M16 16l1 1 2-2" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create your first invoice</h3>
        <p className="mt-2 text-sm max-w-md mx-auto">
          Get started with professional invoicing. Create, customize, and send beautiful invoices in minutes.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onCreate}
            disabled={atLimit}
            className={
              'w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium transition-colors ' +
              (atLimit ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')
            }
          >
            Create Your First Invoice
          </button>
          {atLimit && (
            <button
              onClick={() => onUpgrade?.()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium transition-colors"
            >
              Upgrade for Unlimited
            </button>
          )}
        </div>
      </div>
    );
  }

  // Search returned no matches
  return (
    <div className="p-8 sm:p-10 text-center text-gray-600 dark:text-gray-400">
      <svg className="mx-auto h-12 sm:h-16 w-12 sm:w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No results found</h3>
      <p className="mt-1 text-sm">Try adjusting your search or filter to find what you're looking for.</p>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onClearFilters}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Clear Filters
        </button>
        <button
          onClick={onCreate}
          disabled={atLimit}
          className={
            'w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors ' +
            (atLimit ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')
          }
        >
          Create New Invoice
        </button>
      </div>
    </div>
  );
}