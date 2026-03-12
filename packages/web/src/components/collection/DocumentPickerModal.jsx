import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useScanStore } from '@/stores/scanStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { toast } from '@/components/ui/Toast';

const DOC_TYPE_LABELS = {
  recipe: 'Recipe',
  letter: 'Letter',
  journal: 'Journal',
  artwork: 'Artwork',
  document: 'Document',
};

/**
 * Modal that shows the user's scans and lets them pick which ones
 * to add to a collection. Supports multi-select.
 */
export function DocumentPickerModal({ open, onClose, collectionId, collectionName, existingItems = [] }) {
  const navigate = useNavigate();
  const { scans, fetchScans } = useScanStore();
  const { addToCollection } = useDocumentsStore();

  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setAdding(false);
      setLoading(true);
      fetchScans()
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, fetchScans]);

  // Filter out scans already in this collection
  const existingScanIds = useMemo(
    () => new Set(existingItems.map((item) => item.scan?.id || item.id).filter(Boolean)),
    [existingItems],
  );

  const availableScans = useMemo(
    () =>
      scans
        .filter((s) => s.status === 'completed' && !existingScanIds.has(s.id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [scans, existingScanIds],
  );

  function toggleSelect(scanId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId);
      else next.add(scanId);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      const ids = [...selected];
      for (const scanId of ids) {
        await addToCollection(collectionId, scanId);
      }
      toast(`Added ${ids.length} ${ids.length === 1 ? 'document' : 'documents'}`);
      onClose();
    } catch (err) {
      toast(err?.message || 'Failed to add documents', 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Documents" size="md">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : availableScans.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-body text-sm text-walnut-secondary mb-4">
            {scans.length === 0
              ? 'No scans yet. Scan a document to get started.'
              : 'All your scans are already in this collection.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => {
                onClose();
                navigate('/app/scan', { state: { collectionId, collectionName } });
              }}
            >
              Scan New Document
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="font-ui text-sm text-walnut-muted mb-3">
            Select documents to add ({selected.size} selected)
          </p>

          <ul className="space-y-2 max-h-80 overflow-y-auto mb-4">
            {availableScans.map((scan) => {
              const isSelected = selected.has(scan.id);
              return (
                <li key={scan.id}>
                  <button
                    type="button"
                    onClick={() => toggleSelect(scan.id)}
                    disabled={adding}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border transition-all text-left ${
                      isSelected
                        ? 'border-terracotta bg-terracotta-light'
                        : 'border-border hover:border-terracotta/40 hover:bg-cream-alt'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-terracotta border-terracotta'
                          : 'border-border-dark'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Scan info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm font-medium text-walnut truncate">
                        {scan.title || scan.originalFilename || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="muted" size="sm">
                          {DOC_TYPE_LABELS[scan.documentType] || scan.documentType || 'Document'}
                        </Badge>
                        <span className="font-ui text-xs text-walnut-muted">
                          {new Date(scan.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={adding} disabled={selected.size === 0}>
              Add {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
