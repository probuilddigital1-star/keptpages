import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { useBookStore } from '@/stores/bookStore';
import { COLOR_SCHEMES, COVER_LAYOUTS } from '../constants';
import { toast } from '@/components/ui/Toast';

export default function CoverDesignerPanel() {
  const blueprint = useBookStore((s) => s.blueprint);
  const book = useBookStore((s) => s.book);
  const updateCoverDesign = useBookStore((s) => s.updateCoverDesign);
  const updateCover = useBookStore((s) => s.updateCover);
  const uploadCoverPhoto = useBookStore((s) => s.uploadCoverPhoto);
  const [uploading, setUploading] = useState(false);

  const cover = blueprint?.coverDesign || {};

  const handleChange = useCallback((data) => {
    updateCoverDesign(data);
    // Also sync with legacy coverDesign state
    updateCover(data);
  }, [updateCoverDesign, updateCover]);

  return (
    <div className="p-4 space-y-5">
      <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider">
        Cover Design
      </h3>

      {/* Title */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Title</label>
        <input
          type="text"
          value={cover.title || ''}
          onChange={(e) => handleChange({ title: e.target.value })}
          placeholder="Our Family Recipes"
          className="w-full px-2.5 py-1.5 rounded-md border border-border-light font-ui text-sm text-walnut focus:outline-none focus:border-terracotta/50"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Subtitle</label>
        <input
          type="text"
          value={cover.subtitle || ''}
          onChange={(e) => handleChange({ subtitle: e.target.value })}
          placeholder="Passed down through generations"
          className="w-full px-2.5 py-1.5 rounded-md border border-border-light font-ui text-sm text-walnut focus:outline-none focus:border-terracotta/50"
        />
      </div>

      {/* Author */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Author</label>
        <input
          type="text"
          value={cover.author || ''}
          onChange={(e) => handleChange({ author: e.target.value })}
          placeholder="The Smith Family"
          className="w-full px-2.5 py-1.5 rounded-md border border-border-light font-ui text-sm text-walnut focus:outline-none focus:border-terracotta/50"
        />
      </div>

      {/* Layout */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-2 block">Layout</label>
        <div className="space-y-1.5">
          {COVER_LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              onClick={() => handleChange({ layout: layout.id })}
              className={clsx(
                'w-full p-2 rounded-md border text-left transition-all',
                cover.layout === layout.id
                  ? 'border-terracotta bg-terracotta/5'
                  : 'border-border-light hover:border-walnut-muted/30'
              )}
            >
              <span className="font-ui text-xs font-medium text-walnut block">{layout.label}</span>
              <span className="font-ui text-[10px] text-walnut-muted">{layout.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Scheme */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-2 block">Color Scheme</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => handleChange({ colorScheme: scheme.id })}
              className={clsx(
                'flex flex-col items-center gap-1 p-1.5 rounded-md transition-all',
                cover.colorScheme === scheme.id
                  ? 'ring-2 ring-terracotta bg-cream-alt'
                  : 'hover:bg-cream-alt'
              )}
            >
              <div className="flex">
                <div className="w-5 h-5 rounded-l-full border border-border-light" style={{ backgroundColor: scheme.bg }} />
                <div className="w-5 h-5 rounded-r-full border border-border-light" style={{ backgroundColor: scheme.accent }} />
              </div>
              <span className="font-ui text-[9px] text-walnut-secondary">{scheme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cover photo */}
      <div>
        <label className="font-ui text-xs font-medium text-walnut mb-1.5 block">Cover Photo</label>
        {cover.photo && (
          <img src={cover.photo} alt="Cover preview" className="w-full h-24 object-cover rounded-md mb-2" />
        )}
        <label className={clsx(
          "flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-terracotta/40 hover:bg-cream-alt transition-all",
          uploading && "opacity-50 pointer-events-none"
        )}>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = async () => {
                const dataUrl = reader.result;
                // Show preview immediately
                handleChange({ photo: dataUrl });
                // Upload to R2 for PDF generation
                if (book?.id) {
                  setUploading(true);
                  try {
                    const result = await uploadCoverPhoto(book.id, dataUrl);
                    handleChange({ photoKey: result.photoKey, photoMimeType: 'image/jpeg' });
                  } catch {
                    toast('Failed to upload cover photo', 'error');
                  } finally {
                    setUploading(false);
                  }
                }
              };
              reader.readAsDataURL(file);
            }}
          />
          <span className="font-ui text-xs text-walnut-muted">
            {uploading ? 'Uploading...' : cover.photo ? 'Change photo' : 'Upload photo'}
          </span>
        </label>
      </div>
    </div>
  );
}
