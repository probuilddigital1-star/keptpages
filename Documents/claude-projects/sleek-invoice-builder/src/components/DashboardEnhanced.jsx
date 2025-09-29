import React, { useMemo, useState, useEffect } from 'react';
import { currency } from '../utils/format';
import { getInvoicesRemaining, getSubscription, getInvoiceCountThisMonth, FREE_INVOICE_LIMIT } from '../store/subscription';
import Skeleton, { InvoiceCardSkeleton } from './ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';

function DashboardEnhanced({ invoices = [], onCreate, onOpenInvoice, onUpgrade }) {
  const { userProfile } = useAuth();
  const subscription = getSubscription();
  const [invoicesUsed, setInvoicesUsed] = useState(0);
  const [invoicesRemaining, setInvoicesRemaining] = useState(10);
  const [loading, setLoading] = useState(true);

  // Update counts when userProfile changes or component mounts
  useEffect(() => {
    const updateCounts = () => {
      const used = getInvoiceCountThisMonth();
      const remaining = getInvoicesRemaining();
      setInvoicesUsed(used);
      setInvoicesRemaining(remaining);
      console.log('[DashboardEnhanced] Updated counts:', { used, remaining, limit: FREE_INVOICE_LIMIT });
    };

    updateCounts();

    // Listen for focus events (when returning from invoice creation)
    const handleFocus = () => {
      updateCounts();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', updateCounts);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', updateCounts);
    };
  }, [userProfile]); // Re-run when userProfile changes

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = invoices.filter(inv => {
      const date = new Date(inv.created_at || inv.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const paid = invoices.filter(inv => inv.status === 'paid');
    const pending = invoices.filter(inv => inv.status === 'sent');
    const overdue = invoices.filter(inv => {
      if (inv.status === 'paid') return false;
      const due = inv.dueDate ? new Date(inv.dueDate) : null;
      return due && due < now;
    });

    const totalRevenue = paid.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const pendingRevenue = pending.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate growth
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthInvoices = invoices.filter(inv => {
      const date = new Date(inv.created_at || inv.date);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    });
    const lastMonthRevenue = lastMonthInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const growthPercent = lastMonthRevenue > 0
      ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    return {
      thisMonth: thisMonth.length,
      totalRevenue,
      pendingRevenue,
      overdue: overdue.length,
      growthPercent,
      recentInvoices: invoices.slice(0, 5)
    };
  }, [invoices]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="dashboard-enhanced">
      {/* Header Section */}
      <div className="dashboard-header">
        <h1 className="dashboard-welcome">{getGreeting()}</h1>
        <p className="dashboard-subtitle">Here's your business overview</p>
      </div>

      {/* Stats Grid - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stats-card-enhanced">
                <Skeleton variant="avatar" className="mb-3" />
                <Skeleton width="60%" className="mb-2" />
                <Skeleton variant="title" width="80%" />
              </div>
            ))}
          </>
        ) : (
          <>
        {/* Total Revenue */}
        <div className="stats-card-enhanced success">
          <div className="stats-icon-wrapper success">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="stats-label-enhanced text-xs sm:text-sm">Total Revenue</p>
          <p className="stats-value-enhanced text-lg sm:text-2xl">{currency(stats.totalRevenue)}</p>
          {stats.growthPercent !== 0 && (
            <span className={`stats-change ${stats.growthPercent > 0 ? 'positive' : 'negative'}`}>
              {stats.growthPercent > 0 ? '↑' : '↓'} {Math.abs(stats.growthPercent)}%
            </span>
          )}
        </div>

        {/* Pending Revenue */}
        <div className="stats-card-enhanced warning">
          <div className="stats-icon-wrapper warning">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="stats-label-enhanced text-xs sm:text-sm">Pending</p>
          <p className="stats-value-enhanced text-lg sm:text-2xl">{currency(stats.pendingRevenue)}</p>
        </div>

        {/* This Month */}
        <div className="stats-card-enhanced primary">
          <div className="stats-icon-wrapper primary">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="stats-label-enhanced text-xs sm:text-sm">This Month</p>
          <p className="stats-value-enhanced text-lg sm:text-2xl">{stats.thisMonth}</p>
          {subscription.tier === 'free' && (
            <span className="text-xs text-gray-700 dark:text-gray-300 mt-2 block">
              {invoicesUsed} out of {FREE_INVOICE_LIMIT} invoices
            </span>
          )}
          {subscription.tier === 'starter' && (
            <span className="text-xs text-gray-700 dark:text-gray-300 mt-2 block">
              {invoicesUsed} out of 50 invoices
            </span>
          )}
        </div>

        {/* Overdue */}
        <div className={`stats-card-enhanced ${stats.overdue > 0 ? 'danger' : ''}`}>
          <div className={`stats-icon-wrapper ${stats.overdue > 0 ? 'danger' : 'primary'}`}>
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="stats-label-enhanced text-xs sm:text-sm">Overdue</p>
          <p className="stats-value-enhanced text-lg sm:text-2xl">{stats.overdue}</p>
        </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      {subscription.tier === 'free' && invoicesUsed >= 5 && invoicesRemaining > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  {invoicesUsed} out of {FREE_INVOICE_LIMIT} invoices used
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Upgrade to Starter for 50 invoices/month
                </p>
              </div>
            </div>
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Recent Invoices Section */}
      <div className="pro-card">
        <div className="pro-card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Invoices</h2>
          <button
            onClick={onCreate}
            className="btn-pro btn-pro-primary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </button>
        </div>
        <div className="pro-card-body">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <InvoiceCardSkeleton key={i} />
              ))}
            </div>
          ) : stats.recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {stats.recentInvoices.map(invoice => (
                <div
                  key={invoice.id}
                  onClick={() => onOpenInvoice(invoice)}
                  className={`invoice-card-enhanced status-${invoice.status?.toLowerCase() || 'draft'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          #{invoice.number || invoice.id.slice(-6).toUpperCase()}
                        </span>
                        <span className={`invoice-status-badge ${invoice.status?.toLowerCase() || 'draft'}`}>
                          <span className="status-dot" />
                          {invoice.status || 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {invoice.client_name || 'No client'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(invoice.created_at || invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {currency(invoice.total || 0)}
                      </p>
                      {invoice.dueDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-enhanced">
              <div className="empty-state-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="empty-state-title">No invoices yet</h3>
              <p className="empty-state-description">
                Create your first invoice and start getting paid faster
              </p>
              <button
                onClick={onCreate}
                className="btn-pro btn-pro-primary"
              >
                Create Your First Invoice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardEnhanced;