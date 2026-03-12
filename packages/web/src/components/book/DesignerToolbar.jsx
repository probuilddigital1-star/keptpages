import { useCallback } from 'react';
import clsx from 'clsx';
import { useBookStore } from '@/stores/bookStore';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import api from '@/services/api';

const TABS = [
  { id: 'cover', label: 'Cover', iconPath: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5' },
  { id: 'pages', label: 'Pages', iconPath: 'M4 4h16v16H4zM9 4v16M4 9h16' },
  { id: 'settings', label: 'Settings', iconPath: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.5.5 1.21.71 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09' },
  { id: 'order', label: 'Order', iconPath: 'M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM20 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' },
];

export default function DesignerToolbar({ mode, onModeChange, onSave, saveStatus, bookId }) {
  const generatingPdf = useBookStore((s) => s.generatingPdf);
  const generatePdf = useBookStore((s) => s.generatePdf);
  const { undo, redo, pastStates, futureStates } = useBookStore.temporal.getState();

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const handleGenerate = useCallback(async () => {
    if (!bookId) {
      toast('Please save your book first.', 'error');
      return;
    }
    try {
      await generatePdf(bookId);
      toast('PDF generated successfully!');
    } catch {
      toast('Failed to generate PDF.', 'error');
    }
  }, [bookId, generatePdf]);

  const handleDownloadPdf = useCallback(async () => {
    if (!bookId) return;
    try {
      const blob = await api.getBlob(`/books/${bookId}/preview`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast('Failed to download PDF.', 'error');
    }
  }, [bookId]);

  return (
    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-white border-b border-border-light shrink-0">
      {/* Mode tabs — icon-only on mobile, label on sm+ */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onModeChange(tab.id)}
            aria-label={tab.label}
            className={clsx(
              'rounded-md font-ui text-xs font-medium transition-colors',
              'p-2 sm:px-3 sm:py-1.5',
              mode === tab.id
                ? 'bg-terracotta text-white'
                : 'text-walnut-secondary hover:bg-cream-alt hover:text-walnut'
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:hidden">
              <path d={tab.iconPath} />
            </svg>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0" />

      {/* Undo/Redo — always visible */}
      <div className="flex items-center gap-1 border-r border-border-light pr-1.5 mr-1.5 sm:pr-2 sm:mr-2">
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          className="p-1.5 rounded text-walnut-secondary hover:bg-cream-alt disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          className="p-1.5 rounded text-walnut-secondary hover:bg-cream-alt disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>

      {/* Save status — dot on mobile, text on sm+ */}
      <span
        className={clsx(
          'sm:hidden w-2.5 h-2.5 rounded-full mr-1 shrink-0',
          saveStatus === 'saved' && 'bg-green-500',
          saveStatus === 'saving' && 'bg-amber-400 animate-pulse',
          saveStatus === 'unsaved' && 'bg-red-400',
        )}
        title={saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
      />
      <span className="hidden sm:inline font-ui text-xs text-walnut-muted mr-2">
        {saveStatus === 'saving' && <><Spinner size="xs" className="inline mr-1" />Saving...</>}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'unsaved' && 'Unsaved changes'}
      </span>

      {/* Actions */}
      <Button variant="ghost" size="sm" onClick={onSave}>
        Save
      </Button>
      <Button
        size="sm"
        onClick={handleGenerate}
        loading={generatingPdf}
        disabled={!bookId}
        className="hidden sm:inline-flex"
      >
        Generate PDF
      </Button>
      <Button
        size="sm"
        onClick={handleGenerate}
        loading={generatingPdf}
        disabled={!bookId}
        className="sm:hidden"
      >
        PDF
      </Button>
    </div>
  );
}
