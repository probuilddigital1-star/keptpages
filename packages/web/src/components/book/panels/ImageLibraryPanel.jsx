import { useCallback, useRef, useState, useEffect } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { toast } from '@/components/ui/Toast';
import api from '@/services/api';

// Thumbnail that fetches image with auth headers
function AuthThumb({ imageKey, alt, className }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!imageKey) return;
    let cancelled = false;
    let url = null;
    (async () => {
      try {
        const blob = await api.getBlob(`/images/${imageKey}`);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageKey]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-ui text-[8px] text-walnut-muted px-1 text-center truncate">{alt}</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} />;
}

export default function ImageLibraryPanel() {
  const documents = useBookStore((s) => s.documents);
  const blueprint = useBookStore((s) => s.blueprint);
  const book = useBookStore((s) => s.book);
  const selectedPageIndex = useBookStore((s) => s.selectedPageIndex);
  const addElement = useBookStore((s) => s.addElement);
  const uploadBookImage = useBookStore((s) => s.uploadBookImage);
  const deleteBookImage = useBookStore((s) => s.deleteBookImage);
  const fileRef = useRef(null);

  const additionalImages = blueprint?.additionalImages || [];
  const scanImages = documents.filter((d) => d.imageKey);

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('Image must be under 10MB.', 'error');
      return;
    }
    if (additionalImages.length >= 50) {
      toast('Maximum 50 additional images per book.', 'error');
      return;
    }
    if (!book?.id) {
      toast('Please save the book first.', 'error');
      return;
    }

    try {
      // Convert to JPEG via canvas
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

      await uploadBookImage(book.id, jpegFile);
      toast('Image uploaded!');
    } catch {
      toast('Failed to upload image.', 'error');
    }
    e.target.value = '';
  }, [book, additionalImages, uploadBookImage]);

  const handleAddToPage = useCallback((imageKey, mimeType) => {
    addElement(selectedPageIndex, {
      type: 'image',
      x: 0.15, y: 0.15, width: 0.7, height: 0.5,
      imageKey, imageMimeType: mimeType || 'image/jpeg',
      frameStyle: 'none',
    });
  }, [selectedPageIndex, addElement]);

  return (
    <div className="p-4">
      <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider mb-2">
        Images
      </h3>

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full px-3 py-2 mb-3 rounded border border-dashed border-border text-center font-ui text-xs text-walnut-muted hover:border-terracotta/40 hover:bg-cream-alt transition-all"
      >
        + Upload Image
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Scan images */}
      {scanImages.length > 0 && (
        <div className="mb-3">
          <label className="font-ui text-[10px] text-walnut-muted block mb-1">From Scans</label>
          <div className="grid grid-cols-3 gap-1">
            {scanImages.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleAddToPage(doc.imageKey, 'image/jpeg')}
                className="aspect-square rounded border border-border-light bg-cream-alt overflow-hidden hover:ring-1 hover:ring-terracotta/50 transition-all"
                title={doc.title}
              >
                <AuthThumb imageKey={doc.imageKey} alt={doc.title} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Additional uploaded images */}
      {additionalImages.length > 0 && (
        <div>
          <label className="font-ui text-[10px] text-walnut-muted block mb-1">Uploaded</label>
          <div className="grid grid-cols-3 gap-1">
            {additionalImages.map((img) => (
              <div key={img.key} className="relative group">
                <button
                  onClick={() => handleAddToPage(img.key, img.mimeType)}
                  className="w-full aspect-square rounded border border-border-light bg-cream-alt overflow-hidden hover:ring-1 hover:ring-terracotta/50 transition-all"
                  title={img.originalName}
                >
                  <AuthThumb imageKey={img.key} alt={img.originalName} className="w-full h-full object-cover" />
                </button>
                <button
                  onClick={() => book?.id && deleteBookImage(book.id, img.key)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
