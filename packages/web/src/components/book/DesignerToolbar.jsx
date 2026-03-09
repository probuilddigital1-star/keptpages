import { useCallback } from 'react';
import clsx from 'clsx';
import { useBookStore } from '@/stores/bookStore';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import api from '@/services/api';

const TABS = [
  { id: 'cover', label: 'Cover', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' },
  { id: 'pages', label: 'Pages', icon: 'M4 4h16v16H4z' },
  { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { id: 'order', label: 'Order', icon: 'M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
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
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 bg-white border-b border-border-light shrink-0">
      {/* Mode tabs */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onModeChange(tab.id)}
            className={clsx(
              'px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-md font-ui text-xs font-medium transition-colors',
              mode === tab.id
                ? 'bg-terracotta text-white'
                : 'text-walnut-secondary hover:bg-cream-alt hover:text-walnut'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0" />

      {/* Undo/Redo */}
      <div className="hidden sm:flex items-center gap-1 border-r border-border-light pr-2 mr-2">
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          className="p-2 sm:p-1.5 rounded text-walnut-secondary hover:bg-cream-alt disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          className="p-2 sm:p-1.5 rounded text-walnut-secondary hover:bg-cream-alt disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>

      {/* Save status */}
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
