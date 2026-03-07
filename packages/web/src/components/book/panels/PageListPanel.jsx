import { useCallback, useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBookStore } from '@/stores/bookStore';
import { PAGE_KINDS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

function SortablePageItem({ page, index, isSelected, onClick, thumbnailUrl }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const kindInfo = PAGE_KINDS.find((k) => k.id === page.kind);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(index)}
      className={clsx(
        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors group',
        isDragging && 'opacity-50',
        isSelected
          ? 'bg-terracotta/10 border border-terracotta/30'
          : 'hover:bg-cream-alt border border-transparent'
      )}
    >
      {/* Thumbnail */}
      <div className="w-10 h-13 bg-white border border-border-light rounded-sm overflow-hidden shrink-0 flex items-center justify-center"
        style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <span className="font-ui text-[8px] text-walnut-muted">{index + 1}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-ui text-xs font-medium text-walnut truncate">
          Page {index + 1}
        </div>
        <div className="font-ui text-[10px] text-walnut-muted truncate">
          {kindInfo?.label || page.kind}
        </div>
      </div>
    </div>
  );
}

export default function PageListPanel() {
  const blueprint = useBookStore((s) => s.blueprint);
  const selectedPageIndex = useBookStore((s) => s.selectedPageIndex);
  const setSelectedPage = useBookStore((s) => s.setSelectedPage);
  const reorderPages = useBookStore((s) => s.reorderPages);
  const removePage = useBookStore((s) => s.removePage);
  const [thumbnails, setThumbnails] = useState({});

  const pages = blueprint?.pages || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderPages(oldIndex, newIndex);
    }
  }, [pages, reorderPages]);

  // Update thumbnail for a page
  const updateThumbnail = useCallback((pageId, dataUrl) => {
    setThumbnails((prev) => ({ ...prev, [pageId]: dataUrl }));
  }, []);

  // Expose thumbnail updater globally for PageCanvas to call
  useEffect(() => {
    window.__bookDesignerUpdateThumbnail = updateThumbnail;
    return () => { delete window.__bookDesignerUpdateThumbnail; };
  }, [updateThumbnail]);

  return (
    <div className="p-2">
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider">
          Pages ({pages.length})
        </h3>
        {pages.length > 1 && (
          <button
            onClick={() => {
              if (confirm('Remove this page?')) {
                removePage(selectedPageIndex);
              }
            }}
            className="text-walnut-muted hover:text-red-500 transition-colors"
            title="Remove page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {pages.map((page, index) => (
              <SortablePageItem
                key={page.id}
                page={page}
                index={index}
                isSelected={index === selectedPageIndex}
                onClick={setSelectedPage}
                thumbnailUrl={thumbnails[page.id]}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
