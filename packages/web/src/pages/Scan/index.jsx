import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useScanStore } from '@/stores/scanStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import CameraCapture from '@/components/scan/CameraCapture';
import DropZone from '@/components/scan/DropZone';
import ImagePreprocessor from '@/components/scan/ImagePreprocessor';

// Flow states
const STEP_CHOOSE = 'choose'; // Pick camera or upload
const STEP_CAMERA = 'camera'; // Live camera
const STEP_PREVIEW = 'preview'; // Image preprocessor
const STEP_PAGES = 'pages'; // Multi-page staging
const STEP_UPLOADING = 'uploading'; // Upload + process
const STEP_ANON_RESULT = 'anon_result'; // Anonymous scan result

const PROCESSING_MESSAGES = [
  'Reading your handwriting...',
  'Identifying ingredients & steps...',
  'Organizing everything nicely...',
  'Almost there...',
];

const DOC_TYPES = [
  { value: 'recipe', label: 'Recipe' },
  { value: 'letter', label: 'Letter' },
  { value: 'journal', label: 'Journal' },
  { value: 'artwork', label: 'Artwork' },
];

function normalizeIngredient(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const parts = [entry.amount, entry.unit, entry.item].filter(Boolean);
    return parts.join(' ') || String(entry);
  }
  return String(entry ?? '');
}

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

