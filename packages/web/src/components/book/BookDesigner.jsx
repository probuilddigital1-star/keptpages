import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/bookStore';
import { useCollectionsStore } from '@/stores/collectionsStore';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import DesignerToolbar from './DesignerToolbar';
import DesignerSidebar from './DesignerSidebar';
import PageCanvas from './PageCanvas';
import OrderPanel from './OrderPanel';
import { createPage } from './constants';

const MODES = ['pages', 'settings', 'cover', 'order'];

// Front matter pages count (title page, copyright, TOC)
const FRONT_MATTER_COUNT = 3;

export default function BookDesigner({ collectionId, bookId }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('cover');
  const [initializing, setInitializing] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const autoSaveRef = useRef(null);

  const collections = useCollectionsStore((s) => s.collections);
  const collection = collections.find((c) => c.id === collectionId);
  const collectionName = collection?.name || '';

  const book = useBookStore((s) => s.book);
  const blueprint = useBookStore((s) => s.blueprint);
  const selectedPageIndex = useBookStore((s) => s.selectedPageIndex);
  const dirty = useBookStore((s) => s.dirty);
  const saveStatus = useBookStore((s) => s.saveStatus);
  const loading = useBookStore((s) => s.loading);
  const documents = useBookStore((s) => s.documents);
  const loadBook = useBookStore((s) => s.loadBook);
  const loadDocuments = useBookStore((s) => s.loadDocuments);
  const initBlueprint = useBookStore((s) => s.initBlueprint);
  const loadBlueprint = useBookStore((s) => s.loadBlueprint);
  const saveBlueprint = useBookStore((s) => s.saveBlueprint);
  const createBook = useBookStore((s) => s.createBook);
  const coverDesign = useBookStore((s) => s.coverDesign);

  // Initialize: load or create book, load documents, init blueprint
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setInitializing(true);
        let currentBook = book;

        // Load existing book or create new one
        if (bookId && bookId !== 'new') {
          currentBook = await loadBook(bookId);
        } else {
          // Auto-create book so bookId is immediately available
          try {
            const title = coverDesign.title || 'Untitled Book';
            currentBook = await createBook(collectionId, title);
            // Update URL with bookId so it persists across refreshes
            if (currentBook?.id) {
              const url = new URL(window.location);
              url.searchParams.set('bookId', currentBook.id);
              window.history.replaceState({}, '', url);
            }
          } catch (err) {
            console.error('Auto-create book failed:', err);
          }
        }

        // Load collection documents
        const docs = await loadDocuments(collectionId);

        // If book has existing blueprint, load it and reconcile new documents
        if (currentBook?.customization?.pages?.length) {
          loadBlueprint(currentBook.customization);

          // Reconcile: append pages for any new collection items not in the saved blueprint
          const savedDocIds = new Set(
            currentBook.customization.pages
              .filter((p) => p.documentId)
              .map((p) => p.documentId)
          );
          const newDocs = docs.filter((d) => !savedDocIds.has(d.id));
          if (newDocs.length > 0) {
            const newPages = newDocs.map((doc) => createPage('document', doc));
            useBookStore.setState((state) => ({
              blueprint: {
                ...state.blueprint,
                pages: [...state.blueprint.pages, ...newPages],
              },
              dirty: true,
            }));
          }
        } else if (!blueprint?.pages?.length) {
          // Initialize fresh blueprint from documents
          initBlueprint(docs, {
            title: coverDesign.title || currentBook?.title || '',
            subtitle: coverDesign.subtitle || currentBook?.subtitle || '',
            colorScheme: coverDesign.colorScheme || 'default',
          });
        }
      } catch (err) {
        console.error('Designer init error:', err);
        if (!cancelled) toast('Failed to load book data.', 'error');
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, bookId]);

  // Auto-save every 5 seconds when dirty
  useEffect(() => {
    if (dirty && book?.id) {
      autoSaveRef.current = setTimeout(() => {
        saveBlueprint(book.id).catch(() => {});
      }, 5000);
    }
    return () => clearTimeout(autoSaveRef.current);
  }, [dirty, book?.id, saveBlueprint]);

  const handleSave = useCallback(async () => {
    if (!book?.id) {
      // Create book first
      try {
        const title = blueprint?.coverDesign?.title || coverDesign.title || 'Untitled Book';
        const newBook = await createBook(collectionId, title);
        if (newBook?.id) {
          // Update URL with bookId
          const url = new URL(window.location);
          url.searchParams.set('bookId', newBook.id);
          window.history.replaceState({}, '', url);
          await saveBlueprint(newBook.id);
          toast('Book saved!');
        }
      } catch {
        toast('Failed to save book.', 'error');
      }
    } else {
      try {
        await saveBlueprint(book.id);
        toast('Book saved!');
      } catch {
        toast('Failed to save.', 'error');
      }
    }
  }, [book, blueprint, coverDesign, collectionId, createBook, saveBlueprint]);

  const handleBack = useCallback(async () => {
    // Save before leaving if dirty
    if (dirty && book?.id) {
      try {
        await saveBlueprint(book.id);
      } catch {
        // Continue navigation even if save fails
      }
    }
    navigate(`/app/collection/${collectionId}`);
  }, [dirty, book?.id, saveBlueprint, navigate, collectionId]);

  const selectedElementId = useBookStore((s) => s.selectedElementId);
  const setSelectedPage = useBookStore((s) => s.setSelectedPage);
  const deleteElement = useBookStore((s) => s.deleteElement);
  const setSelectedElement = useBookStore((s) => s.setSelectedElement);
  const addPage = useBookStore((s) => s.addPage);

  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const currentPage = blueprint?.pages?.[selectedPageIndex] || null;
  const pageCount = blueprint?.pages?.length || 0;
  const totalEstimatedPages = pageCount + FRONT_MATTER_COUNT;
  const showNudgeBanner = mode === 'pages' && !nudgeDismissed && totalEstimatedPages < 24;

  // Find the selected element object (for type checks)
  const selectedElement = currentPage?.elements?.find((el) => el.id === selectedElementId) || null;

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="font-ui text-sm text-walnut-secondary">Loading designer...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <DesignerToolbar
        mode={mode}
        onModeChange={setMode}
        onSave={handleSave}
        saveStatus={saveStatus}
        bookId={book?.id}
        collectionId={collectionId}
        collectionName={collectionName}
        onBack={handleBack}
      />

      {/* Mobile page navigation strip (US-MOBILE-2) */}
      {mode === 'pages' && pageCount > 0 && (
        <div className="md:hidden flex items-center justify-center gap-3 px-3 py-1.5 bg-white border-b border-border-light shrink-0">
          <button
            onClick={() => setSelectedPage(selectedPageIndex - 1)}
            disabled={selectedPageIndex <= 0}
            className="p-1.5 rounded text-walnut-secondary hover:bg-cream-alt disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="font-ui text-xs text-walnut-secondary tabular-nums">
            Page {selectedPageIndex + 1} of {pageCount}
          </span>
          <button
            onClick={() => setSelectedPage(selectedPageIndex + 1)}
            disabled={selectedPageIndex >= pageCount - 1}
            className="p-1.5 rounded text-walnut-secondary hover:bg-cream-alt disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile element action bar (US-MOBILE-3) */}
      {mode === 'pages' && selectedElementId && (
        <div className="md:hidden flex items-center justify-center gap-2 px-3 py-1.5 bg-white border-b border-border-light shrink-0">
          <button
            onClick={() => deleteElement(selectedPageIndex, selectedElementId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 text-red-600 font-ui text-xs font-medium hover:bg-red-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
            </svg>
            Delete
          </button>
          {selectedElement?.type === 'text' && (
            <button
              onClick={() => {
                // Trigger double-click on the selected element to enter text editing
                const stage = document.querySelector('.konvajs-content canvas');
                if (stage) {
                  const dblClick = new MouseEvent('dblclick', { bubbles: true });
                  stage.dispatchEvent(dblClick);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cream-alt text-walnut font-ui text-xs font-medium hover:bg-cream transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Text
            </button>
          )}
          <button
            onClick={() => setSelectedElement(null)}
            className="p-1.5 rounded text-walnut-muted hover:bg-cream-alt transition-colors"
            aria-label="Deselect"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-80 border-r border-border-light bg-cream-surface overflow-y-auto shrink-0 hidden md:block">
          <DesignerSidebar mode={mode} />
        </div>

        {/* Main canvas area */}
        <div className="flex-1 bg-gray-100 overflow-auto p-2 pb-24 md:p-6 md:pb-6">
          {/* Content-aware nudge banner for short books (US-SHORT-4) */}
          {showNudgeBanner && (
            <div className="bg-cream-surface border border-walnut-muted/20 rounded-lg px-4 py-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-ui text-xs text-walnut">
                  Your book has {totalEstimatedPages} pages. Add notes or a conversion chart to enrich your book, or scan more items.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    onClick={() => addPage('notes', pageCount - 1)}
                    className="font-ui text-[10px] font-medium px-2 py-1 rounded bg-terracotta/10 text-terracotta hover:bg-terracotta/20 transition-colors"
                  >
                    + Notes Page
                  </button>
                  <button
                    onClick={() => addPage('conversion-chart', pageCount - 1)}
                    className="font-ui text-[10px] font-medium px-2 py-1 rounded bg-terracotta/10 text-terracotta hover:bg-terracotta/20 transition-colors"
                  >
                    + Conversion Chart
                  </button>
                  <button
                    onClick={() => addPage('recipe-template', pageCount - 1)}
                    className="font-ui text-[10px] font-medium px-2 py-1 rounded bg-terracotta/10 text-terracotta hover:bg-terracotta/20 transition-colors"
                  >
                    + Recipe Template
                  </button>
                  <button
                    onClick={() => navigate(`/app/collection/${collectionId}`)}
                    className="font-ui text-[10px] font-medium px-2 py-1 rounded bg-sage/10 text-sage hover:bg-sage/20 transition-colors"
                  >
                    Scan More
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNudgeDismissed(true)}
                className="self-start p-1 text-walnut-muted hover:text-walnut transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {mode === 'order' ? (
            <OrderPanel bookId={book?.id} />
          ) : mode === 'cover' ? (
            <>
              {/* Mobile: show cover editor inline since sidebar is hidden */}
              <div className="md:hidden bg-cream-surface rounded-lg border border-border-light mb-4">
                <DesignerSidebar mode="cover" />
              </div>
              <div className="flex items-start justify-center min-h-full">
                <CoverPreview coverDesign={blueprint?.coverDesign} />
              </div>
            </>
          ) : mode === 'settings' ? (
            <>
              {/* Mobile: show settings inline since sidebar is hidden */}
              <div className="md:hidden bg-cream-surface rounded-lg border border-border-light">
                <DesignerSidebar mode="settings" />
              </div>
              {/* Desktop: show page canvas (settings are in sidebar) */}
              <div className="hidden md:flex items-start justify-center min-h-full">
                {currentPage && (
                  <PageCanvas
                    page={currentPage}
                    pageIndex={selectedPageIndex}
                    globalSettings={blueprint?.globalSettings}
                  />
                )}
              </div>
            </>
          ) : (
            currentPage && (
              <div className="flex items-start justify-center min-h-full">
                <PageCanvas
                  page={currentPage}
                  pageIndex={selectedPageIndex}
                  globalSettings={blueprint?.globalSettings}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* Mobile sidebar (fixed above bottom tabs) — hidden in settings/cover mode where content is shown inline */}
      {mode !== 'settings' && mode !== 'cover' && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-cream-surface border-t border-border-light shadow-[0_-2px_8px_rgba(0,0,0,0.08)] rounded-t-xl">
          {/* Drag handle pill */}
          <div className="flex justify-center pt-2">
            <div className="w-8 h-1 rounded-full bg-walnut-muted/30" />
          </div>
          <button
            onClick={() => setMobileDrawerOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 font-ui text-xs font-medium text-walnut-secondary active:bg-cream-alt transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${mobileDrawerOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            {mobileDrawerOpen
              ? 'Hide Panel'
              : selectedElementId ? 'Element Settings' : 'Pages & Elements'}
          </button>
          {mobileDrawerOpen && (
            <div className="overflow-y-auto max-h-[40vh] border-t border-border-light">
              <DesignerSidebar mode={mode} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { COLOR_SCHEMES } from './constants';

function CoverPreview({ coverDesign }) {
  const cover = coverDesign || {};
  const scheme = COLOR_SCHEMES.find((s) => s.id === cover.colorScheme) || COLOR_SCHEMES[0];
  const isDark = cover.colorScheme === 'midnight';

  return (
    <div className="max-w-md w-full">
      <h3 className="font-ui text-sm font-medium text-walnut mb-3">Cover Preview</h3>
      <div
        className="aspect-[3/4] rounded-lg shadow-lg flex flex-col items-center justify-center p-8 text-center border-2"
        style={{ backgroundColor: scheme.bg, borderColor: scheme.accent }}
      >
        {cover.layout === 'left-aligned' ? (
          <div className="w-full text-left px-4">
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: isDark ? '#fff' : '#2C1810' }}>
              {cover.title || 'Your Book Title'}
            </h2>
            {cover.subtitle && <p className="font-body text-sm mb-4" style={{ color: scheme.accent }}>{cover.subtitle}</p>}
            <div className="w-12 h-px mb-4" style={{ backgroundColor: scheme.accent }} />
            {cover.author && <p className="font-ui text-xs" style={{ color: isDark ? '#ccc' : '#666' }}>{cover.author}</p>}
          </div>
        ) : (
          <>
            {cover.photo && (
              <img src={cover.photo} alt="Cover" className="w-28 h-28 object-cover rounded-full mb-6 border-4" style={{ borderColor: scheme.accent }} />
            )}
            <h2 className="font-display text-2xl font-bold leading-tight mb-2" style={{ color: isDark ? '#fff' : '#2C1810' }}>
              {cover.title || 'Your Book Title'}
            </h2>
            {cover.subtitle && <p className="font-body text-sm" style={{ color: scheme.accent }}>{cover.subtitle}</p>}
            <div className="mt-6 w-16 h-px" style={{ backgroundColor: scheme.accent }} />
            {cover.author && <p className="font-ui text-xs mt-4" style={{ color: isDark ? '#ccc' : '#666' }}>{cover.author}</p>}
          </>
        )}
      </div>
    </div>
  );
}

