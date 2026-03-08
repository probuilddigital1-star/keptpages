import { useBookStore } from './bookStore';
import api from '@/services/api';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock crypto.randomUUID for deterministic tests
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${++uuidCounter}`,
});

function makeBlueprint(pageCount = 2) {
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    id: `page-${i}`,
    kind: 'document',
    background: { type: 'solid', color: '#ffffff' },
    elements: [
      { id: `el-${i}-title`, type: 'text', text: `Title ${i}`, fontSize: 28, fontWeight: 'bold' },
      { id: `el-${i}-body`, type: 'text', text: `Body ${i}`, fontSize: 14, fontWeight: 'normal' },
    ],
  }));

  return {
    version: 1,
    globalSettings: { template: 'heritage', fontFamily: 'fraunces' },
    coverDesign: { title: 'Test', subtitle: '', colorScheme: 'default', layout: 'centered' },
    pages,
    additionalImages: [],
  };
}

describe('bookStore blueprint operations', () => {
  beforeEach(() => {
    uuidCounter = 0;
    vi.clearAllMocks();
    useBookStore.setState({
      book: null,
      blueprint: null,
      selectedPageIndex: 0,
      selectedElementId: null,
      dirty: false,
      saveStatus: 'saved',
      loading: false,
      generatingPdf: false,
      template: 'heritage',
      chapters: [],
      coverDesign: { title: '', subtitle: '', photo: null, colorScheme: 'default' },
      documents: [],
    });
  });

  describe('initBlueprint', () => {
    it('creates a blueprint from documents', () => {
      const docs = [
        { id: 'd1', title: 'Recipe 1', content: 'Mix flour...' },
        { id: 'd2', title: 'Recipe 2', content: 'Bake at...' },
      ];
      useBookStore.getState().initBlueprint(docs, { title: 'My Book' });

      const state = useBookStore.getState();
      expect(state.blueprint).not.toBeNull();
      expect(state.blueprint.pages.length).toBe(2);
      expect(state.dirty).toBe(true);
      expect(state.selectedPageIndex).toBe(0);
    });

    it('creates empty blueprint when documents is empty', () => {
      useBookStore.getState().initBlueprint([], { title: 'Empty Book' });

      const state = useBookStore.getState();
      expect(state.blueprint.pages.length).toBe(0);
    });
  });

  describe('loadBlueprint', () => {
    it('loads an existing customization', () => {
      const bp = makeBlueprint(3);
      useBookStore.getState().loadBlueprint(bp);

      const state = useBookStore.getState();
      expect(state.blueprint).toEqual(bp);
      expect(state.dirty).toBe(false);
      expect(state.selectedPageIndex).toBe(0);
    });

    it('does not load if customization has no pages', () => {
      useBookStore.getState().loadBlueprint({ pages: [] });
      expect(useBookStore.getState().blueprint).toBeNull();
    });

    it('does not load if customization is null', () => {
      useBookStore.getState().loadBlueprint(null);
      expect(useBookStore.getState().blueprint).toBeNull();
    });
  });

  describe('addPage', () => {
    it('adds a page at the end by default', () => {
      useBookStore.setState({ blueprint: makeBlueprint(2) });
      useBookStore.getState().addPage('blank');

      const state = useBookStore.getState();
      expect(state.blueprint.pages.length).toBe(3);
      expect(state.blueprint.pages[2].kind).toBe('blank');
      expect(state.selectedPageIndex).toBe(2);
      expect(state.dirty).toBe(true);
    });

    it('inserts page after specified index', () => {
      useBookStore.setState({ blueprint: makeBlueprint(3) });
      useBookStore.getState().addPage('section-divider', 0);

      const state = useBookStore.getState();
      expect(state.blueprint.pages.length).toBe(4);
      expect(state.blueprint.pages[1].kind).toBe('section-divider');
      expect(state.selectedPageIndex).toBe(1);
    });

    it('does nothing when blueprint is null', () => {
      useBookStore.setState({ blueprint: null });
      useBookStore.getState().addPage('blank');
      expect(useBookStore.getState().blueprint).toBeNull();
    });
  });

  describe('removePage', () => {
    it('removes the specified page', () => {
      useBookStore.setState({ blueprint: makeBlueprint(3), selectedPageIndex: 1 });
      useBookStore.getState().removePage(1);

      const state = useBookStore.getState();
      expect(state.blueprint.pages.length).toBe(2);
      expect(state.dirty).toBe(true);
    });

    it('does not remove the last remaining page', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      useBookStore.getState().removePage(0);

      expect(useBookStore.getState().blueprint.pages.length).toBe(1);
    });

    it('adjusts selectedPageIndex when removing current page', () => {
      useBookStore.setState({ blueprint: makeBlueprint(3), selectedPageIndex: 2 });
      useBookStore.getState().removePage(2);

      expect(useBookStore.getState().selectedPageIndex).toBe(1);
    });
  });

  describe('reorderPages', () => {
    it('moves page from one index to another', () => {
      useBookStore.setState({ blueprint: makeBlueprint(3) });
      useBookStore.getState().reorderPages(0, 2);

      const state = useBookStore.getState();
      expect(state.blueprint.pages[2].id).toBe('page-0');
      expect(state.selectedPageIndex).toBe(2);
      expect(state.dirty).toBe(true);
    });
  });

  describe('addElement', () => {
    it('adds an element to the specified page', () => {
      useBookStore.setState({ blueprint: makeBlueprint(2) });
      useBookStore.getState().addElement(0, { type: 'text', text: 'New element' });

      const state = useBookStore.getState();
      expect(state.blueprint.pages[0].elements.length).toBe(3);
      expect(state.selectedElementId).toBeTruthy();
      expect(state.dirty).toBe(true);
    });
  });

  describe('updateElement', () => {
    it('updates properties of an element', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      useBookStore.getState().updateElement(0, 'el-0-title', { text: 'Updated Title' });

      const state = useBookStore.getState();
      const el = state.blueprint.pages[0].elements.find((e) => e.id === 'el-0-title');
      expect(el.text).toBe('Updated Title');
      expect(state.dirty).toBe(true);
    });
  });

  describe('deleteElement', () => {
    it('deletes an element from a page', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1), selectedElementId: 'el-0-title' });
      useBookStore.getState().deleteElement(0, 'el-0-title');

      const state = useBookStore.getState();
      expect(state.blueprint.pages[0].elements.length).toBe(1);
      expect(state.selectedElementId).toBeNull();
    });

    it('preserves selectedElementId if a different element is deleted', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1), selectedElementId: 'el-0-title' });
      useBookStore.getState().deleteElement(0, 'el-0-body');

      expect(useBookStore.getState().selectedElementId).toBe('el-0-title');
    });
  });

  describe('applyTemplate', () => {
    it('updates page colors based on template', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      useBookStore.getState().applyTemplate('modern');

      const state = useBookStore.getState();
      const page = state.blueprint.pages[0];
      expect(page.background.color).toBe('#FFFFFF');
      // Title text (fontSize 28, bold) should use titleColor
      const titleEl = page.elements.find((e) => e.fontWeight === 'bold');
      expect(titleEl.color).toBe('#141414');
      // Body text should use bodyColor
      const bodyEl = page.elements.find((e) => e.fontWeight !== 'bold');
      expect(bodyEl.color).toBe('#333333');
    });

    it('does nothing for non-existent template', () => {
      const bp = makeBlueprint(1);
      useBookStore.setState({ blueprint: bp });
      useBookStore.getState().applyTemplate('nonexistent');

      // Blueprint should be unchanged
      expect(useBookStore.getState().blueprint.pages[0].background.color).toBe('#ffffff');
    });
  });

  describe('saveBlueprint', () => {
    it('saves blueprint via API', async () => {
      const bp = makeBlueprint(1);
      useBookStore.setState({ blueprint: bp });
      api.put.mockResolvedValue({});

      await useBookStore.getState().saveBlueprint('book-1');

      expect(api.put).toHaveBeenCalledWith('/books/book-1', { customization: bp });
      expect(useBookStore.getState().saveStatus).toBe('saved');
      expect(useBookStore.getState().dirty).toBe(false);
    });

    it('sets saveStatus to unsaved on failure', async () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      api.put.mockRejectedValue(new Error('Network error'));

      await expect(useBookStore.getState().saveBlueprint('book-1')).rejects.toThrow();
      expect(useBookStore.getState().saveStatus).toBe('unsaved');
    });

    it('does nothing when blueprint is null', async () => {
      useBookStore.setState({ blueprint: null });
      await useBookStore.getState().saveBlueprint('book-1');
      expect(api.put).not.toHaveBeenCalled();
    });

    it('does nothing when bookId is falsy', async () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      await useBookStore.getState().saveBlueprint(null);
      expect(api.put).not.toHaveBeenCalled();
    });
  });

  describe('updateCoverDesign', () => {
    it('merges cover design data', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      useBookStore.getState().updateCoverDesign({ title: 'New Title', author: 'Jane' });

      const cover = useBookStore.getState().blueprint.coverDesign;
      expect(cover.title).toBe('New Title');
      expect(cover.author).toBe('Jane');
      expect(cover.colorScheme).toBe('default'); // preserved
    });
  });

  describe('updateGlobalSettings', () => {
    it('merges global settings', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      useBookStore.getState().updateGlobalSettings({ fontFamily: 'outfit', headerText: 'My Header' });

      const settings = useBookStore.getState().blueprint.globalSettings;
      expect(settings.fontFamily).toBe('outfit');
      expect(settings.headerText).toBe('My Header');
      expect(settings.template).toBe('heritage'); // preserved
    });
  });

  describe('loadDocuments', () => {
    it('loads and transforms documents from API', async () => {
      api.get.mockResolvedValue({
        items: [
          {
            id: 'item-1',
            scan: {
              title: 'Recipe',
              extractedData: { text: 'Mix flour' },
              documentType: 'recipe',
              r2Key: 'img-key',
            },
          },
        ],
      });

      const docs = await useBookStore.getState().loadDocuments('col-1');
      expect(docs.length).toBe(1);
      expect(docs[0].title).toBe('Recipe');
      expect(docs[0].content).toBe('Mix flour');
      expect(docs[0].imageKey).toBe('img-key');
    });

    it('handles API failure gracefully', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      const docs = await useBookStore.getState().loadDocuments('col-1');
      expect(docs).toEqual([]);
      expect(useBookStore.getState().documents).toEqual([]);
    });

    it('uses item.title as fallback when scan is missing, falls back to Untitled when both are absent', async () => {
      api.get.mockResolvedValue({
        items: [
          { id: 'item-1', title: 'Direct Doc' },
          { id: 'item-2' },
        ],
      });

      const docs = await useBookStore.getState().loadDocuments('col-1');
      // item.scan?.title is undefined, so it falls back to item.title
      expect(docs[0].title).toBe('Direct Doc');
      expect(docs[0].content).toBe('');
      // When neither scan.title nor item.title exist, falls back to 'Untitled'
      expect(docs[1].title).toBe('Untitled');
    });
  });

  describe('additionalImages', () => {
    it('adds an image to the list', () => {
      useBookStore.setState({ blueprint: makeBlueprint(1) });
      useBookStore.getState().addAdditionalImage({ key: 'img-1', url: 'http://example.com/img.jpg' });

      expect(useBookStore.getState().blueprint.additionalImages.length).toBe(1);
    });

    it('removes an image by key', () => {
      const bp = makeBlueprint(1);
      bp.additionalImages = [
        { key: 'img-1', url: 'http://example.com/1.jpg' },
        { key: 'img-2', url: 'http://example.com/2.jpg' },
      ];
      useBookStore.setState({ blueprint: bp });

      useBookStore.getState().removeAdditionalImage('img-1');

      const images = useBookStore.getState().blueprint.additionalImages;
      expect(images.length).toBe(1);
      expect(images[0].key).toBe('img-2');
    });
  });
});
