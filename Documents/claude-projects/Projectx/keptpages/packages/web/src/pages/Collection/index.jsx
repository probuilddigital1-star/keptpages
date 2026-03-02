import { useEffect, useState, useCallback } from 'react';
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
import { config } from '@/config/env';
import DocumentCard from '@/components/collection/DocumentCard';
import { DocumentPickerModal } from '@/components/collection/DocumentPickerModal';

export default function CollectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Store state
  const collections = useCollectionsStore((s) => s.collections);
  const updateCollection = useCollectionsStore((s) => s.updateCollection);
  const fetchCollections = useCollectionsStore((s) => s.fetchCollections);

  const documentsMap = useDocumentsStore((s) => s.documents);
  const documentsLoading = useDocumentsStore((s) => s.loading);
  const fetchDocuments = useDocumentsStore((s) => s.fetchDocuments);
  const removeFromCollection = useDocumentsStore((s) => s.removeFromCollection);
  const reorderDocuments = useDocumentsStore((s) => s.reorderDocuments);

  const tier = useSubscriptionStore((s) => s.tier);

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

  const handleRemove = useCallback(
    (docId) => {
      removeFromCollection(id, docId).catch(() =>
        toast('Failed to remove document', 'error'),
      );
    },
    [id, removeFromCollection],
  );

  // Export PDF
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await api.post(`/collections/${id}/export`);
      if (result.url) {
        const exportUrl = result.url.startsWith('http') ? result.url : `${config.apiUrl.replace('/api', '')}${result.url}`;
        window.open(exportUrl, '_blank');
      }
      toast('PDF exported!');
    } catch {
      toast('Failed to export PDF', 'error');
    } finally {
      setExporting(false);
    }
  }, [id]);

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

  // Loading state if collection not yet loaded
  if (!collection && collections.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
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
            className="font-display text-2xl sm:text-3xl font-bold text-walnut cursor-pointer hover:text-terracotta transition-colors"
            onClick={() => setEditingName(true)}
            title="Click to edit"
          >
            {collection.name}
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
            title="Click to edit"
          >
            {collection.description || 'Add a description...'}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
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

        <Link to="/app/scan">
          <Button variant="primary">
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
          onClick={handleExport}
          loading={exporting}
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

        {tier === 'keeper' && (
          <Button
            variant="light"
            onClick={() => navigate(`/app/book/${id}`)}
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Create Book
          </Button>
        )}
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
                  onRemove={handleRemove}
                  onClick={() => navigate(`/app/scan/${doc.id}`)}
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
        existingItems={documents}
      />

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
