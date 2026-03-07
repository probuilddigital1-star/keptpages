import clsx from 'clsx';
import { useBookStore } from '@/stores/bookStore';
import { TEMPLATES, FONTS } from '../constants';

export default function GlobalSettingsPanel() {
  const blueprint = useBookStore((s) => s.blueprint);
  const updateGlobalSettings = useBookStore((s) => s.updateGlobalSettings);
  const applyTemplate = useBookStore((s) => s.applyTemplate);

  const settings = blueprint?.globalSettings || {};

  return (
    <div className="p-4 space-y-5">
      <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider">
        Book Settings
      </h3>

      {/* Template picker */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-2 block">Template</label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className={clsx(
                'p-2 rounded-md border text-left transition-all',
                settings.template === t.id
                  ? 'border-terracotta bg-terracotta/5'
                  : 'border-border-light hover:border-walnut-muted/30'
              )}
            >
              <div className="flex h-2 rounded-sm overflow-hidden mb-1.5">
                {t.swatches.map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="font-ui text-[10px] font-medium text-walnut">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font family */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Font Family</label>
        <div className="space-y-1">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => updateGlobalSettings({ fontFamily: f.id })}
              className={clsx(
                'w-full p-2 rounded-md border text-left transition-all',
                settings.fontFamily === f.id
                  ? 'border-terracotta bg-terracotta/5'
                  : 'border-border-light hover:border-walnut-muted/30'
              )}
            >
              <span className="font-ui text-xs text-walnut" style={{ fontFamily: f.family }}>
                {f.label} — The quick brown fox
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section toggles */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-2 block">Include Sections</label>
        <div className="space-y-2">
          {[
            { key: 'includeTitlePage', label: 'Title Page' },
            { key: 'includeCopyright', label: 'Copyright Page' },
            { key: 'includeToc', label: 'Table of Contents' },
            { key: 'showPageNumbers', label: 'Page Numbers' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[key] ?? true}
                onChange={(e) => updateGlobalSettings({ [key]: e.target.checked })}
                className="rounded border-border text-terracotta focus:ring-terracotta/30"
              />
              <span className="font-ui text-xs text-walnut">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Header/Footer text */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Header Text</label>
        <input
          type="text"
          value={settings.headerText || ''}
          onChange={(e) => updateGlobalSettings({ headerText: e.target.value })}
          placeholder="Optional running header"
          className="w-full px-2.5 py-1.5 rounded-md border border-border-light font-ui text-xs text-walnut focus:outline-none focus:border-terracotta/50"
        />
      </div>

      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Footer Text</label>
        <input
          type="text"
          value={settings.footerText || ''}
          onChange={(e) => updateGlobalSettings({ footerText: e.target.value })}
          placeholder="Optional running footer"
          className="w-full px-2.5 py-1.5 rounded-md border border-border-light font-ui text-xs text-walnut focus:outline-none focus:border-terracotta/50"
        />
      </div>
    </div>
  );
}
