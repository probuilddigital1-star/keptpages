import { logError, logInfo } from '../utils/errorHandler';
import { useState, useRef, useEffect } from 'react';
import PageShell from '../components/PageShell';
import { listClients, upsertClient, deleteClient, genClientId } from '../store/clients';
import { limits } from '../store/subscription';
import { toCSV, fromCSV, downloadCSV } from '../utils/csv';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { ClientCardSkeleton } from '../components/ui/Skeleton';
import Tooltip, { IconButton } from '../components/ui/Tooltip';
import { validateEmail, validateText, validateClient, sanitizeObject } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import clientsService from '../services/clientsService';

export default function ClientsPage({ onBack, onSelect, onUpgrade }) {
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

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const clients = await listClients();
      setRows(clients);
    } catch (error) {
      showToast('Failed to load clients', 'error');
    } finally {
      setLoading(false);
    }
  }

  const count = rows.length;
  const atLimit = Number.isFinite(cap.clients) && count >= cap.clients;

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

    // Validate client data
    const validation = validateClient(row);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showToast(firstError, 'error');
      return;
    }

    setSaving(prev => ({ ...prev, [id]: true }));

    try {
      // Check limit for new clients
      if (!rows.find(r => r.id === id)) {
        const canAdd = await clientsService.canAddClient(userProfile);
        if (!canAdd) {
          showToast(`Client limit reached (${cap.clients} max for your plan)`, 'error');
          setSaving(prev => ({ ...prev, [id]: false }));
          return;
        }
      }

      // Sanitize and save
      const sanitized = sanitizeObject(row);
      await upsertClient(sanitized);

      // Reload clients
      await loadClients();

      // Clear editing state
      cancelEditing(id);
      showToast('Client saved', 'success');
    } catch (error) {
      showToast('Failed to save client', 'error');
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  }

  async function remove(id) {
    const client = rows.find(r => r.id === id);
    setConfirmDelete({ open: true, id, name: client?.name || '' });
  }

  async function handleConfirmDelete() {
    if (confirmDelete.id) {
      setLoading(true);
      try {
        await deleteClient(confirmDelete.id);
        await loadClients();
        showToast('Client deleted', 'success');
      } catch (error) {
        showToast('Failed to delete client', 'error');
      } finally {
        setLoading(false);
      }
    }
    setConfirmDelete({ open: false, id: null, name: '' });
  }

  function exportClients() {
    const headers = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { key: 'terms', label: 'Payment Terms' }
    ];
    const csvText = toCSV(rows, headers);
    downloadCSV(csvText, `clients_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Clients exported successfully', 'success');
  }

  async function importClients(event) {
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
        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
        const emailIdx = headers.findIndex(h => h.toLowerCase().includes('email'));
        const addressIdx = headers.findIndex(h => h.toLowerCase().includes('address'));
        const termsIdx = headers.findIndex(h => h.toLowerCase().includes('term'));

        if (nameIdx === -1) {
          showToast('CSV must have a Name column', 'error');
          return;
        }

        let imported = 0;
        let errors = 0;

        for (let i = 1; i < parsed.length; i++) {
          const row = parsed[i];
          const client = {
            id: genClientId(),
            name: row[nameIdx] || '',
            email: emailIdx >= 0 ? row[emailIdx] : '',
            address: addressIdx >= 0 ? row[addressIdx] : '',
            terms: termsIdx >= 0 ? row[termsIdx] : 'Net 30'
          };

          const validation = validateClient(client);
          if (validation.isValid) {
            const canAdd = await clientsService.canAddClient(userProfile);
            if (!canAdd) {
              showToast(`Import stopped: Client limit reached (${cap.clients} max)`, 'warning');
              break;
            }

            try {
              const sanitized = sanitizeObject(client);
              await upsertClient(sanitized);
              imported++;
            } catch (error) {
              errors++;
            }
          } else {
            errors++;
          }
        }

        await loadClients();

        if (imported > 0) {
          showToast(`Imported ${imported} clients${errors > 0 ? ` (${errors} errors)` : ''}`, 'success');
        } else {
          showToast('No valid clients to import', 'error');
        }
      } catch (error) {
        logError('[Clients] Import failed', error);
        showToast('Import failed', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  }

  async function addNewClient() {
    // Check limit before adding
    const canAdd = await clientsService.canAddClient(userProfile);
    if (!canAdd) {
      showToast(`Client limit reached (${cap.clients} max for your plan)`, 'error');
      return;
    }

    const id = genClientId();
    const newClient = { id, name: '', email: '', address: '', terms: 'Net 30' };

    // Add to rows immediately for UI
    setRows(prev => [...prev, newClient]);

    // Start editing the new client
    startEditing(newClient);
  }

  return (
    <PageShell
      title="Clients"
      onClose={onBack}
      actions={
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={exportClients}
            className="btn-secondary px-2 sm:px-3 py-1.5 text-sm flex items-center gap-1"
            disabled={rows.length === 0}
            aria-label="Export clients"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary px-2 sm:px-3 py-1.5 text-sm flex items-center gap-1"
            aria-label="Import clients"
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
            onChange={importClients}
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
              You've reached the {cap.clients} client limit for your plan.{' '}
              <button onClick={onUpgrade} className="underline font-medium">
                Upgrade to add more
              </button>
            </p>
          </div>
        )}

        {/* Add new client button */}
        {!atLimit && (
          <button
            onClick={addNewClient}
            className="mb-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Client
          </button>
        )}

        {/* Clients list */}
        <div className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <ClientCardSkeleton key={i} />
            ))
          ) : rows.length > 0 ? (
            rows.map(row => {
              const isEditing = !!editingRows[row.id];
              const editingRow = editingRows[row.id] || row;
              const isSaving = saving[row.id];

              return (
                <div key={row.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                      <input
                        value={isEditing ? editingRow.name : row.name || ''}
                        onChange={(e) => updateEditingRow(row.id, 'name', e.target.value)}
                        placeholder="Client name"
                        disabled={!isEditing}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
                      <input
                        value={isEditing ? editingRow.email : row.email || ''}
                        onChange={(e) => updateEditingRow(row.id, 'email', e.target.value)}
                        placeholder="email@example.com"
                        type="email"
                        disabled={!isEditing}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Address</label>
                      <input
                        value={isEditing ? editingRow.address : row.address || ''}
                        onChange={(e) => updateEditingRow(row.id, 'address', e.target.value)}
                        placeholder="Client address"
                        disabled={!isEditing}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Terms</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={isEditing ? editingRow.terms : row.terms || 'Net 30'}
                          onChange={(e) => updateEditingRow(row.id, 'terms', e.target.value)}
                          disabled={!isEditing}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                        >
                          <option>Due on receipt</option>
                          <option>Net 15</option>
                          <option>Net 30</option>
                          <option>Net 45</option>
                          <option>Net 60</option>
                          <option>Net 90</option>
                        </select>

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Tooltip content="Save">
                                <button
                                  onClick={() => save(row.id)}
                                  disabled={isSaving}
                                  className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
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
                              </Tooltip>
                              <Tooltip content="Cancel">
                                <button
                                  onClick={() => cancelEditing(row.id)}
                                  disabled={isSaving}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip content="Edit">
                                <button
                                  onClick={() => startEditing(row)}
                                  className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </Tooltip>
                              <Tooltip content="Delete">
                                <button
                                  onClick={() => remove(row.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </Tooltip>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No clients yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first client to get started</p>
              <button
                onClick={addNewClient}
                className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                Add Your First Client
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={confirmDelete.open}
          onClose={() => setConfirmDelete({ open: false, id: null, name: '' })}
          onConfirm={handleConfirmDelete}
          title="Delete Client"
          message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
        />
      </div>
    </PageShell>
  );
}