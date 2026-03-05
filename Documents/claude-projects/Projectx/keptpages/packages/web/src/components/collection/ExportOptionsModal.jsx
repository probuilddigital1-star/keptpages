import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const TEMPLATES = [
  { value: 'classic', label: 'Classic', desc: 'Traditional serif layout' },
  { value: 'modern', label: 'Modern', desc: 'Clean contemporary feel' },
  { value: 'minimal', label: 'Minimal', desc: 'Simple and understated' },
];

const FONTS = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans-Serif' },
  { value: 'monospace', label: 'Monospace' },
];

/**
 * Export customization modal for Keeper users.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onExport: (options) => Promise<void>  — called with the chosen options
 *  - documents: array of { id, title, type }
 *  - exporting: boolean — shows spinner on submit button
 */
export default function ExportOptionsModal({
  open,
  onClose,
  onExport,
  documents = [],
  exporting = false,
}) {
  const [template, setTemplate] = useState('classic');
  const [fontFamily, setFontFamily] = useState('serif');
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  // Document selection — all selected by default
  const [selectedIds, setSelectedIds] = useState(() =>
    new Set(documents.map((d) => d.id)),
  );
  // Local ordering — starts from the prop order
  const [orderedDocs, setOrderedDocs] = useState(() => [...documents]);

  // Reset state when documents change (modal re-opens)
  const resetState = useCallback(() => {
    setTemplate('classic');
    setFontFamily('serif');
    setIncludeTitlePage(true);
    setIncludeCopyright(true);
    setIncludeToc(true);
    setShowPageNumbers(true);
    setSelectedIds(new Set(documents.map((d) => d.id)));
    setOrderedDocs([...documents]);
  }, [documents]);

  // Toggle individual document
  function toggleDoc(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(orderedDocs.map((d) => d.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function moveUp(idx) {
    if (idx <= 0) return;
    setOrderedDocs((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx) {
    if (idx >= orderedDocs.length - 1) return;
    setOrderedDocs((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  async function handleSubmit() {
    const documentIds = orderedDocs
      .filter((d) => selectedIds.has(d.id))
      .map((d) => d.id);

    await onExport({
      template,
      fontFamily,
      includeTitlePage,
      includeCopyright,
      includeToc,
      showPageNumbers,
      documentIds,
    });
  }

  const valid = selectedIds.size > 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Export Options"
      size="md"
    >
      <div className="flex flex-col gap-6">
        {/* Template */}
        <fieldset>
          <legend className="font-ui text-sm font-medium text-walnut mb-2">Template</legend>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={clsx(
                  'rounded-md border p-3 text-left transition-all',
                  template === t.value
                    ? 'border-terracotta bg-terracotta-light ring-1 ring-terracotta/30'
                    : 'border-border-light hover:border-terracotta/30',
                )}
              >
                <span className="font-ui text-sm font-semibold text-walnut block">
                  {t.label}
                </span>
                <span className="font-body text-xs text-walnut-muted">{t.desc}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Font */}
        <div>
          <label
            htmlFor="export-font"
            className="font-ui text-sm font-medium text-walnut block mb-1.5"
          >
            Font
          </label>
          <select
            id="export-font"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full bg-cream-surface border border-border rounded-md px-4 py-2.5 font-body text-walnut focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Section toggles */}
        <fieldset>
          <legend className="font-ui text-sm font-medium text-walnut mb-2">
            Include Sections
          </legend>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Title Page', checked: includeTitlePage, set: setIncludeTitlePage },
              { label: 'Copyright Page', checked: includeCopyright, set: setIncludeCopyright },
              { label: 'Table of Contents', checked: includeToc, set: setIncludeToc },
              { label: 'Page Numbers', checked: showPageNumbers, set: setShowPageNumbers },
            ].map(({ label, checked, set }) => (
              <label
                key={label}
                className="flex items-center gap-2.5 font-body text-sm text-walnut cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => set(!checked)}
                  className="rounded border-border text-terracotta focus:ring-terracotta/30 w-4 h-4"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Document selection */}
        <fieldset>
          <div className="flex items-center justify-between mb-2">
            <legend className="font-ui text-sm font-medium text-walnut">
              Documents ({selectedIds.size}/{orderedDocs.length})
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="font-ui text-xs text-terracotta hover:underline"
              >
                Select All
              </button>
              <span className="text-walnut-muted text-xs">/</span>
              <button
                type="button"
                onClick={deselectAll}
                className="font-ui text-xs text-terracotta hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="border border-border-light rounded-md divide-y divide-border-light max-h-52 overflow-y-auto">
            {orderedDocs.map((doc, idx) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                  className="rounded border-border text-terracotta focus:ring-terracotta/30 w-4 h-4 shrink-0"
                />
                <span className="font-body text-sm text-walnut truncate flex-1 min-w-0">
                  {doc.title || 'Untitled'}
                </span>
                <div className="flex gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded text-walnut-muted hover:text-walnut disabled:opacity-30 disabled:pointer-events-none"
                    aria-label="Move up"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === orderedDocs.length - 1}
                    className="p-1 rounded text-walnut-muted hover:text-walnut disabled:opacity-30 disabled:pointer-events-none"
                    aria-label="Move down"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="ghost"
            onClick={() => {
              resetState();
              onClose();
            }}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={exporting}
            disabled={!valid}
          >
            Export PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
