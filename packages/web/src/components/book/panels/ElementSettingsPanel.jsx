import { useRef, useCallback } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { FONTS, FRAME_STYLES, TEXT_PRESETS } from '../constants';
import { config } from '@/config/env';
import { toast } from '@/components/ui/Toast';

export default function ElementSettingsPanel({ element }) {
  const selectedPageIndex = useBookStore((s) => s.selectedPageIndex);
  const updateElement = useBookStore((s) => s.updateElement);
  const deleteElement = useBookStore((s) => s.deleteElement);
  const book = useBookStore((s) => s.book);
  const documents = useBookStore((s) => s.documents);
  const blueprint = useBookStore((s) => s.blueprint);
  const uploadBookImage = useBookStore((s) => s.uploadBookImage);
  const imageFileRef = useRef(null);

  const update = (props) => updateElement(selectedPageIndex, element.id, props);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!book?.id) {
      toast('Save the book first to upload images.', 'error');
      return;
    }
    try {
      const img = new Image();
      const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      img.src = URL.createObjectURL(file);
      await loaded;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      const jpegFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      const result = await uploadBookImage(book.id, jpegFile);
      update({ imageKey: result.key, imageMimeType: result.mimeType || 'image/jpeg' });
      toast('Image added!');
    } catch {
      toast('Failed to upload image.', 'error');
    }
    e.target.value = '';
  }, [book, uploadBookImage, update]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider">
          Element
        </h3>
        <button
          onClick={() => deleteElement(selectedPageIndex, element.id)}
          className="text-walnut-muted hover:text-red-500 transition-colors"
          title="Delete element"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Position & size */}
      <div>
        <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Position & Size</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'X', key: 'x' },
            { label: 'Y', key: 'y' },
            { label: 'W', key: 'width' },
            { label: 'H', key: 'height' },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="font-ui text-[10px] text-walnut-muted w-4">{label}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={(element[key] ?? 0).toFixed(2)}
                onChange={(e) => update({ [key]: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-1.5 py-1 rounded border border-border-light font-ui text-[10px] text-walnut w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Rotation</label>
        <input
          type="range"
          min="-180"
          max="180"
          value={element.rotation || 0}
          onChange={(e) => update({ rotation: parseInt(e.target.value) })}
          className="w-full"
        />
        <span className="font-ui text-[10px] text-walnut-muted">{element.rotation || 0}°</span>
      </div>

      {/* Text-specific controls */}
      {element.type === 'text' && (
        <>
          {/* Text presets */}
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Text Preset</label>
            <div className="flex gap-1">
              {TEXT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => update({
                    fontSize: preset.fontSize,
                    fontWeight: preset.fontWeight,
                    fontStyle: preset.fontStyle,
                    alignment: preset.alignment,
                    ...(preset.fontFamily ? { fontFamily: preset.fontFamily } : {}),
                  })}
                  className="px-2 py-1 rounded border border-border-light font-ui text-[10px] text-walnut hover:bg-cream-alt transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font family */}
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Font</label>
            <select
              value={element.fontFamily || ''}
              onChange={(e) => update({ fontFamily: e.target.value || null })}
              className="w-full px-2 py-1.5 rounded border border-border-light font-ui text-xs text-walnut"
            >
              <option value="">Use global font</option>
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">
              Size: {element.fontSize || 14}px
            </label>
            <input
              type="range"
              min="8"
              max="72"
              value={element.fontSize || 14}
              onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Font weight & style */}
          <div className="flex gap-2">
            <button
              onClick={() => update({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`px-2 py-1 rounded border font-ui text-xs font-bold transition-colors ${
                element.fontWeight === 'bold' ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-border-light text-walnut-muted'
              }`}
            >
              B
            </button>
            <button
              onClick={() => update({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`px-2 py-1 rounded border font-ui text-xs italic transition-colors ${
                element.fontStyle === 'italic' ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-border-light text-walnut-muted'
              }`}
            >
              I
            </button>
          </div>

          {/* Color */}
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Color</label>
            <input
              type="color"
              value={element.color || '#2C1810'}
              onChange={(e) => update({ color: e.target.value })}
              className="w-8 h-8 rounded border border-border-light cursor-pointer"
            />
          </div>

          {/* Alignment */}
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Alignment</label>
            <div className="flex gap-1">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  onClick={() => update({ alignment: align })}
                  className={`px-2 py-1 rounded border font-ui text-[10px] capitalize transition-colors ${
                    element.alignment === align ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-border-light text-walnut-muted'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Image-specific controls */}
      {element.type === 'image' && (
        <>
          {/* Image source */}
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Image Source</label>
            {element.imageKey ? (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-12 h-12 rounded border border-border-light bg-cream-alt overflow-hidden flex-shrink-0">
                  <img
                    src={`${config.apiUrl}/images/${element.imageKey}`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <button
                  onClick={() => update({ imageKey: null, imageMimeType: null })}
                  className="font-ui text-[10px] text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="font-ui text-[10px] text-walnut-muted mb-2">No image assigned</p>
            )}

            <button
              onClick={() => imageFileRef.current?.click()}
              className="w-full px-2 py-1.5 mb-1.5 rounded border border-dashed border-border text-center font-ui text-[10px] text-walnut-muted hover:border-terracotta/40 hover:bg-cream-alt transition-all"
            >
              Upload New Image
            </button>
            <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Pick from scans */}
            {documents.filter((d) => d.imageKey).length > 0 && (
              <div className="mt-2">
                <label className="font-ui text-[10px] text-walnut-muted block mb-1">From Scans</label>
                <div className="grid grid-cols-4 gap-1">
                  {documents.filter((d) => d.imageKey).map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => update({ imageKey: doc.imageKey, imageMimeType: 'image/jpeg' })}
                      className={`aspect-square rounded border overflow-hidden transition-all ${
                        element.imageKey === doc.imageKey
                          ? 'border-terracotta ring-1 ring-terracotta'
                          : 'border-border-light hover:border-terracotta/50'
                      }`}
                      title={doc.title}
                    >
                      <div className="w-full h-full bg-cream-alt flex items-center justify-center">
                        <span className="font-ui text-[7px] text-walnut-muted px-0.5 text-center leading-tight">{doc.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pick from uploaded images */}
            {(blueprint?.additionalImages || []).length > 0 && (
              <div className="mt-2">
                <label className="font-ui text-[10px] text-walnut-muted block mb-1">Uploaded</label>
                <div className="grid grid-cols-4 gap-1">
                  {(blueprint?.additionalImages || []).map((img) => (
                    <button
                      key={img.key}
                      onClick={() => update({ imageKey: img.key, imageMimeType: img.mimeType || 'image/jpeg' })}
                      className={`aspect-square rounded border overflow-hidden transition-all ${
                        element.imageKey === img.key
                          ? 'border-terracotta ring-1 ring-terracotta'
                          : 'border-border-light hover:border-terracotta/50'
                      }`}
                      title={img.originalName}
                    >
                      <div className="w-full h-full bg-cream-alt flex items-center justify-center">
                        <span className="font-ui text-[7px] text-walnut-muted px-0.5 text-center leading-tight">{img.originalName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Frame style */}
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Frame Style</label>
            <div className="grid grid-cols-3 gap-1">
              {FRAME_STYLES.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => update({ frameStyle: frame.id })}
                  className={`px-2 py-1 rounded border font-ui text-[10px] transition-colors ${
                    (element.frameStyle || 'none') === frame.id
                      ? 'border-terracotta bg-terracotta/10 text-terracotta'
                      : 'border-border-light text-walnut-muted'
                  }`}
                >
                  {frame.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Shape controls */}
      {(element.type === 'shape' || element.type === 'decorative') && (
        <>
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Stroke Color</label>
            <input
              type="color"
              value={element.stroke || '#c2891f'}
              onChange={(e) => update({ stroke: e.target.value })}
              className="w-8 h-8 rounded border border-border-light cursor-pointer"
            />
          </div>
          <div>
            <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">
              Stroke Width: {element.strokeWidth || 1}
            </label>
            <input
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={element.strokeWidth || 1}
              onChange={(e) => update({ strokeWidth: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          {element.type === 'shape' && (
            <div>
              <label className="font-ui text-[10px] font-medium text-walnut-muted mb-1 block">Fill Color</label>
              <input
                type="color"
                value={element.fill || '#ffffff'}
                onChange={(e) => update({ fill: e.target.value })}
                className="w-8 h-8 rounded border border-border-light cursor-pointer"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
