import { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const MAX_DIMENSION = 3000;
const JPEG_QUALITY = 0.85;
const CONTRAST_AMOUNT = 1.15; // Subtle contrast boost

function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Resize if necessary
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Apply basic contrast enhancement
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const factor = (259 * (CONTRAST_AMOUNT * 128 + 255)) / (255 * (259 - CONTRAST_AMOUNT * 128));

      for (let i = 0; i < data.length; i += 4) {
        data[i] = clampByte(factor * (data[i] - 128) + 128);
        data[i + 1] = clampByte(factor * (data[i + 1] - 128) + 128);
        data[i + 2] = clampByte(factor * (data[i + 2] - 128) + 128);
      }

      ctx.putImageData(imageData, 0, 0);

      // Export as JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              previewUrl: URL.createObjectURL(blob),
              width,
              height,
            });
          } else {
            reject(new Error('Failed to create processed image'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export default function ImagePreprocessor({ file, onConfirm, onCancel }) {
  const [processing, setProcessing] = useState(true);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) return;

    const origUrl = URL.createObjectURL(file);
    setOriginalUrl(origUrl);
    setProcessing(true);
    setError(null);

    preprocessImage(file)
      .then((result) => {
        setProcessedUrl(result.previewUrl);
        setProcessedBlob(result.blob);
        setProcessing(false);
      })
      .catch((err) => {
        setError(err.message);
        setProcessing(false);
      });

    return () => {
      URL.revokeObjectURL(origUrl);
    };
  }, [file]);

  // Clean up processed URL on unmount
  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [processedUrl]);

  function handleConfirm() {
    if (processedBlob) {
      onConfirm?.(processedBlob);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Preview */}
      <div className="relative rounded-lg overflow-hidden bg-walnut/5 border border-border">
        {processing ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="font-ui text-sm text-walnut-muted">
              Optimizing image...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="font-ui text-sm text-red-500">{error}</p>
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <img
              src={showOriginal ? originalUrl : processedUrl}
              alt={showOriginal ? 'Original' : 'Processed'}
              className="w-full max-h-[400px] object-contain"
            />

            {/* Toggle overlay label */}
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-walnut/70 text-white font-ui text-xs backdrop-blur-sm">
                {showOriginal ? 'Original' : 'Enhanced'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {!processing && !error && (
        <div className="flex flex-col gap-3">
          {/* Before/After toggle */}
          <button
            type="button"
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className="self-center font-ui text-xs text-walnut-muted hover:text-walnut transition-colors"
          >
            Hold to see original
          </button>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onCancel}
            >
              Retake
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
            >
              Looks Good
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
