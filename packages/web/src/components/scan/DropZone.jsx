import { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';

export default function DropZone({
  onFile,
  accept = 'image/*',
  className,
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (file && file.type.startsWith('image/')) {
        onFile?.(file);
      }
    },
    [onFile],
  );

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  function handleClick() {
    inputRef.current?.click();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-4 p-10 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200',
        dragOver
          ? 'border-terracotta bg-terracotta-light scale-[1.01]'
          : 'border-border bg-cream-alt hover:border-terracotta/40 hover:bg-cream-warm',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload a photo"
      />

      {/* Icons */}
      <div className="flex items-center gap-3">
        {/* Camera icon */}
        <div className="w-12 h-12 rounded-full bg-cream-surface flex items-center justify-center">
          <svg
            className="h-6 w-6 text-walnut-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </div>

        {/* Upload icon */}
        <div className="w-12 h-12 rounded-full bg-cream-surface flex items-center justify-center">
          <svg
            className="h-6 w-6 text-walnut-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="font-ui text-sm font-medium text-walnut">
          Drop your photo here or click to browse
        </p>
        <p className="font-ui text-xs text-walnut-muted mt-1">
          Supports JPEG, PNG, and HEIC
        </p>
      </div>

      {/* Drag-over overlay */}
      {dragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-terracotta-light pointer-events-none">
          <p className="font-ui text-sm font-medium text-terracotta">
            Drop to upload
          </p>
        </div>
      )}
    </div>
  );
}
