import { useState, useRef, useCallback, useEffect } from 'react';
import clsx from 'clsx';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export default function PhotoPanel({ imageUrl }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  function handleZoomIn() {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }

  function handleFit() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan dragging
  function handlePointerDown(e) {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: dragStart.current.panX + dx,
      y: dragStart.current.panY + dy,
    });
  }

  function handlePointerUp() {
    setDragging(false);
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-cream-alt rounded-lg border border-border-light">
        <p className="font-ui text-sm text-walnut-muted">No image loaded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-cream-surface border-b border-border-light rounded-t-lg">
        <span className="font-ui text-xs text-walnut-muted">
          {Math.round(zoom * 100)}%
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-1.5 rounded-md text-walnut-secondary hover:bg-cream-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
            </svg>
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-1.5 rounded-md text-walnut-secondary hover:bg-cream-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={handleFit}
            className="p-1.5 rounded-md text-walnut-secondary hover:bg-cream-alt transition-colors"
            aria-label="Fit to view"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image viewport */}
      <div
        ref={containerRef}
        className={clsx(
          'flex-1 overflow-hidden bg-cream-alt rounded-b-lg border border-t-0 border-border-light relative',
          zoom > 1 ? 'cursor-grab' : 'cursor-default',
          dragging && 'cursor-grabbing',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 150ms ease-out',
          }}
        >
          <img
            src={imageUrl}
            alt="Original scan"
            className="max-w-full max-h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
