import clsx from 'clsx';
import { useBookStore } from '@/stores/bookStore';
import { TEXTURES } from '../constants';

export default function PageSettingsPanel({ page, pageIndex }) {
  const updatePageBackground = useBookStore((s) => s.updatePageBackground);

  const bg = page.background || { type: 'solid', color: '#ffffff' };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider">
        Page Background
      </h3>

      {/* Background color */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={bg.color || '#ffffff'}
            onInput={(e) => updatePageBackground(pageIndex, { color: e.target.value })}
            onChange={(e) => updatePageBackground(pageIndex, { color: e.target.value })}
            className="w-8 h-8 rounded border border-border-light cursor-pointer"
          />
          <input
            type="text"
            value={bg.color || '#ffffff'}
            onChange={(e) => updatePageBackground(pageIndex, { color: e.target.value })}
            className="flex-1 px-2 py-1 rounded border border-border-light font-ui text-xs text-walnut"
          />
        </div>
      </div>

      {/* Texture */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Texture</label>
        <div className="grid grid-cols-3 gap-1.5">
          {TEXTURES.map((t) => (
            <button
              key={t.id}
              onClick={() => updatePageBackground(pageIndex, { type: t.id === 'none' ? 'solid' : 'texture', texture: t.id === 'none' ? null : t.id })}
              className={clsx(
                'px-2 py-1.5 rounded border text-center transition-all font-ui text-[10px]',
                (bg.texture === t.id || (t.id === 'none' && !bg.texture))
                  ? 'border-terracotta bg-terracotta/5 text-walnut'
                  : 'border-border-light text-walnut-muted hover:border-walnut-muted/30'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
