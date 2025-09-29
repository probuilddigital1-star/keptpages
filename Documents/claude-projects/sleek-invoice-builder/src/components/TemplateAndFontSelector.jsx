import { canUse, limits } from '../store/subscription';
import useSettings from '../hooks/useSettings';
import { ensureFontLoaded } from '../utils/fontLoader';

// ALL original templates - keeping all 6
const ALL_TEMPLATES = ['Modern', 'Traditional', 'Creative', 'Corporate', 'Medical', 'Minimal'];
const FREE_TEMPLATES = ['Modern'];

// ALL original fonts - keeping all 12
const FONTS_PREMIUM = [
  'System',
  'Inter', 
  'Lato',
  'Merriweather',
  'Roboto',
  'Open Sans',
  'Poppins',
  'Montserrat',
  'Raleway',
  'Playfair Display',
  'Source Sans Pro',
  'Ubuntu'
];
const FONTS_FREE = ['System'];

// All paper sizes
const PAPER_SIZES = ['Letter', 'A4', 'Legal'];

export default function TemplateAndFontSelector({ onNeedUpgrade }) {
  const cap = limits();
  const { template, setTemplate, font, setFont, paper, setPaper, logoDataUrl } = useSettings();

  const templates = cap.templates > 1 ? ALL_TEMPLATES : FREE_TEMPLATES;
  const fonts = cap.premiumFonts ? FONTS_PREMIUM : FONTS_FREE;

  async function chooseFont(f) {
    if (!fonts.includes(f)) return onNeedUpgrade?.();
    await ensureFontLoaded(f);
    setFont(f);
  }
  
  function chooseTemplate(t) {
    if (!templates.includes(t)) return onNeedUpgrade?.();
    setTemplate(t);
  }

  // Template color schemes for all 6 templates
  const templateColors = {
    'Modern': { bg: 'from-slate-950 to-indigo-950', accent: '#2563EB', abbr: 'M' },
    'Traditional': { bg: 'from-gray-800 to-gray-900', accent: '#4B5563', abbr: 'T' },
    'Creative': { bg: 'from-purple-600 to-pink-600', accent: '#A855F7', abbr: 'C' },
    'Corporate': { bg: 'from-blue-900 to-blue-800', accent: '#1E3A8A', abbr: 'Co' },
    'Medical': { bg: 'from-teal-600 to-teal-700', accent: '#059669', abbr: 'Me' },
    'Minimal': { bg: 'from-gray-50 to-gray-100', accent: '#E5E7EB', abbr: 'Mi' }
  };

  return (
    <div className="space-y-8">
      {/* Templates Section - ALL 6 templates */}
      <div>
        <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Invoice Templates</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_TEMPLATES.map(t => {
            const locked = !templates.includes(t);
            const active = template === t;
            const colors = templateColors[t];
            return (
              <button
                key={t}
                onClick={() => (locked ? onNeedUpgrade?.() : chooseTemplate(t))}
                className={
                  'rounded-xl border-2 p-4 text-left transition-all transform hover:scale-105 ' +
                  (active ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800 shadow-lg' : 
                   'border-gray-300 dark:border-gray-700 hover:shadow-md') +
                  (locked ? ' opacity-60 cursor-pointer' : '')
                }
                title={locked ? 'Premium template' : ''}
              >
                <div className={`h-24 rounded-lg bg-gradient-to-br ${colors.bg} p-3 mb-3 flex items-center justify-center`}>
                  <span className="text-white text-3xl font-bold opacity-80">{colors.abbr}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{font}</div>
                  </div>
                  {locked && <span className="text-lg">🔒</span>}
                </div>
              </button>
            );
          })}
        </div>
        {!canUse('unlimited') && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Free plan includes 1 template. Upgrade for all 6 templates.</p>}
      </div>

      {/* Fonts Section - ALL 12 fonts */}
      <div>
        <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Invoice Font</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {FONTS_PREMIUM.map(f => {
            const locked = !fonts.includes(f);
            const active = font === f;
            return (
              <button
                key={f}
                onClick={() => (locked ? onNeedUpgrade?.() : chooseFont(f))}
                className={
                  'px-3 py-2 rounded-lg border transition-all ' +
                  (active ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 
                   'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800') +
                  (locked ? ' opacity-60 cursor-pointer' : '')
                }
                title={locked ? 'Premium font' : ''}
                style={{ fontFamily: f === 'System' ? 'inherit' : f }}
              >
                {f}{locked ? ' 🔒' : ''}
              </button>
            );
          })}
        </div>
        {!canUse('premiumFonts') && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Premium unlocks 11 additional font choices.</p>}
      </div>

      {/* Paper Size Section - ALL 3 sizes */}
      <div>
        <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Paper Size</h3>
        <div className="grid grid-cols-3 gap-2">
          {PAPER_SIZES.map(p => (
            <button
              key={p}
              onClick={() => setPaper(p)}
              className={
                'px-3 py-2 rounded-lg border transition-all flex flex-col items-center ' +
                (paper === p ?
                 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' :
                 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800')
              }
            >
              <span className="font-medium">{p}</span>
              <span className="text-xs mt-0.5 opacity-75">
                {p === 'Letter' && '(8.5×11")'}
                {p === 'A4' && '(210×297mm)'}
                {p === 'Legal' && '(8.5×14")'}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Paper size affects preview width and generated PDFs.</p>
      </div>
    </div>
  );
}