export default function ScanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const collectionId = location.state?.collectionId;
  const collectionName = location.state?.collectionName;
  const user = useAuthStore((s) => s.user);
  const isAnonymous = !user;
  const {
    uploadScan,
    addPage,
    processScan,
    uploadProgress,
    processing,
    pages,
    addStagedPage,
    removeStagedPage,
    clearStagedPages,
    uploadAnonymousScan,
    getAnonymousScanCount,
    getAnonymousScansRemaining,
  } = useScanStore();
  const addToCollection = useDocumentsStore((s) => s.addToCollection);
  const { tier, usage, limits, canScan, purchaseKeeperPass, loading: upgradeLoading, fetchSubscription } = useSubscriptionStore();

  useEffect(() => {
    if (!isAnonymous) {
      fetchSubscription().catch(() => {});
    }
  }, [fetchSubscription, isAnonymous]);

  // Cleanup staged pages on unmount
  useEffect(() => {
    return () => clearStagedPages();
  }, [clearStagedPages]);

  const fileInputRef = useRef(null);
  const [step, setStep] = useState(STEP_CHOOSE);
  const [rawFile, setRawFile] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [anonResult, setAnonResult] = useState(null);
  const [anonDocType, setAnonDocType] = useState('recipe');
  const [processingMsgIndex, setProcessingMsgIndex] = useState(0);

  // Rotate processing messages every 3s
  useEffect(() => {
    if (step !== STEP_UPLOADING || !processing) {
      setProcessingMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProcessingMsgIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [step, processing]);

  // Anonymous scan counter
  const anonScansUsed = isAnonymous ? getAnonymousScanCount() : 0;
  const anonScansRemaining = isAnonymous ? getAnonymousScansRemaining() : 5;
  const anonAtLimit = isAnonymous && anonScansRemaining <= 0;

  // Authenticated scan counter
  const isFree = !isAnonymous && tier === 'free';
  const scansUsed = usage.scans ?? 0;
  const scansLimit = limits.scans ?? 25;
  const atLimit = isAnonymous ? anonAtLimit : !canScan();

  // ---- Handlers ----

  function handleUploadClick() {
    if (atLimit) {
      setShowUpgradeModal(true);
      return;
    }
    fileInputRef.current?.click();
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  }

  function handleStartCamera() {
    if (atLimit) {
      setShowUpgradeModal(true);
      return;
    }
    setStep(STEP_CAMERA);
  }

  const handleFileSelected = useCallback(
    (file) => {
      if (atLimit) {
        setShowUpgradeModal(true);
        return;
      }
      setRawFile(file);
      setStep(STEP_PREVIEW);
    },
    [atLimit],
  );

  function handleCameraCapture(file) {
    setRawFile(file);
    setStep(STEP_PREVIEW);
  }

  function handleCameraClose() {
    setStep(STEP_CHOOSE);
  }

  function handlePreprocessCancel() {
    setRawFile(null);
    setStep(STEP_CHOOSE);
  }

  function handlePreprocessConfirm(processedBlob) {
    if (isAnonymous) {
      // Anonymous flow: process immediately (single-page only)
      handleAnonymousScan(processedBlob);
      return;
    }
    // Add to pages array and move to PAGES step
    addStagedPage(processedBlob);
    setRawFile(null);
    setStep(STEP_PAGES);
  }

  async function handleAnonymousScan(blob) {
    setRawFile(null);
    setStep(STEP_UPLOADING);
    setUploadError(null);
    try {
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const result = await uploadAnonymousScan(file);
      setAnonResult(result);
      setAnonDocType(result.type === 'recipe' ? 'recipe' : result.type === 'document' ? 'letter' : (result.type || 'recipe'));
      setStep(STEP_ANON_RESULT);
      toast('Scan complete!');
      // If this was their last free scan, show signup prompt
      if (result._remaining <= 0) {
        setShowSignupPrompt(true);
      }
    } catch (err) {
      const msg = err.message || 'Scan failed. Please try again.';
      setUploadError(msg);
      setStep(STEP_CHOOSE);
      toast(msg, 'error');
    }
  }

  function handleAddAnotherPage() {
    // Go back to STEP_CHOOSE so user can pick camera or upload
    setStep(STEP_CHOOSE);
  }

  async function handleProcessPages() {
    if (pages.length === 0) return;

    setStep(STEP_UPLOADING);
    setUploadError(null);

    try {
      // Upload first page as the primary scan
      const firstFile = new File([pages[0].blob], `scan-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const scan = await uploadScan(firstFile);

      // Upload additional pages
      for (let i = 1; i < pages.length; i++) {
        const pageFile = new File([pages[i].blob], `scan-${Date.now()}-page${i + 1}.jpg`, {
          type: 'image/jpeg',
        });
        await addPage(scan.id, pageFile);
      }

      // Process all pages together
      const result = await processScan(scan.id);

      // Clean up staged pages
      clearStagedPages();

      // If we came from a collection, auto-add the scan to it
      if (collectionId) {
        try {
          await addToCollection(collectionId, result.id);
          toast('Scan saved and added to collection!');
          // Milestone toast: nudge book creation when collection reaches 5+ docs
          const docCount = (useDocumentsStore.getState().documents[collectionId] || []).length;
          if (docCount === 5) {
            setTimeout(() => toast('You have 5 documents — enough to create a book!', 'success'), 1500);
          }
        } catch {
          toast('Scan saved but could not add to collection automatically', 'error');
        }
      } else {
        toast('Scan saved successfully!');
      }

      navigate(`/app/scan/${result.id}`, {
        state: {
          fromCollection: collectionId || undefined,
          fromCollectionName: collectionName || undefined,
          justScanned: true,
        },
      });
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
      setStep(STEP_PAGES);
      toast('Scan failed. Please try again.', 'error');
    }
  }

  async function handleUpgrade() {
    if (isAnonymous) {
      navigate('/signup');
      return;
    }
    try {
      const result = await purchaseKeeperPass();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      toast('Could not start upgrade. Please try again.', 'error');
    }
  }

  // ---- Camera overlay ----
  if (step === STEP_CAMERA) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={handleCameraClose}
      />
    );
  }

  // ---- Main layout ----
  return (
    <div className="max-w-container-md mx-auto px-4 py-8">
      {/* Header */}
      <div data-testid="scan-header" className="flex flex-col items-start sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="font-display text-section font-semibold text-walnut">
            New Scan
          </h1>
          <p className="font-body text-walnut-secondary mt-1">
            {collectionName
              ? `Scanning for "${collectionName}"`
              : 'Capture or upload a photo to digitize it.'}
          </p>
        </div>

        {/* Scan counter */}
        {isAnonymous && (
          <Badge variant={anonAtLimit ? 'terracotta' : 'default'}>
            {anonScansUsed} of 5 free scans used
          </Badge>
        )}
        {!isAnonymous && isFree && (
          <Badge variant={atLimit ? 'terracotta' : 'default'}>
            {scansUsed} of {scansLimit} scans used
          </Badge>
        )}
      </div>

      {/* At-limit banner */}
      {atLimit && (
        <Card className="p-5 mb-6 border-terracotta/30 bg-terracotta-light">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-terracotta" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-ui text-sm font-medium text-walnut">
                You&apos;ve used all your free scans this month
              </p>
              <p className="font-ui text-xs text-walnut-secondary mt-1">
                {isAnonymous
                  ? 'Create a free account for 40 scans/month.'
                  : 'Get Keeper Pass for unlimited scans and collections.'}
              </p>
            </div>
            <Button size="sm" onClick={() => isAnonymous ? navigate('/signup') : setShowUpgradeModal(true)}>
              {isAnonymous ? 'Sign Up Free' : 'Get Keeper Pass'}
            </Button>
          </div>
        </Card>
      )}

      {/* Choose mode */}
      {step === STEP_CHOOSE && (
        <div className="flex flex-col gap-6">
          {/* Show page count badge if we have staged pages */}
          {pages.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-sage-light rounded-lg border border-sage/20">
              <Badge variant="sage">{pages.length} {pages.length === 1 ? 'page' : 'pages'} staged</Badge>
              <p className="font-ui text-sm text-walnut-secondary">
                Add another page or{' '}
                <button
                  type="button"
                  onClick={() => setStep(STEP_PAGES)}
                  className="text-terracotta font-medium hover:underline"
                >
                  review &amp; process
                </button>
              </p>
            </div>
          )}

          {/* Option cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Take Photo */}
            <Card
              hover
              className={clsx('p-6 text-center', atLimit && 'opacity-60')}
              onClick={handleStartCamera}
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-terracotta-light flex items-center justify-center mb-4">
                <svg className="h-7 w-7 text-terracotta" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-walnut mb-1">
                Take Photo
              </h3>
              <p className="font-ui text-xs text-walnut-muted">
                Use your device camera
              </p>
            </Card>

            {/* Upload Photo */}
            <Card
              hover
              className={clsx('p-6 text-center', atLimit && 'opacity-60')}
              onClick={handleUploadClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif"
                onChange={handleFileInputChange}
                className="hidden"
                data-testid="upload-file-input"
              />
              <div className="mx-auto w-14 h-14 rounded-full bg-sage-light flex items-center justify-center mb-4">
                <svg className="h-7 w-7 text-sage" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-walnut mb-1">
                Upload Photo
              </h3>
              <p className="font-ui text-xs text-walnut-muted">
                From your files
              </p>
            </Card>
          </div>

          {/* Drop zone */}
          <DropZone
            onFile={handleFileSelected}
            accept="image/jpeg,image/png,image/heic,image/heif"
          />
        </div>
      )}

      {/* Image preprocessor / preview */}
      {step === STEP_PREVIEW && rawFile && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-walnut mb-4">
            Review Your Photo
          </h2>
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600 font-ui mb-4">
              {uploadError}
            </div>
          )}
          <ImagePreprocessor
            file={rawFile}
            onConfirm={handlePreprocessConfirm}
            onCancel={handlePreprocessCancel}
          />
        </Card>
      )}

      {/* Multi-page staging */}
      {step === STEP_PAGES && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-walnut mb-4">
            Multi-Page Scan
          </h2>
          <p className="font-body text-sm text-walnut-secondary mb-4">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} ready. Add more pages or process now.
          </p>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600 font-ui mb-4">
              {uploadError}
            </div>
          )}

          {/* Thumbnail grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
            {pages.map((page, index) => (
              <div key={index} className="relative group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border-light bg-cream-alt">
                  <img
                    src={page.previewUrl}
                    alt={`Page ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute top-1 left-1 bg-walnut/70 text-white text-xs font-ui px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeStagedPage(index)}
                  className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove page ${index + 1}`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add page placeholder */}
            {pages.length < 10 && (
              <button
                type="button"
                onClick={handleAddAnotherPage}
                className="aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-terracotta/40 bg-cream-alt hover:bg-cream-surface flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <svg className="h-6 w-6 text-walnut-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="font-ui text-xs text-walnut-muted">Add Page</span>
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                clearStagedPages();
                setStep(STEP_CHOOSE);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessPages}
              disabled={pages.length === 0}
            >
              Process {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
            </Button>
          </div>
        </Card>
      )}

      {/* Uploading / Processing */}
      {step === STEP_UPLOADING && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-5">
            <Spinner size="lg" />

            <div className="text-center">
              <h2 className="font-display text-lg font-semibold text-walnut mb-1">
                {processing ? 'Processing with AI...' : 'Uploading...'}
              </h2>
              <p className="font-ui text-sm text-walnut-muted">
                {processing
                  ? PROCESSING_MESSAGES[processingMsgIndex]
                  : pages.length > 1
                    ? `Uploading ${pages.length} pages securely`
                    : 'Sending your photo securely'}
              </p>
            </div>

            {/* Progress bar */}
            {!processing && (
              <div className="w-full max-w-xs">
                <div className="h-2 bg-cream-alt rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-terracotta rounded-pill transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="font-ui text-xs text-walnut-muted text-center mt-2">
                  {uploadProgress}%
                </p>
              </div>
            )}

            {processing && (
              <div className="w-full max-w-xs">
                <div className="h-2 bg-cream-alt rounded-pill overflow-hidden">
                  <div className="h-full bg-terracotta rounded-pill animate-shimmer w-2/3" />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Anonymous scan result */}
      {step === STEP_ANON_RESULT && anonResult && (
        <Card className="p-6">
          <div className="flex flex-col gap-5">
            {/* Header with confidence */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-sage" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-walnut">
                    {anonResult.title || 'Scan Complete'}
                  </h2>
                  {anonResult._remaining > 0 && (
                    <p className="font-ui text-xs text-walnut-secondary">
                      {anonResult._remaining} free {anonResult._remaining === 1 ? 'scan' : 'scans'} remaining
                    </p>
                  )}
                </div>
              </div>
              {typeof anonResult.confidence === 'number' && (
                <Badge variant={confidenceVariant(anonResult.confidence)}>
                  {confidenceLabel(anonResult.confidence)} ({Math.round(anonResult.confidence * 100)}%)
                </Badge>
              )}
            </div>

            {/* Document type selector */}
            <div>
              <label className="font-ui text-sm font-medium text-walnut block mb-2">
                Document Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DOC_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => setAnonDocType(dt.value)}
                    className={clsx(
                      'px-4 py-1.5 rounded-pill font-ui text-sm font-medium transition-all duration-200',
                      anonDocType === dt.value
                        ? 'bg-terracotta text-white shadow-btn-primary'
                        : 'bg-cream-alt text-walnut-secondary border border-border hover:border-terracotta/30',
                    )}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Structured data display based on selected doc type */}
            <div className="flex flex-col gap-4 bg-cream-surface rounded-lg p-4 border border-border-light">
              {/* Recipe view */}
              {anonDocType === 'recipe' && (
                <>
                  {anonResult.title && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Title</label>
                      <p className="font-body text-walnut mt-0.5">{anonResult.title}</p>
                    </div>
                  )}
                  {/* Meta row: servings, prep, cook */}
                  {(anonResult.servings || anonResult.prepTime || anonResult.cookTime) && (
                    <div className="flex flex-wrap gap-4 text-sm">
                      {anonResult.servings && (
                        <div className="flex items-center gap-1.5 text-walnut-secondary">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                          </svg>
                          <span className="font-ui">{anonResult.servings} servings</span>
                        </div>
                      )}
                      {anonResult.prepTime && (
                        <div className="flex items-center gap-1.5 text-walnut-secondary">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-ui">Prep: {anonResult.prepTime}</span>
                        </div>
                      )}
                      {anonResult.cookTime && (
                        <div className="flex items-center gap-1.5 text-walnut-secondary">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                          </svg>
                          <span className="font-ui">Cook: {anonResult.cookTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {anonResult.ingredients && anonResult.ingredients.length > 0 && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide mb-1.5 block">Ingredients</label>
                      <ul className="font-body text-sm text-walnut space-y-1">
                        {anonResult.ingredients.map((ing, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-terracotta mt-1.5 shrink-0">
                              <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>
                            </span>
                            <span>{normalizeIngredient(ing)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {anonResult.instructions && anonResult.instructions.length > 0 && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide mb-1.5 block">Instructions</label>
                      <ol className="font-body text-sm text-walnut space-y-2">
                        {anonResult.instructions.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="font-ui text-xs font-bold text-terracotta bg-terracotta/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{typeof step === 'string' ? step : String(step)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {anonResult.notes && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Notes</label>
                      <p className="font-body text-sm text-walnut-secondary mt-0.5 whitespace-pre-wrap">{anonResult.notes}</p>
                    </div>
                  )}
                </>
              )}

              {/* Letter view */}
              {anonDocType === 'letter' && (
                <>
                  {anonResult.title && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Title</label>
                      <p className="font-body text-walnut mt-0.5">{anonResult.title}</p>
                    </div>
                  )}
                  {(anonResult.from || anonResult.to) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {anonResult.from && (
                        <div>
                          <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">From</label>
                          <p className="font-body text-sm text-walnut mt-0.5">{anonResult.from}</p>
                        </div>
                      )}
                      {anonResult.to && (
                        <div>
                          <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">To</label>
                          <p className="font-body text-sm text-walnut mt-0.5">{anonResult.to}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {anonResult.date && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Date</label>
                      <p className="font-body text-sm text-walnut mt-0.5">{anonResult.date}</p>
                    </div>
                  )}
                  <div>
                    <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Content</label>
                    <p className="font-body text-sm text-walnut mt-0.5 whitespace-pre-wrap">{anonResult.content || anonResult.notes || ''}</p>
                  </div>
                </>
              )}

              {/* Journal view */}
              {anonDocType === 'journal' && (
                <>
                  {anonResult.title && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Title</label>
                      <p className="font-body text-walnut mt-0.5">{anonResult.title}</p>
                    </div>
                  )}
                  {anonResult.date && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Date</label>
                      <p className="font-body text-sm text-walnut mt-0.5">{anonResult.date}</p>
                    </div>
                  )}
                  <div>
                    <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Content</label>
                    <p className="font-body text-sm text-walnut mt-0.5 whitespace-pre-wrap">{anonResult.content || anonResult.notes || ''}</p>
                  </div>
                </>
              )}

              {/* Artwork view */}
              {anonDocType === 'artwork' && (
                <>
                  {anonResult.title && (
                    <div>
                      <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Title</label>
                      <p className="font-body text-walnut mt-0.5">{anonResult.title}</p>
                    </div>
                  )}
                  <div>
                    <label className="font-ui text-xs font-medium text-walnut-muted uppercase tracking-wide">Description</label>
                    <p className="font-body text-sm text-walnut-secondary mt-0.5 whitespace-pre-wrap">{anonResult.content || anonResult.notes || ''}</p>
                  </div>
                </>
              )}

              {/* Warnings */}
              {anonResult.warnings && anonResult.warnings.length > 0 && (
                <div className="bg-terracotta-light rounded-md px-3 py-2 border border-terracotta/20">
                  <p className="font-ui text-xs font-medium text-terracotta mb-1">AI Warnings</p>
                  <ul className="font-ui text-xs text-walnut-secondary space-y-0.5">
                    {anonResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* CTA to sign up */}
            <div className="bg-cream-alt border border-border-light rounded-md p-4">
              <p className="font-ui text-sm text-walnut mb-3">
                Create a free account to save your scans, edit the text, organize collections, and order printed books.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAnonResult(null);
                    setStep(STEP_CHOOSE);
                  }}
                >
                  Scan Another
                </Button>
                <Button onClick={() => navigate('/signup')}>
                  Sign Up Free
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Signup Prompt Modal (shown after using all free scans) */}
      <Modal
        open={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        title="You've used all 5 free scans"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-walnut-secondary">
            Create a free account to get 40 scans/month and save your recipes permanently.
          </p>

          <ul className="flex flex-col gap-2">
            {[
              'Save and edit your scans',
              '40 scans per month',
              'Organize into collections',
              'Order beautiful printed books',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 font-ui text-sm text-walnut">
                <svg className="h-4 w-4 text-sage shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex gap-3 mt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowSignupPrompt(false)}
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate('/signup')}
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upgrade Modal (authenticated free users) */}
      <Modal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Get Keeper Pass"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-walnut-secondary">
            You&apos;ve used all {scansLimit} free scans. Get{' '}
            <span className="font-medium text-walnut">Keeper Pass</span> for
            $59 one-time and unlock unlimited access.
          </p>

          <ul className="flex flex-col gap-2">
            {[
              'Unlimited scans',
              'Unlimited collections',
              'Full PDF export',
              '15% off all books',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 font-ui text-sm text-walnut">
                <svg className="h-4 w-4 text-sage shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex gap-3 mt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowUpgradeModal(false)}
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1"
              loading={upgradeLoading}
              onClick={handleUpgrade}
            >
              Get Keeper Pass
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
