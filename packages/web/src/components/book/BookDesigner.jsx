import { useState, useEffect, useCallback, useRef } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import DesignerToolbar from './DesignerToolbar';
import DesignerSidebar from './DesignerSidebar';
import PageCanvas from './PageCanvas';
import OrderPanel from './OrderPanel';

const MODES = ['pages', 'settings', 'cover', 'order'];

export default function BookDesigner({ collectionId, bookId }) {
  const [mode, setMode] = useState('cover');
  const [initializing, setInitializing] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const autoSaveRef = useRef(null);

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

        // If book has existing blueprint, load it
        if (currentBook?.customization?.pages?.length) {
          loadBlueprint(currentBook.customization);
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

  const currentPage = blueprint?.pages?.[selectedPageIndex] || null;

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
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-80 border-r border-border-light bg-cream-surface overflow-y-auto shrink-0 hidden md:block">
          <DesignerSidebar mode={mode} />
        </div>

        {/* Main canvas area */}
        <div className="flex-1 bg-gray-100 overflow-auto p-2 pb-24 md:p-6 md:pb-6">
          {mode === 'order' ? (
            <OrderPanel bookId={book?.id} />
          ) : mode === 'cover' ? (
            <div className="flex items-start justify-center min-h-full">
              <CoverPreview coverDesign={blueprint?.coverDesign} />
            </div>
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
          <button
            onClick={() => setMobileDrawerOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 font-ui text-xs font-medium text-walnut-secondary active:bg-cream-alt transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${mobileDrawerOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            {mobileDrawerOpen ? 'Hide Panel' : 'Show Panel'}
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

