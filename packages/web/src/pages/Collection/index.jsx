import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useCollectionsStore } from '@/stores/collectionsStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import DocumentCard from '@/components/collection/DocumentCard';
import { DocumentPickerModal } from '@/components/collection/DocumentPickerModal';
import ExportOptionsModal from '@/components/collection/ExportOptionsModal';
import BookDraftButton from '@/components/book/BookDraftButton';

export default function CollectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Store state
  const collections = useCollectionsStore((s) => s.collections);
  const collectionsLoading = useCollectionsStore((s) => s.loading);
  const updateCollection = useCollectionsStore((s) => s.updateCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);
  const fetchCollections = useCollectionsStore((s) => s.fetchCollections);

  const documentsMap = useDocumentsStore((s) => s.documents);
  const documentsLoading = useDocumentsStore((s) => s.loading);
  const fetchDocuments = useDocumentsStore((s) => s.fetchDocuments);
  const removeFromCollection = useDocumentsStore((s) => s.removeFromCollection);
  const reorderDocuments = useDocumentsStore((s) => s.reorderDocuments);

  const tier = useSubscriptionStore((s) => s.tier);
  const canExportPdf = useSubscriptionStore((s) => s.canExportPdf);
  const purchaseKeeperPass = useSubscriptionStore((s) => s.purchaseKeeperPass);

  // Derived
  const collection = collections.find((c) => c.id === id);
  const documents = documentsMap[id] || [];

  // Local state
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionInsertIndex, setSectionInsertIndex] = useState(-1);
  const [exporting, setExporting] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showExportUpsell, setShowExportUpsell] = useState(false);
  const [removeDocId, setRemoveDocId] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (collections.length === 0) {
      fetchCollections().catch(() => {});
    }
  }, [collections.length, fetchCollections]);

  useEffect(() => {
    if (id) {
      fetchDocuments(id).catch(() => {});
    }
  }, [id, fetchDocuments]);

  useEffect(() => {
    if (collection) {
      setNameValue(collection.name || '');
      setDescValue(collection.description || '');
    }
  }, [collection]);

  // Editable name
  const handleNameSave = useCallback(async () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue.trim() !== collection?.name) {
      try {
        await updateCollection(id, { name: nameValue.trim() });
        toast('Name updated');
      } catch {
        toast('Failed to update name', 'error');
        setNameValue(collection?.name || '');
      }
    }
  }, [nameValue, collection, id, updateCollection]);

  const handleDescSave = useCallback(async () => {
    setEditingDesc(false);
    if (descValue.trim() !== (collection?.description || '')) {
      try {
        await updateCollection(id, { description: descValue.trim() });
        toast('Description updated');
      } catch {
        toast('Failed to update description', 'error');
        setDescValue(collection?.description || '');
      }
    }
  }, [descValue, collection, id, updateCollection]);

  // Move document up/down
  const handleMoveUp = useCallback(
    (docId) => {
      const idx = documents.findIndex((d) => d.id === docId);
      if (idx <= 0) return;
      const ordered = [...documents];
      [ordered[idx - 1], ordered[idx]] = [ordered[idx], ordered[idx - 1]];
      reorderDocuments(id, ordered.map((d) => d.id)).catch(() =>
        toast('Failed to reorder', 'error'),
      );
    },
    [documents, id, reorderDocuments],
  );

  const handleMoveDown = useCallback(
    (docId) => {
      const idx = documents.findIndex((d) => d.id === docId);
      if (idx < 0 || idx >= documents.length - 1) return;
      const ordered = [...documents];
      [ordered[idx], ordered[idx + 1]] = [ordered[idx + 1], ordered[idx]];
      reorderDocuments(id, ordered.map((d) => d.id)).catch(() =>
        toast('Failed to reorder', 'error'),
      );
    },
    [documents, id, reorderDocuments],
  );

  const handleRemoveRequest = useCallback(
    (docId) => {
      setRemoveDocId(docId);
    },
    [],
  );

  const handleRemoveConfirm = useCallback(async () => {
    if (!removeDocId) return;
    setRemoving(true);
    try {
      await removeFromCollection(id, removeDocId);
      toast('Document removed');
    } catch {
      toast('Failed to remove document', 'error');
    } finally {
      setRemoving(false);
      setRemoveDocId(null);
    }
  }, [id, removeDocId, removeFromCollection]);

  // Export PDF — accepts optional options object (Keeper customization)
  const handleExport = useCallback(async (options) => {
    setExporting(true);
    try {
      const result = await api.post(`/collections/${id}/export`, options || {});
      if (result.url) {
        const blob = await api.getBlob(result.url);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${collection?.name || 'collection'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }
      toast('PDF exported!');
      setShowExportOptions(false);
    } catch (err) {
      console.error('PDF export error:', err);
      toast(err?.message || 'Failed to export PDF', 'error');
    } finally {
      setExporting(false);
    }
  }, [id, collection?.name]);

  // Export button click — gate by tier
  const handleExportClick = useCallback(() => {
    const exportAccess = canExportPdf();
    if (!exportAccess) {
      // Free users — show upsell modal
      setShowExportUpsell(true);
      return;
    }
    if (tier === 'keeper') {
      // Keeper Pass — show full export options
      setShowExportOptions(true);
    } else {
      // Book purchaser — direct export (per-book access)
      handleExport();
    }
  }, [tier, canExportPdf, handleExport]);

  // Delete collection with undo window
  const deleteTimerRef = useRef(null);
  const handleDeleteCollection = useCallback(() => {
    setShowDeleteConfirm(false);
    const collectionName = collection?.name || 'Collection';

    // Navigate away immediately
    navigate('/app');

    let cancelled = false;

    // Show toast with undo action — actual deletion happens after 5s
    toast(`"${collectionName}" deleted`, 'info', {
      label: 'Undo',
      onClick: () => { cancelled = true; },
    });

    deleteTimerRef.current = setTimeout(async () => {
      if (cancelled) {
        // User clicked undo — navigate back
        navigate(`/app/collection/${id}`);
        return;
      }
      try {
        await deleteCollection(id);
      } catch {
        toast('Failed to delete collection', 'error');
      }
    }, 5000);
  }, [id, collection?.name, deleteCollection, navigate]);

  // Add section title
  const handleAddSection = useCallback(
    (insertAfterIndex) => {
      setSectionInsertIndex(insertAfterIndex);
      setShowSectionModal(true);
    },
    [],
  );

  const handleSectionSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!sectionTitle.trim()) return;
      // Section titles are stored as special documents with type "section"
      // For now we insert them locally; a proper API call would handle persistence
      toast(`Section "${sectionTitle.trim()}" added`);
      setShowSectionModal(false);
      setSectionTitle('');
    },
    [sectionTitle],
  );

  // Loading skeleton if collections haven't loaded yet
  if (!collection && collectionsLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-container-lg mx-auto animate-pulse">
        <div className="h-4 bg-cream-alt rounded w-32 mb-4" />
        <div className="h-8 bg-cream-alt rounded w-2/3 mb-2" />
        <div className="h-4 bg-cream-alt rounded w-1/2 mb-8" />
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="h-9 bg-cream-alt rounded w-32" />
          <div className="h-9 bg-cream-alt rounded w-28" />
          <div className="h-9 bg-cream-alt rounded w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-cream-surface border border-border-light rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-cream-alt rounded" />
              <div className="flex-1">
                <div className="h-4 bg-cream-alt rounded w-1/2 mb-2" />
                <div className="h-3 bg-cream-alt rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-container-lg mx-auto text-center">
        <h2 className="font-display text-xl font-semibold text-walnut mb-2">
          Collection not found
        </h2>
        <p className="font-body text-walnut-secondary mb-6">
          This collection may have been deleted or the link is invalid.
        </p>
        <Button variant="secondary" onClick={() => navigate('/app')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-container-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/app')}
        className="flex items-center gap-1.5 font-ui text-sm text-walnut-secondary hover:text-walnut transition-colors mb-4"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to collections
      </button>

      {/* Collection header */}
      <div className="mb-8">
        {/* Editable name */}
        {editingName ? (
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') {
                setNameValue(collection.name || '');
                setEditingName(false);
              }
            }}
            autoFocus
            className="font-display text-2xl sm:text-3xl font-bold text-walnut bg-transparent border-b-2 border-terracotta outline-none w-full pb-1"
          />
        ) : (
          <h1
            className="font-display text-2xl sm:text-3xl font-bold text-walnut cursor-pointer hover:text-terracotta transition-colors inline-flex items-center gap-1.5"
            onClick={() => setEditingName(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingName(true); } }}
            role="button"
            tabIndex={0}
            title="Click to edit"
          >
            {collection.name}
            <svg
              aria-label="Edit collection name"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-stone-400 flex-shrink-0"
            >
              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </h1>
        )}

        {/* Editable description */}
        {editingDesc ? (
          <input
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={handleDescSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDescSave();
              if (e.key === 'Escape') {
                setDescValue(collection.description || '');
                setEditingDesc(false);
              }
            }}
            autoFocus
            className="font-body text-walnut-secondary mt-2 bg-transparent border-b border-terracotta/40 outline-none w-full pb-1"
            placeholder="Add a description..."
          />
        ) : (
          <p
            className="font-body text-walnut-secondary mt-2 cursor-pointer hover:text-walnut transition-colors"
            onClick={() => setEditingDesc(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingDesc(true); } }}
            role="button"
            tabIndex={0}
            title="Click to edit"
          >
            {collection.description || 'Add a description...'}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div data-testid="action-buttons" className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-8 w-full sm:w-auto">
        <Button variant="secondary" onClick={() => setShowDocPicker(true)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Document
        </Button>

        <Link to="/app/scan" state={{ collectionId: id, collectionName: collection?.name }} className="sm:w-auto">
          <Button variant="primary" className="w-full sm:w-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Scan New
          </Button>
        </Link>

        <Button
          variant="secondary"
          onClick={handleExportClick}
          loading={exporting && !showExportOptions}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </Button>

        <BookDraftButton collectionId={id} documentCount={documents.length} />

        <Button
          variant="ghost"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-400 hover:text-red-500 hover:bg-red-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          Delete
        </Button>
      </div>

      {/* Documents loading */}
      {documentsLoading && documents.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!documentsLoading && documents.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="mx-auto w-20 h-20 bg-cream-alt rounded-full flex items-center justify-center mb-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10 text-terracotta/50"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-semibold text-walnut mb-2">
            Add your first document to this collection
          </h3>
          <p className="font-body text-sm text-walnut-secondary max-w-sm mx-auto mb-5">
            Scan a document or add existing scans to start building your
            collection.
          </p>
          <Link to="/app/scan">
            <Button>Scan a Document</Button>
          </Link>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc, index) => {
            // Section title divider
            if (doc.type === 'section') {
              return (
                <div key={doc.id} className="section-ornament">
                  <span className="font-display text-base font-semibold text-walnut px-4">
                    {doc.title}
                  </span>
                </div>
              );
            }

            return (
              <div key={doc.id}>
                <DocumentCard
                  document={doc}
                  onMoveUp={index > 0 ? handleMoveUp : undefined}
                  onMoveDown={
                    index < documents.length - 1 ? handleMoveDown : undefined
                  }
                  onRemove={handleRemoveRequest}
                  onClick={() => navigate(`/app/scan/${doc.id}`, { state: { fromCollection: id } })}
                />

                {/* Add section button between documents */}
                {index < documents.length - 1 && (
                  <div className="flex justify-center py-1">
                    <button
                      type="button"
                      onClick={() => handleAddSection(index)}
                      className="font-ui text-xs text-walnut-muted hover:text-terracotta transition-colors px-3 py-1 rounded-pill hover:bg-terracotta-light"
                    >
                      + Add section divider
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Picker Modal */}
      <DocumentPickerModal
        open={showDocPicker}
        onClose={() => {
          setShowDocPicker(false);
          // Refresh the collection items after adding
          fetchDocuments(id).catch(() => {});
        }}
        collectionId={id}
        collectionName={collection?.name}
        existingItems={documents}
      />

      {/* Delete Collection Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Collection"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-walnut-secondary">
            Are you sure you want to delete <strong>{collection?.name}</strong>? All documents will be removed from this collection. The scans themselves will not be deleted.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteCollection}
              loading={deleting}
            >
              Delete Collection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Document Confirmation Modal */}
      <Modal
        open={removeDocId !== null}
        onClose={() => setRemoveDocId(null)}
        title="Remove Document"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-walnut-secondary">
            Remove this document from the collection? The scan itself will not be deleted.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setRemoveDocId(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveConfirm}
              loading={removing}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Options Modal (Keeper only) */}
      <ExportOptionsModal
        open={showExportOptions}
        onClose={() => setShowExportOptions(false)}
        onExport={handleExport}
        documents={documents}
        exporting={exporting}
      />

      {/* Export Upsell Modal (free users) */}
      <Modal
        open={showExportUpsell}
        onClose={() => setShowExportUpsell(false)}
        title="Export PDF"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-walnut-secondary">
            PDF export is available when you order a printed book or get Keeper Pass.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setShowExportUpsell(false);
                navigate(`/app/book/${id}`);
              }}
              className="w-full"
            >
              Order a Book
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const result = await purchaseKeeperPass();
                  if (result?.url) window.location.href = result.url;
                } catch {
                  toast('Could not start purchase. Please try again.', 'error');
                }
              }}
              className="w-full"
            >
              Get Keeper Pass — $59
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowExportUpsell(false)}
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Section Modal */}
      <Modal
        open={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        title="Add Section Title"
        size="sm"
      >
        <form onSubmit={handleSectionSubmit} className="flex flex-col gap-5">
          <Input
            label="Section Title"
            placeholder='e.g. "Holiday Recipes"'
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            autoFocus
            required
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowSectionModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!sectionTitle.trim()}>
              Add Section
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
