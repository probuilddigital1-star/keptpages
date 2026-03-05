import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useCollectionsStore } from '@/stores/collectionsStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { toast } from '@/components/ui/Toast';

/**
 * Modal that lets users pick an existing collection or create a new one,
 * then adds a scan to the selected collection.
 */
export function CollectionPickerModal({ open, onClose, scanId }) {
  const { collections, fetchCollections, createCollection, loading: collectionsLoading } = useCollectionsStore();
  const { addToCollection } = useDocumentsStore();

  const [mode, setMode] = useState('pick'); // 'pick' | 'create'
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(null); // collectionId being added to
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCollections().catch(() => {});
      setMode('pick');
      setNewName('');
      setAdding(null);
      setCreating(false);
    }
  }, [open, fetchCollections]);

  async function handlePickCollection(collectionId, collectionName) {
    setAdding(collectionId);
    try {
      await addToCollection(collectionId, scanId);
      toast(`Added to "${collectionName}"`);
      onClose();
    } catch (err) {
      const msg = err?.message || 'Failed to add to collection';
      if (msg.includes('already in')) {
        toast('This scan is already in that collection', 'info');
      } else {
        toast(msg, 'error');
      }
    } finally {
      setAdding(null);
    }
  }

  async function handleCreateAndAdd() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const collection = await createCollection({ name: newName.trim() });
      await addToCollection(collection.id, scanId);
      toast(`Created "${collection.name}" and added scan`);
      onClose();
    } catch (err) {
      const msg = err?.message || 'Failed to create collection';
      toast(msg, 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to Collection" size="sm">
      {mode === 'pick' ? (
        <>
          {collectionsLoading && collections.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : (
            <>
              {/* Existing collections */}
              {collections.length > 0 ? (
                <ul className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {collections.map((col) => (
                    <li key={col.id}>
                      <button
                        type="button"
                        onClick={() => handlePickCollection(col.id, col.name)}
                        disabled={adding !== null}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-md border border-border hover:border-terracotta/40 hover:bg-cream-alt transition-all text-left group"
                      >
                        <div>
                          <p className="font-ui text-sm font-medium text-walnut group-hover:text-terracotta transition-colors">
                            {col.name}
                          </p>
                          <p className="font-ui text-xs text-walnut-muted mt-0.5">
                            {col.itemCount || 0} {col.itemCount === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                        {adding === col.id && <Spinner size="sm" />}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-body text-sm text-walnut-secondary text-center py-4">
                  No collections yet. Create one below.
                </p>
              )}

              {/* Create new */}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setMode('create')}
                disabled={adding !== null}
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create New Collection
              </Button>
            </>
          )}
        </>
      ) : (
        /* Create mode */
        <div className="space-y-4">
          <Input
            label="Collection Name"
            placeholder="e.g., Grandma's Recipes"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            maxLength={100}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) handleCreateAndAdd();
            }}
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setMode('pick')}
              disabled={creating}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateAndAdd}
              loading={creating}
              disabled={!newName.trim()}
            >
              Create & Add
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
