import { useEffect, useMemo, useState, useRef } from 'react';
import { listInvoices, deleteInvoice, setInvoiceStatus, isOverdue } from '../store/invoices';
import { currency, formatDate } from '../utils/format';
import { buildCSVDownload } from '../utils/csv';
import AnalyticsSimple from '../components/AnalyticsSimple';
import DashboardEnhanced from '../components/DashboardEnhanced';
import Toast from '../components/Toast';
import SleekLogo from '../components/SleekLogo';
import ThemeToggle from '../components/ThemeToggle';
import ConfirmDialog from '../components/ConfirmDialog';
import { shouldShowKeyboardShortcuts } from '../utils/deviceDetection';
import Skeleton from '../components/ui/Skeleton';
import Tooltip from '../components/ui/Tooltip';
import { highlightSearchTerm } from '../utils/searchHighlight';

const FILTERS = ['All','Draft','Sent','Paid','Overdue'];

export default function Dashboard({ onCreate, onOpenInvoice, onOpenSettings, onOpenClients, onOpenItems, onUpgrade, onSignOut, user }) {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({ from: '', to: '', field: 'date' });
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');
  const [undoBuffer, setUndoBuffer] = useState(null);
  const undoTimerRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, type: 'single' });
  const [animatedRow, setAnimatedRow] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  // Load invoices async
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const data = await listInvoices();
        setInvoices(data);
        setInvoicesLoading(false);
      } catch (error) {
        // console.warn('Error loading invoices:', error);
        setInvoices([]);
        setInvoicesLoading(false);
      }
    };
    loadInvoices();

    // Refresh periodically
    const id = setInterval(loadInvoices, 2000);
    return () => clearInterval(id);
  }, []);

  // Simulate analytics loading
  useEffect(() => {
    const timer = setTimeout(() => setAnalyticsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts (desktop only)
  useEffect(() => {
    // Only add keyboard shortcuts on devices with keyboards
    if (!shouldShowKeyboardShortcuts()) return;

    const handleKeyDown = (e) => {
      // Ctrl/Cmd + N: Create new invoice
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        onCreate();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCreate]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    // Filter paid invoices from last 6 months
    const paidInvoices = invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.paidAt) return false;
      const paidDate = new Date(inv.paidAt);
      return paidDate >= sixMonthsAgo;
    });

    // Group by month
    const monthlyRevenue = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyRevenue[key] = { label, value: 0 };
    }

    // Aggregate revenue
    paidInvoices.forEach(inv => {
      const paidDate = new Date(inv.paidAt);
      const key = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyRevenue[key]) {
        monthlyRevenue[key].value += Number(inv.total || 0);
      }
    });

    const series = Object.values(monthlyRevenue);

    // Top clients
    const clientRevenue = {};
    paidInvoices.forEach(inv => {
      const client = inv.client_name || inv.client || 'Unknown';
      clientRevenue[client] = (clientRevenue[client] || 0) + Number(inv.total || 0);
    });

    const topClients = Object.entries(clientRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    return { series, topClients };
  }, [invoices]);

  const counts = useMemo(() => {
    const c = { All: invoices.length, Draft: 0, Sent: 0, Paid: 0, Overdue: 0 };
    for (const inv of invoices) {
      if (inv.status === 'paid') c.Paid++;
      else if (inv.status === 'sent') c.Sent++;
      else c.Draft++;
      if (isOverdue(inv)) c.Overdue++;
    }
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    let rows = invoices;
    if (filter === 'Draft') rows = rows.filter(x => (x.status || 'draft') === 'draft');
    if (filter === 'Sent') rows = rows.filter(x => x.status === 'sent');
    if (filter === 'Paid') rows = rows.filter(x => x.status === 'paid');
    if (filter === 'Overdue') rows = rows.filter(x => isOverdue(x));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      rows = rows.filter(x =>
        (x.client || x.client_name || '').toLowerCase().includes(s) ||
        (x.number || '').toLowerCase().includes(s) ||
        String(x.total || '').toLowerCase().includes(s)
      );
    }
    return rows;
  }, [invoices, filter, q]);

  function toggleSelectMode() {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedIds(new Set());
    }
  }

  function toggleSelect(id) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function selectAll() {
    const allIds = new Set(filtered.map(inv => inv.id));
    setSelectedIds(allIds);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function getSelectedInvoices() {
    return filtered.filter(inv => selectedIds.has(inv.id));
  }

  function doDelete(id) {
    setConfirmDelete({ open: true, id, type: 'single' });
  }

  async function handleConfirmDelete() {
    if (confirmDelete.type === 'single' && confirmDelete.id) {
      await deleteInvoice(confirmDelete.id);
      const updated = await listInvoices();
      setInvoices(updated);
      showToast('Invoice deleted', 'success');
    } else if (confirmDelete.type === 'bulk') {
      await performBulkDelete();
    }
    setConfirmDelete({ open: false, id: null, type: 'single' });
  }

  function bulkDelete() {
    const selected = getSelectedInvoices();
    if (selected.length === 0) return;

    setConfirmDelete({ open: true, id: null, type: 'bulk', count: selected.length });
  }

  async function performBulkDelete() {
    const selected = getSelectedInvoices();

    // Save to undo buffer
    setUndoBuffer(selected);

    // Delete all selected
    await Promise.all(selected.map(inv => deleteInvoice(inv.id)));

    const updated = await listInvoices();
    setInvoices(updated);
    setSelectedIds(new Set());
    showToast(`Deleted ${selected.length} invoice${selected.length > 1 ? 's' : ''}`, 'success');

    // Clear undo buffer after 10 seconds
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoBuffer(null);
    }, 10000);
  }

  function undoDelete() {
    if (!undoBuffer || undoBuffer.length === 0) return;
    
    // Restore all invoices from buffer
    const allInvoices = listInvoices();
    undoBuffer.forEach(inv => {
      // Check if not already restored
      if (!allInvoices.find(x => x.id === inv.id)) {
        allInvoices.push(inv);
      }
    });
    
    // Save and update
    localStorage.setItem('sleek_invoices_v1', JSON.stringify(allInvoices));
    setInvoices(allInvoices);
    setUndoBuffer(null);
    
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    
    showToast(`Restored ${undoBuffer.length} invoice${undoBuffer.length > 1 ? 's' : ''}`, 'success');
  }
  
  async function markSent(id) {
    await setInvoiceStatus(id, 'sent');
    const updated = await listInvoices();
    setInvoices(updated);
    // Animate the row
    setAnimatedRow(id);
    setTimeout(() => setAnimatedRow(null), 800);
    showToast('Invoice marked as sent', 'success');
  }

  async function markPaid(id) {
    const paidAt = new Date().toISOString();
    await setInvoiceStatus(id, 'paid', { paidAt });
    const updated = await listInvoices();
    setInvoices(updated);
    // Animate the row
    setAnimatedRow(id);
    setTimeout(() => setAnimatedRow(null), 800);
    showToast('Invoice marked as paid', 'success');
  }

  async function bulkMarkSent() {
    const selected = getSelectedInvoices();
    await Promise.all(selected.map(inv => setInvoiceStatus(inv.id, 'sent')));
    const updated = await listInvoices();
    setInvoices(updated);
    showToast(`Marked ${selected.length} invoice${selected.length > 1 ? 's' : ''} as sent`, 'success');
    clearSelection();
  }

  async function bulkMarkPaid() {
    const selected = getSelectedInvoices();
    const paidAt = new Date().toISOString();
    await Promise.all(selected.map(inv => setInvoiceStatus(inv.id, 'paid', { paidAt })));
    const updated = await listInvoices();
    setInvoices(updated);
    showToast(`Marked ${selected.length} invoice${selected.length > 1 ? 's' : ''} as paid`, 'success');
    clearSelection();
  }

  function exportSelectedToCSV() {
    const selected = getSelectedInvoices();
    if (selected.length === 0) return;
    
    const headers = [
      { key: 'number', label: 'Number' },
      { key: 'client_name', label: 'Client' },
      { key: 'client_email', label: 'Email' },
      { key: 'date', label: 'Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'status', label: 'Status' },
      { key: 'total', label: 'Total' },
      { key: 'sentAt', label: 'Sent At' },
      { key: 'paidAt', label: 'Paid At' }
    ];
    
    const rows = selected.map(inv => ({
      ...inv,
      client_name: inv.client_name || inv.client || '',
      client_email: inv.client_email || ''
    }));
    
    buildCSVDownload(`invoices_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast(`Exported ${selected.length} invoice${selected.length > 1 ? 's' : ''}`, 'success');
  }

  function exportDateRangeToCSV() {
    const { from, to, field } = exportDateRange;
    if (!from || !to) {
      showToast('Please select both from and to dates', 'error');
      return;
    }
    
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    
    const filtered = invoices.filter(inv => {
      const dateValue = inv[field];
      if (!dateValue) return false;
      const invDate = new Date(dateValue);
      return invDate >= fromDate && invDate <= toDate;
    });
    
    if (filtered.length === 0) {
      showToast('No invoices found in the selected date range', 'warning');
      return;
    }
    
    const headers = [
      { key: 'number', label: 'Number' },
      { key: 'client_name', label: 'Client' },
      { key: 'client_email', label: 'Email' },
      { key: 'date', label: 'Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'status', label: 'Status' },
      { key: 'total', label: 'Total' },
      { key: 'sentAt', label: 'Sent At' },
      { key: 'paidAt', label: 'Paid At' }
    ];
    
    const rows = filtered.map(inv => ({
      ...inv,
      client_name: inv.client_name || inv.client || '',
      client_email: inv.client_email || ''
    }));
    
    buildCSVDownload(`invoices_${from}_to_${to}.csv`, headers, rows);
    showToast(`Exported ${filtered.length} invoice${filtered.length > 1 ? 's' : ''}`, 'success');
    setShowExportDialog(false);
  }

  function showToast(message, type = 'info') {
    setToastMsg(message);
    setToastType(type);
  }

  const isDark = document.documentElement.classList.contains('dark');
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile-Optimized Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <SleekLogo showText={true} size="small" />

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={onCreate}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden lg:inline">New Invoice</span>
                {shouldShowKeyboardShortcuts() && (
                  <span className="hidden xl:inline text-xs opacity-60 ml-1">(Ctrl+N)</span>
                )}
              </button>
              <Tooltip content="Export invoices to CSV" position="bottom">
                <button
                  onClick={() => setShowExportDialog(true)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Export invoices"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </Tooltip>

              <ThemeToggle />
              {/* User Menu */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden lg:inline text-sm">{user.email}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
                      </div>
                      {onSignOut && (
                        <button
                          onClick={onSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <Tooltip content="Export invoices to CSV" position="bottom">
                <button
                  onClick={() => setShowExportDialog(true)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Export invoices"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </Tooltip>
              <ThemeToggle />
              {/* User Menu for Mobile */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
                      </div>
                      {onSignOut && (
                        <button
                          onClick={onSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 pb-20 md:pb-8 max-w-7xl mx-auto">
        {/* Enhanced Dashboard View */}
        <DashboardEnhanced
          invoices={invoices}
          onCreate={onCreate}
          onOpenInvoice={onOpenInvoice}
          onUpgrade={onUpgrade}
        />

        {/* Analytics Section */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <h2 className="text-lg font-semibold mb-3">Last 6 Months Revenue</h2>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              {analyticsLoading ? (
                <div className="space-y-4 p-4">
                  <Skeleton height="20px" width="100%" />
                  <Skeleton height="200px" width="100%" />
                  <div className="flex justify-between">
                    <Skeleton height="15px" width="50px" />
                    <Skeleton height="15px" width="50px" />
                    <Skeleton height="15px" width="50px" />
                  </div>
                </div>
              ) : (
              <AnalyticsSimple
                series={analyticsData.series}
                width={450}
                height={280}
                type="bar"
                isDark={isDark}
              />
              )}
            </div>
            {analyticsData.series.every(item => item.value === 0) && (
              <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Tip: Mark invoices as "Paid" to track revenue here
                </p>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-3">Top Clients</h2>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              {analyticsData.topClients.length > 0 ? (
                <div className="space-y-2">
                  {analyticsData.topClients.map((client, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {idx + 1}. {client.name}
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        {currency(client.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No paid invoices yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Select Mode */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={toggleSelectMode}
            className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
              selectMode 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            {selectMode ? 'Exit Select' : 'Select'}
          </button>
          
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                'px-3 py-1.5 rounded-full border text-sm transition-colors ' +
                (filter === f 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800')
              }
            >
              {f}{' '}
              <span className="ml-1 text-xs opacity-80">({counts[f] || 0})</span>
            </button>
          ))}
          <div className="ml-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Selection Toolbar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="sticky top-0 z-10 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {selectedIds.size} selected
                </span>
                <button 
                  onClick={selectAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <button 
                  onClick={clearSelection}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={bulkMarkSent}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Mark Sent
                </button>
                <button 
                  onClick={bulkMarkPaid}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Mark Paid
                </button>
                <button 
                  onClick={exportSelectedToCSV}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Export CSV
                </button>
                <button 
                  onClick={bulkDelete}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="grid gap-3">
          {filtered.map(inv => {
            const s = inv.status || 'draft';
            const overdue = isOverdue(inv);
            const isSelected = selectedIds.has(inv.id);
            
            return (
              <div
                key={inv.id}
                className={`rounded-xl border ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'} p-4 transition-colors ${animatedRow === inv.id ? 'highlight-success' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  {selectMode && (
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(inv.id)}
                      className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                  )}
                  <div onClick={() => !selectMode && onOpenInvoice(inv)} className="flex-1 cursor-pointer">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {q ? highlightSearchTerm(inv.client || inv.client_name || 'Untitled', q) : (inv.client || inv.client_name || 'Untitled')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {q && (inv.clientEmail || inv.client_email) ? highlightSearchTerm(inv.clientEmail || inv.client_email || '', q) : (inv.clientEmail || inv.client_email || '')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      #{q && inv.number ? highlightSearchTerm(inv.number || '', q) : (inv.number || '')}
                      {inv.date ? ` • ${formatDate(inv.date)}` : ''}
                      {inv.dueDate ? ` • Due ${formatDate(inv.dueDate)}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {currency(inv.total || 0)}
                    </div>
                    <div className="mt-1">
                      <span className={
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                        (s === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                         s === 'sent' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                         overdue ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                         'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')
                      }>
                        {overdue ? 'Overdue' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!selectMode && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button 
                      onClick={() => onOpenInvoice(inv)} 
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      Open
                    </button>
                    {s !== 'sent' && s !== 'paid' && (
                      <button 
                        onClick={() => markSent(inv.id)} 
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        Mark Sent
                      </button>
                    )}
                    {s !== 'paid' && (
                      <button 
                        onClick={() => markPaid(inv.id)} 
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button 
                      onClick={() => doDelete(inv.id)} 
                      className="ml-auto px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {filter === 'All' && !q
                  ? 'Start Building Your Business'
                  : 'No Invoices Found'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                {filter === 'All' && !q
                  ? 'Create professional invoices in seconds. Get paid faster with our beautiful, customizable templates.'
                  : `No invoices match the "${filter}" filter. Try selecting a different filter or create a new invoice.`}
              </p>
              {filter === 'All' && !q && (
                <button
                  onClick={onCreate}
                  className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Your First Invoice
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowExportDialog(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Export Invoices</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date Field
                </label>
                <select 
                  value={exportDateRange.field}
                  onChange={(e) => setExportDateRange({...exportDateRange, field: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <option value="date">Invoice Date</option>
                  <option value="paidAt">Paid Date</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input 
                  type="date"
                  value={exportDateRange.from}
                  onChange={(e) => setExportDateRange({...exportDateRange, from: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input 
                  type="date"
                  value={exportDateRange.to}
                  onChange={(e) => setExportDateRange({...exportDateRange, to: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setShowExportDialog(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={exportDateRangeToCSV}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast 
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg('')}
        action={undoBuffer && toastType === 'success' && toastMsg.includes('Deleted') ? {
          label: 'Undo',
          onClick: undoDelete
        } : null}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ open: false, id: null, type: 'single' })}
        title={confirmDelete.type === 'bulk' ? 'Delete Multiple Invoices?' : 'Delete Invoice?'}
        description={
          confirmDelete.type === 'bulk'
            ? `Are you sure you want to delete ${confirmDelete.count} invoice${confirmDelete.count > 1 ? 's' : ''}? This action cannot be undone.`
            : 'Are you sure you want to delete this invoice? This action cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
      />
    </div>
  );
}