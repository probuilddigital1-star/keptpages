import { useBookStore } from '@/stores/bookStore';
import { PAGE_KINDS } from '../constants';

const ICONS = {
  'file-text': <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
  'type': <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></>,
  'image': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
  'layout': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="3" x2="12" y2="21" /></>,
  'minus': <line x1="5" y1="12" x2="19" y2="12" />,
  'heart': <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  'square': <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />,
  'edit-3': <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
  'list': <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
  'clipboard': <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></>,
};

export default function AddPagePanel() {
  const addPage = useBookStore((s) => s.addPage);
  const selectedPageIndex = useBookStore((s) => s.selectedPageIndex);

  return (
    <div className="p-4">
      <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider mb-2">
        Add Page
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {PAGE_KINDS.filter((k) => k.id !== 'document').map((kind) => (
          <button
            key={kind.id}
            onClick={() => addPage(kind.id, selectedPageIndex)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-border-light text-left hover:bg-cream-alt hover:border-walnut-muted/30 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-walnut-muted shrink-0">
              {ICONS[kind.icon]}
            </svg>
            <span className="font-ui text-[10px] text-walnut">{kind.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
