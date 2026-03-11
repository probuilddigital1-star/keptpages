import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useScanStore } from '@/stores/scanStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
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
const STEP_UPLOADING = 'uploading'; // Upload + process

export default function ScanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const collectionId = location.state?.collectionId;
  const collectionName = location.state?.collectionName;
  const { uploadScan, processScan, uploadProgress, processing } = useScanStore();
  const addToCollection = useDocumentsStore((s) => s.addToCollection);
  const { tier, usage, limits, canScan, upgrade, loading: upgradeLoading, fetchSubscription } = useSubscriptionStore();

  useEffect(() => {
    fetchSubscription().catch(() => {});
  }, [fetchSubscription]);

  const fileInputRef = useRef(null);
  const [step, setStep] = useState(STEP_CHOOSE);
  const [rawFile, setRawFile] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const isFree = tier === 'free';
  const scansUsed = usage.scans ?? 0;
  const scansLimit = limits.scans ?? 25;
  const atLimit = !canScan();

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

  async function handlePreprocessConfirm(processedBlob) {
    setStep(STEP_UPLOADING);
    setUploadError(null);

    try {
      const file = new File([processedBlob], `scan-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      const scan = await uploadScan(file);
      const result = await processScan(scan.id);

      // If we came from a collection, auto-add the scan to it
      if (collectionId) {
        try {
          await addToCollection(collectionId, result.id);
        } catch {
          // Non-fatal — scan was created, just not linked
          toast('Scan saved but could not add to collection automatically', 'error');
        }
      }

      navigate(`/app/scan/${result.id}`, {
        state: collectionId ? { fromCollection: collectionId } : undefined,
      });
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
      setStep(STEP_PREVIEW);
      toast('Scan failed. Please try again.', 'error');
    }
  }

  async function handleUpgrade() {
    try {
      const result = await upgrade();
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

        {/* Scan counter for free users */}
        {isFree && (
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
                You&apos;ve reached your free scan limit
              </p>
              <p className="font-ui text-xs text-walnut-secondary mt-1">
                Upgrade to Keeper for unlimited scans and collections.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowUpgradeModal(true)}>
              Upgrade
            </Button>
          </div>
        </Card>
      )}

      {/* Choose mode or preview */}
      {step === STEP_CHOOSE && (
        <div className="flex flex-col gap-6">
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
                  ? 'Extracting text and identifying content'
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

      {/* Upgrade Modal */}
      <Modal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to Keeper"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-walnut-secondary">
            You&apos;ve used all {scansLimit} free scans. Upgrade to{' '}
            <span className="font-medium text-walnut">Keeper</span> for
            unlimited scans, unlimited collections, and more.
          </p>

          <ul className="flex flex-col gap-2">
            {[
              'Unlimited scans',
              'Unlimited collections',
              'AI reprocessing',
              'Priority support',
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
              Upgrade Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
