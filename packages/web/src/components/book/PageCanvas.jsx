import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Transformer } from 'react-konva';
import { useBookStore } from '@/stores/bookStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FONTS } from './constants';
import CanvasElement from './canvas/CanvasElement';
import PageBackground from './canvas/PageBackground';
import TextEditOverlay from './canvas/TextEditOverlay';
import { toast } from '@/components/ui/Toast';

export default function PageCanvas({ page, pageIndex, globalSettings }) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [editingText, setEditingText] = useState(null);

  const selectedElementId = useBookStore((s) => s.selectedElementId);
  const setSelectedElement = useBookStore((s) => s.setSelectedElement);
  const updateElement = useBookStore((s) => s.updateElement);
  const deleteElement = useBookStore((s) => s.deleteElement);
  const uploadBookImage = useBookStore((s) => s.uploadBookImage);
  const book = useBookStore((s) => s.book);
  const imageInputRef = useRef(null);
  const pendingImageElementRef = useRef(null);

  // Scale canvas to fit container (both width and height)
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth - 32;
      const containerHeight = containerRef.current.offsetHeight - 16;
      const scaleByWidth = containerWidth / CANVAS_WIDTH;
      const scaleByHeight = containerHeight > 100 ? containerHeight / CANVAS_HEIGHT : scaleByWidth;
      const newScale = Math.min(1, scaleByWidth, scaleByHeight);
      setScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Attach transformer to selected element
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedElementId) {
      const node = stage.findOne(`#${selectedElementId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer().batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer().batchDraw();
  }, [selectedElementId, page.elements]);

  // Generate thumbnail (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (stageRef.current && window.__bookDesignerUpdateThumbnail) {
        try {
          const dataUrl = stageRef.current.toDataURL({ pixelRatio: 0.15 });
          window.__bookDesignerUpdateThumbnail(page.id, dataUrl);
        } catch {
          // ignore thumbnail errors
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [page]);

  // Click on empty area deselects
  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage() || e.target.name() === 'background') {
      setSelectedElement(null);
      setEditingText(null);
    }
  }, [setSelectedElement]);

  // Handle element click
  const handleElementClick = useCallback((elementId) => {
    setSelectedElement(elementId);
    setEditingText(null);
  }, [setSelectedElement]);

  // Handle element double-click (text editing or image upload)
  const handleElementDblClick = useCallback((element) => {
    if (element.type === 'text') {
      setEditingText(element);
    } else if (element.type === 'image' && !element.imageKey) {
      // Open file picker for empty image placeholders
      pendingImageElementRef.current = element.id;
      imageInputRef.current?.click();
    }
  }, []);

  // Handle image file selection for empty image placeholders
  const handleImageFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    const elementId = pendingImageElementRef.current;
    if (!file || !elementId || !book?.id) return;
    pendingImageElementRef.current = null;

    try {
      const img = new Image();
      const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      img.src = URL.createObjectURL(file);
      await loaded;
      URL.revokeObjectURL(img.src);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      const jpegFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });

      const result = await uploadBookImage(book.id, jpegFile);
      updateElement(pageIndex, elementId, {
        imageKey: result.key,
        imageMimeType: result.mimeType || 'image/jpeg',
      });
    } catch {
      toast('Failed to upload image.', 'error');
    }
    e.target.value = '';
  }, [book, pageIndex, updateElement, uploadBookImage]);

  // Handle drag end — update position
  const handleDragEnd = useCallback((elementId, e) => {
    const node = e.target;
    updateElement(pageIndex, elementId, {
      x: node.x() / CANVAS_WIDTH,
      y: node.y() / CANVAS_HEIGHT,
    });
  }, [pageIndex, updateElement]);

  // Handle transform end — update size
  const handleTransformEnd = useCallback((elementId, e) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale, apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    updateElement(pageIndex, elementId, {
      x: node.x() / CANVAS_WIDTH,
      y: node.y() / CANVAS_HEIGHT,
      width: (node.width() * scaleX) / CANVAS_WIDTH,
      height: (node.height() * scaleY) / CANVAS_HEIGHT,
      rotation: node.rotation(),
    });
  }, [pageIndex, updateElement]);

  // Handle text edit complete
  const handleTextEditDone = useCallback((newText) => {
    if (editingText) {
      updateElement(pageIndex, editingText.id, { text: newText });
    }
    setEditingText(null);
  }, [editingText, pageIndex, updateElement]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingText) return; // Don't interfere with text editing

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        deleteElement(pageIndex, selectedElementId);
      }

      if (e.key === 'Escape') {
        setSelectedElement(null);
        setEditingText(null);
      }

      // Arrow key nudge
      if (selectedElementId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const el = page.elements.find((el) => el.id === selectedElementId);
        if (!el) return;
        const dx = e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0;
        const dy = e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0;
        updateElement(pageIndex, selectedElementId, {
          x: el.x + dx / CANVAS_WIDTH,
          y: el.y + dy / CANVAS_HEIGHT,
        });
      }

      // Undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        const temporal = useBookStore.temporal.getState();
        if (e.shiftKey) {
          temporal.redo();
        } else {
          temporal.undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, editingText, pageIndex, page.elements, deleteElement, setSelectedElement, updateElement]);

  // Resolve font family for an element
  const resolveFont = (element) => {
    const fontId = element.fontFamily || globalSettings?.fontFamily || 'fraunces';
    const font = FONTS.find((f) => f.id === fontId);
    return font?.family || "'Fraunces', serif";
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <div
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Stage
          ref={stageRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          scaleX={scale}
          scaleY={scale}
          style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          {/* Background layer (non-interactive) */}
          <Layer listening={false}>
            <PageBackground
              background={page.background}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
          </Layer>

          {/* Content layer (interactive) */}
          <Layer>
            {page.elements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={element.id === selectedElementId}
                isEditing={editingText?.id === element.id}
                fontFamily={resolveFont(element)}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                onClick={() => handleElementClick(element.id)}
                onDblClick={() => handleElementDblClick(element)}
                onDragEnd={(e) => handleDragEnd(element.id, e)}
                onTransformEnd={(e) => handleTransformEnd(element.id, e)}
              />
            ))}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 10) return oldBox;
                return newBox;
              }}
              rotateEnabled={true}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
            />
          </Layer>
        </Stage>
      </div>

      {/* Text editing overlay */}
      {editingText && (
        <TextEditOverlay
          element={editingText}
          fontFamily={resolveFont(editingText)}
          scale={scale}
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          onDone={handleTextEditDone}
          onCancel={() => setEditingText(null)}
        />
      )}

      {/* Hidden file input for image element uploads */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelect}
      />
    </div>
  );
}
