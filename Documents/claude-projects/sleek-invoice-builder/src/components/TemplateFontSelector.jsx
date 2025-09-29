import { canUse, limits } from '../store/subscription';
import useSettings from '../hooks/useSettings';
import { ensureFontLoaded } from '../utils/fontLoader';

const ALL_TEMPLATES = ['Modern', 'Minimal', 'Statement'];
const FREE_TEMPLATES = ['Modern'];
const FONTS_FREE = ['System'];
const FONTS_PREMIUM = ['System', 'Inter', 'Lato', 'Merriweather'];

export default function TemplateFontSelector({ onNeedUpgrade }) {
  const cap = limits();
  const { template, setTemplate, font, setFont, paper, setPaper, logoDataUrl } = useSettings();

  const templates = cap.templates > 1 ? ALL_TEMPLATES : FREE_TEMPLATES;
  const fonts = cap.premiumFonts ? FONTS_PREMIUM : FONTS_FREE;

  async function chooseFont(f) {
    if (!fonts.includes(f)) return onNeedUpgrade?.();
    await ensureFontLoaded(f);
    setFont(f); // triggers re-render via context
  }

  function chooseTemplate(t) {
    if (!templates.includes(t)) return onNeedUpgrade?.();
    setTemplate(t); // triggers re-render via context
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-medium mb-2">Invoice template</h3>
        <div className="flex flex-wrap gap-3">
          {ALL_TEMPLATES.map(t => (
            <button
              key={t}
              onClick={() => chooseTemplate(t)}
              className={
                'w-56 rounded-xl border p-3 text-left transition ' +
                (template === t ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300 dark:border-gray-700 hover:shadow-sm') +
                (!templates.includes(t) ? ' opacity-60 cursor-pointer' : '')
              }
              title={!templates.includes(t) ? 'Premium template' : ''}
            >
              <div className="h-28 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  {logoDataUrl ? (
                    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                  ) : (
                    <div className="h-6 w-6 bg-gray-200 dark:bg-gray-800 rounded" />
                  )}
                  <div className="text-xs text-gray-500">Invoice</div>
                </div>
                <div className="mt-2 h-2 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="mt-1 h-2 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="mt-3 h-8 w-full rounded border border-dashed border-gray-300 dark:border-gray-700" />
              </div>
              <div className="mt-2 text-sm font-medium">
                {t}{!templates.includes(t) ? ' 🔒' : ''}
              </div>
              <div className="text-xs text-gray-500">{font}</div>
            </button>
          ))}
        </div>
        {!canUse('unlimited') && <p className="text-xs text-gray-500 mt-2">Free plan includes 1 template.</p>}
      </div>

      <div>
        <h3 className="font-medium mb-2">Invoice font</h3>
        <div className="flex flex-wrap gap-2">
          {FONTS_PREMIUM.map(f => {
            const locked = !fonts.includes(f);
            return (
              <button
                key={f}
                onClick={() => (locked ? onNeedUpgrade?.() : chooseFont(f))}
                className={
                  'px-3 py-2 rounded-lg border ' +
                  (font === f ? 'border-blue-600 text-blue-700' : 'border-gray-300') +
                  (locked ? ' opacity-60 cursor-pointer' : '')
                }
                title={locked ? 'Premium font' : ''}
              >
                {f}{locked ? ' 🔒' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Paper size</h3>
        <div className="flex items-center gap-2">
          {['Letter', 'A4'].map(p => (
            <button
              key={p}
              onClick={() => setPaper(p)}
              className={
                'px-3 py-2 rounded-lg border ' +
                (paper === p ? 'border-blue-600 text-blue-700' : 'border-gray-300')
              }
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Used for preview width and generated PDFs.</p>
      </div>
    </div>
  );
}