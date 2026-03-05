import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useScanStore } from '@/stores/scanStore';
import { useEditorStore } from '@/stores/editorStore';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import PhotoPanel from '@/components/editor/PhotoPanel';
import TextPanel from '@/components/editor/TextPanel';
import { CollectionPickerModal } from '@/components/collection/CollectionPickerModal';

const DOC_TYPES = [
  { value: 'recipe', label: 'Recipe' },
  { value: 'letter', label: 'Letter' },
  { value: 'journal', label: 'Journal' },
  { value: 'artwork', label: 'Artwork' },
];

const AUTOSAVE_DELAY = 1500; // ms

function confidenceVariant(score) {
  if (score >= 0.7) return 'sage';
  if (score >= 0.5) return 'gold';
  return 'terracotta';
}

function confidenceLabel(score) {
  if (score >= 0.7) return 'High confidence';
  if (score >= 0.5) return 'Medium confidence';
  return 'Low confidence';
}

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCollection = location.state?.fromCollection;
  const backPath = fromCollection ? `/app/collection/${fromCollection}` : '/app';
  const backLabel = fromCollection ? 'Back to collection' : 'Back';

  const { getScan, reprocessScan, deleteScan, processing: reprocessing } = useScanStore();
  const {
    originalImage,
    editedData,
    confidence,
    isDirty,
    saving,
    loadScan,
    updateField,
    save,
  } = useEditorStore();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [documentType, setDocumentType] = useState('recipe');
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Auto-save timer ref
  const autosaveRef = useRef(null);

  // Load scan on mount
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setLoadError(null);

    getScan(id)
      .then((scan) => {
        loadScan(scan);
        if (scan.extractedData?.documentType) {
          setDocumentType(scan.extractedData.documentType);
        } else if (scan.extractedData?.type) {
          setDocumentType(scan.extractedData.type);
        }
        setLoading(false);

        // Fetch original image from R2 via worker
        api.getBlob(`/scan/${id}/image`)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            useEditorStore.setState({ originalImage: url });
          })
          .catch(() => {
            // Image not available — PhotoPanel will show fallback
          });
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to load scan');
        setLoading(false);
      });

    // Revoke blob URL on unmount
    return () => {
      const { originalImage } = useEditorStore.getState();
      if (originalImage?.startsWith('blob:')) {
        URL.revokeObjectURL(originalImage);
      }
    };
  }, [id, getScan, loadScan]);

  // Auto-save debounce
  useEffect(() => {
    if (!isDirty || !id) return;

    if (autosaveRef.current) clearTimeout(autosaveRef.current);

    autosaveRef.current = setTimeout(async () => {
      try {
        await save(id);
      } catch {
        // Silent fail for autosave -- user can manually save
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [isDirty, editedData, id, save]);

  // ---- Handlers ----

  const handleDataChange = useCallback(
    (newData) => {
      // Merge entire data object into editorStore
      Object.entries(newData).forEach(([key, value]) => {
        updateField(key, value);
      });
    },
    [updateField],
  );

  function handleDocumentTypeChange(type) {
    setDocumentType(type);
    updateField('type', type);
  }

  async function handleSave() {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    try {
      await save(id);
      toast('Saved successfully');
    } catch {
      toast('Failed to save. Please try again.', 'error');
    }
  }

  async function handleReprocess() {
    try {
      const result = await reprocessScan(id);
      loadScan(result);
      if (result.extractedData?.documentType) {
        setDocumentType(result.extractedData.documentType);
      } else if (result.extractedData?.type) {
        setDocumentType(result.extractedData.type);
      }
      // Re-fetch image (already in R2, but editorStore.originalImage may have been reset)
      api.getBlob(`/scan/${id}/image`)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          useEditorStore.setState({ originalImage: url });
        })
        .catch(() => {});
      toast('Reprocessed successfully');
    } catch {
      toast('Reprocessing failed. Please try again.', 'error');
    }
  }

  function handleAddToCollection() {
    setShowCollectionPicker(true);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteScan(id);
      toast('Scan deleted');
      navigate(backPath);
    } catch {
      toast('Failed to delete scan', 'error');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  // ---- Loading / Error states ----

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="font-ui text-sm text-walnut-muted mt-4">Loading scan...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-container-md mx-auto px-4 py-12">
        <Card className="p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="font-display text-lg font-semibold text-walnut mb-2">
            Could not load scan
          </h2>
          <p className="font-body text-sm text-walnut-secondary mb-6">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/app/scan')}>
              Back to Scans
            </Button>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Main editor ----

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-cream-surface border-b border-border-light">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 p-1.5 rounded-md text-walnut-secondary hover:bg-cream-alt transition-colors"
            aria-label={backLabel}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="font-ui text-sm hidden sm:inline">{backLabel}</span>
          </button>

          <div className="flex items-center gap-2">
            <Badge variant={confidenceVariant(confidence)}>
              {confidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
            </Badge>
            {isDirty && (
              <span className="font-ui text-xs text-walnut-muted italic">
                Unsaved changes
              </span>
            )}
            {saving && (
              <span className="font-ui text-xs text-walnut-muted flex items-center gap-1">
                <Spinner size="sm" /> Saving...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {confidence < 0.7 && (
            <Button
              variant="ghost"
              size="sm"
              loading={reprocessing}
              onClick={handleReprocess}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Reprocess with AI
            </Button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-md text-walnut-muted hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Delete scan"
            title="Delete scan"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
          <Button variant="secondary" size="sm" onClick={handleAddToCollection}>
            Add to Collection
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!isDirty}>
            Save
          </Button>
        </div>
      </div>

      {/* Low-confidence warning */}
      {confidence < 0.5 && (
        <div className="px-4 py-2.5 bg-terracotta-light border-b border-terracotta/20">
          <p className="font-ui text-xs text-terracotta flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            The AI had low confidence reading this document. Please review the extracted text carefully and consider reprocessing.
          </p>
        </div>
      )}

      {/* Split editor: Photo left, Text right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: Photo panel */}
        <div className="lg:w-1/2 h-[40vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-border-light">
          <PhotoPanel imageUrl={originalImage} />
        </div>

        {/* RIGHT: Text panel */}
        <div className="lg:w-1/2 flex-1 overflow-y-auto bg-cream-surface">
          <div className="p-5">
            {/* Document type selector */}
            <div className="mb-5">
              <label className="font-ui text-sm font-medium text-walnut block mb-2">
                Document Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DOC_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => handleDocumentTypeChange(dt.value)}
                    className={clsx(
                      'px-4 py-1.5 rounded-pill font-ui text-sm font-medium transition-all duration-200',
                      documentType === dt.value
                        ? 'bg-terracotta text-white shadow-btn-primary'
                        : 'bg-cream-alt text-walnut-secondary border border-border hover:border-terracotta/30',
                    )}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text fields */}
            <TextPanel
              data={editedData || {}}
              onChange={handleDataChange}
              documentType={documentType}
            />
          </div>
        </div>
      </div>

      {/* Collection picker modal */}
      <CollectionPickerModal
        open={showCollectionPicker}
        onClose={() => setShowCollectionPicker(false)}
        scanId={id}
      />

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Scan"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-walnut-secondary">
            Are you sure you want to delete this scan? It will be removed from
            all collections. This action cannot be undone.
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
              onClick={handleDelete}
              loading={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
