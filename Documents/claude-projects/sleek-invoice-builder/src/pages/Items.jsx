import { logError, logInfo } from '../utils/errorHandler';
import { useState, useRef, useEffect } from 'react';
import PageShell from '../components/PageShell';
import { listItems, upsertItem, deleteItem, genItemId } from '../store/items';
import { limits } from '../store/subscription';
import { toCSV, fromCSV, downloadCSV } from '../utils/csv';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { validateText, validateAmount, sanitizeObject } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import itemsService from '../services/itemsService';

export default function ItemsPage({ onBack, onSelect, onUpgrade }) {
  const cap = limits();
  const [rows, setRows] = useState([]);
  const [editingRows, setEditingRows] = useState({}); // Local state for editing
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');
  const fileInputRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const { userProfile } = useAuth();

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const items = await listItems();
      setRows(items);
    } catch (error) {
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }

  const count = rows.length;
  const atLimit = Number.isFinite(cap.items) && count >= cap.items;

  function showToast(message, type = 'info') {
    setToastMsg(message);
    setToastType(type);
  }

  function startEditing(row) {
    setEditingRows(prev => ({
      ...prev,
      [row.id]: { ...row }
    }));
  }

  function cancelEditing(id) {
    setEditingRows(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateEditingRow(id, field, value) {
    setEditingRows(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  }

  async function save(id) {
    const row = editingRows[id];
    if (!row) return;

    // Validate item data
    const titleResult = validateText(row.title, { required: true, minLength: 1, maxLength: 200 });
    if (!titleResult.isValid) {
      showToast(titleResult.error, 'error');
      return;
    }

    const rateResult = validateAmount(row.rate, { min: 0 });
    if (!rateResult.isValid) {
      showToast(rateResult.error, 'error');
      return;
    }

    const descResult = validateText(row.description, { maxLength: 500 });
    if (!descResult.isValid) {
      showToast(descResult.error, 'error');
      return;
    }

    setSaving(prev => ({ ...prev, [id]: true }));

    try {
      // Check limit for new items
      if (!rows.find(r => r.id === id)) {
        const canAdd = await itemsService.canAddItem(userProfile);
        if (!canAdd) {
          showToast(`Item limit reached (${cap.items} max for your plan)`, 'error');
          setSaving(prev => ({ ...prev, [id]: false }));
          return;
        }
      }

      // Sanitize and save
      const sanitized = sanitizeObject(row);
      await upsertItem(sanitized);

      // Reload items
      await loadItems();

      // Clear editing state
      cancelEditing(id);
      showToast('Item saved', 'success');
    } catch (error) {
      showToast('Failed to save item', 'error');
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  }

  async function remove(id) {
    const item = rows.find(r => r.id === id);
    setConfirmDelete({ open: true, id, name: item?.title || '' });
  }

  async function handleConfirmDelete() {
    if (confirmDelete.id) {
      setLoading(true);
      try {
        await deleteItem(confirmDelete.id);
        await loadItems();
        showToast('Item deleted', 'success');
      } catch (error) {
        showToast('Failed to delete item', 'error');
      } finally {
        setLoading(false);
      }
    }
    setConfirmDelete({ open: false, id: null, name: '' });
  }

  function exportItems() {
    const headers = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'rate', label: 'Rate' }
    ];
    const csvText = toCSV(rows, headers);
    downloadCSV(csvText, `items_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Items exported successfully', 'success');
  }

  async function importItems(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;

        const parsed = fromCSV(text);
        if (parsed.length < 2) {
          showToast('CSV file appears to be empty', 'error');
          return;
        }

        const headers = parsed[0];
        const titleIdx = headers.findIndex(h => h.toLowerCase().includes('title') || h.toLowerCase().includes('name'));
        const descIdx = headers.findIndex(h => h.toLowerCase().includes('desc'));
        const rateIdx = headers.findIndex(h => h.toLowerCase().includes('rate') || h.toLowerCase().includes('price'));

        if (titleIdx === -1) {
          showToast('CSV must have a Title or Name column', 'error');
          return;
        }

        let imported = 0;
        let errors = 0;

        for (let i = 1; i < parsed.length; i++) {
          const row = parsed[i];
          const item = {
            id: genItemId(),
            title: row[titleIdx] || '',
            description: descIdx >= 0 ? row[descIdx] : '',
            rate: rateIdx >= 0 ? parseFloat(row[rateIdx]) || 0 : 0
          };

          // Validate
          const titleResult = validateText(item.title, { required: true });
          const rateResult = validateAmount(item.rate, { min: 0 });

          if (titleResult.isValid && rateResult.isValid) {
            const canAdd = await itemsService.canAddItem(userProfile);
            if (!canAdd) {
              showToast(`Import stopped: Item limit reached (${cap.items} max)`, 'warning');
              break;
            }

            try {
              const sanitized = sanitizeObject(item);
              await upsertItem(sanitized);
              imported++;
            } catch (error) {
              errors++;
            }
          } else {
            errors++;
          }
        }

        await loadItems();

        if (imported > 0) {
          showToast(`Imported ${imported} items${errors > 0 ? ` (${errors} errors)` : ''}`, 'success');
        } else {
          showToast('No valid items to import', 'error');
        }
      } catch (error) {
        logError('[Items] Import failed', error);
        showToast('Import failed', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  }

  async function addNewItem() {
    // Check limit before adding
    const canAdd = await itemsService.canAddItem(userProfile);
    if (!canAdd) {
      showToast(`Item limit reached (${cap.items} max for your plan)`, 'error');
      return;
    }

    const id = genItemId();
    const newItem = { id, title: '', description: '', rate: 0 };

    // Add to rows immediately for UI
    setRows(prev => [...prev, newItem]);

    // Start editing the new item
    startEditing(newItem);
  }

  return (
    <PageShell
      title="Products & Services"
      onClose={onBack}
      actions={
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={exportItems}
            className="btn-secondary px-2 sm:px-3 py-1.5 text-sm flex items-center gap-1"
            disabled={rows.length === 0}
            aria-label="Export items"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary px-2 sm:px-3 py-1.5 text-sm flex items-center gap-1"
            aria-label="Import items"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={importItems}
            className="hidden"
          />
        </div>
      }
    >
      <div className="max-w-4xl mx-auto">
        {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />}

        {atLimit && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You've reached the {cap.items} item limit for your plan.{' '}
              <button onClick={onUpgrade} className="underline font-medium">
                Upgrade to add more
              </button>
            </p>
          </div>
        )}

        {/* Add new item button */}
        {!atLimit && (
          <button
            onClick={addNewItem}
            className="mb-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Item
          </button>
        )}

        {/* Items list */}
        <div className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))
          ) : rows.length > 0 ? (
            rows.map(row => {
              const isEditing = !!editingRows[row.id];
              const editingRow = editingRows[row.id] || row;
              const isSaving = saving[row.id];

              return (
                <div key={row.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Title</label>
                      <input
                        value={isEditing ? editingRow.title : row.title || ''}
                        onChange={(e) => updateEditingRow(row.id, 'title', e.target.value)}
                        placeholder="Item name"
                        disabled={!isEditing}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
                      <input
                        value={isEditing ? editingRow.description : row.description || ''}
                        onChange={(e) => updateEditingRow(row.id, 'description', e.target.value)}
                        placeholder="Optional description"
                        disabled={!isEditing}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Rate</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={isEditing ? editingRow.rate : row.rate || 0}
                          onChange={(e) => updateEditingRow(row.id, 'rate', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          disabled={!isEditing}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                        />

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => save(row.id)}
                                disabled={isSaving}
                                className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                {isSaving ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={() => cancelEditing(row.id)}
                                disabled={isSaving}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(row)}
                                className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => remove(row.id)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No items yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first product or service</p>
              <button
                onClick={addNewItem}
                className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                Add Your First Item
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={confirmDelete.open}
          onClose={() => setConfirmDelete({ open: false, id: null, name: '' })}
          onConfirm={handleConfirmDelete}
          title="Delete Item"
          message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
        />
      </div>
    </PageShell>
  );
}