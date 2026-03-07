import PageListPanel from './panels/PageListPanel';
import GlobalSettingsPanel from './panels/GlobalSettingsPanel';
import PageSettingsPanel from './panels/PageSettingsPanel';
import ElementSettingsPanel from './panels/ElementSettingsPanel';
import AddPagePanel from './panels/AddPagePanel';
import AddElementPanel from './panels/AddElementPanel';
import ImageLibraryPanel from './panels/ImageLibraryPanel';
import CoverDesignerPanel from './panels/CoverDesignerPanel';
import { useBookStore } from '@/stores/bookStore';

export default function DesignerSidebar({ mode }) {
  const selectedElementId = useBookStore((s) => s.selectedElementId);
  const blueprint = useBookStore((s) => s.blueprint);
  const selectedPageIndex = useBookStore((s) => s.selectedPageIndex);

  const currentPage = blueprint?.pages?.[selectedPageIndex];
  const selectedElement = currentPage?.elements?.find((el) => el.id === selectedElementId);

  if (mode === 'cover') {
    return <CoverDesignerPanel />;
  }

  if (mode === 'settings') {
    return <GlobalSettingsPanel />;
  }

  if (mode === 'order') {
    return null;
  }

  // Pages mode
  return (
    <div className="flex flex-col h-full">
      <PageListPanel />

      <div className="border-t border-border-light">
        <AddPagePanel />
      </div>

      <div className="border-t border-border-light">
        <AddElementPanel />
      </div>

      {selectedElement && (
        <div className="border-t border-border-light">
          <ElementSettingsPanel element={selectedElement} />
        </div>
      )}

      {currentPage && (
        <div className="border-t border-border-light">
          <PageSettingsPanel page={currentPage} pageIndex={selectedPageIndex} />
        </div>
      )}

      <div className="border-t border-border-light">
        <ImageLibraryPanel />
      </div>
    </div>
  );
}
