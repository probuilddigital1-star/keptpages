import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BookDesigner from './BookDesigner';
import { useBookStore } from '@/stores/bookStore';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

// Mock the sub-components to isolate BookDesigner logic
vi.mock('./DesignerToolbar', () => ({
  default: ({ mode, onSave, saveStatus, bookId }) => (
    <div data-testid="toolbar">
      <span data-testid="toolbar-mode">{mode}</span>
      <span data-testid="toolbar-save-status">{saveStatus}</span>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));

vi.mock('./DesignerSidebar', () => ({
  default: ({ mode }) => <div data-testid="sidebar">{mode}</div>,
}));

vi.mock('./PageCanvas', () => ({
  default: ({ page, pageIndex }) => (
    <div data-testid="page-canvas">Page {pageIndex}</div>
  ),
}));

vi.mock('./OrderPanel', () => ({
  default: ({ bookId }) => <div data-testid="order-panel">OrderPanel {bookId}</div>,
}));

function renderWithRouter(ui) {
  return render(ui, { wrapper: BrowserRouter });
}

describe('BookDesigner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up a "ready" state to avoid the init async flow
    useBookStore.setState({
      book: { id: 'book-1', title: 'Test Book' },
      blueprint: {
        version: 1,
        pages: [
          { id: 'p1', kind: 'document', elements: [] },
          { id: 'p2', kind: 'custom-text', elements: [] },
        ],
        coverDesign: { title: 'Test', subtitle: '', colorScheme: 'default' },
        globalSettings: { template: 'heritage' },
      },
      selectedPageIndex: 0,
      selectedElementId: null,
      dirty: false,
      saveStatus: 'saved',
      loading: false,
      documents: [],
      coverDesign: { title: '', subtitle: '', photo: null, colorScheme: 'default' },
      loadBook: vi.fn().mockResolvedValue({ id: 'book-1' }),
      loadDocuments: vi.fn().mockResolvedValue([]),
      initBlueprint: vi.fn(),
      loadBlueprint: vi.fn(),
      saveBlueprint: vi.fn().mockResolvedValue(undefined),
      createBook: vi.fn().mockResolvedValue({ id: 'book-1' }),
      generatePdf: vi.fn(),
      generatingPdf: false,
    });
  });

  it('shows loading spinner initially before data loads', async () => {
    // Make loadBook hang so we can see the loading state
    useBookStore.setState({
      book: null,
      blueprint: null,
      loadBook: vi.fn().mockReturnValue(new Promise(() => {})),
      loadDocuments: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderWithRouter(<BookDesigner collectionId="col-1" bookId="book-1" />);
    expect(screen.getByText(/loading designer/i)).toBeInTheDocument();
  });

  it('renders toolbar once initialized', async () => {
    useBookStore.setState({
      book: null,
      blueprint: null,
      loadBook: vi.fn().mockResolvedValue({ id: 'book-1' }),
      loadDocuments: vi.fn().mockResolvedValue([]),
      initBlueprint: vi.fn(),
    });

    renderWithRouter(<BookDesigner collectionId="col-1" bookId="new" />);

    await waitFor(() => {
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });

  it('starts in cover mode', async () => {
    useBookStore.setState({
      book: null,
      blueprint: null,
      loadBook: vi.fn().mockResolvedValue({ id: 'book-1' }),
      loadDocuments: vi.fn().mockResolvedValue([]),
      initBlueprint: vi.fn(),
    });

    renderWithRouter(<BookDesigner collectionId="col-1" bookId="new" />);

    await waitFor(() => {
      expect(screen.getByTestId('toolbar-mode')).toHaveTextContent('cover');
    });
  });

  it('renders sidebar', async () => {
    useBookStore.setState({
      book: null,
      blueprint: null,
      loadBook: vi.fn().mockResolvedValue({ id: 'book-1' }),
      loadDocuments: vi.fn().mockResolvedValue([]),
      initBlueprint: vi.fn(),
    });

    renderWithRouter(<BookDesigner collectionId="col-1" bookId="new" />);

    await waitFor(() => {
      // There should be two sidebars (desktop and mobile)
      const sidebars = screen.getAllByTestId('sidebar');
      expect(sidebars.length).toBe(2);
    });
  });

  it('calls loadBook when bookId is provided and not "new"', () => {
    const loadBook = vi.fn().mockResolvedValue({ id: 'book-1' });
    const loadDocuments = vi.fn().mockResolvedValue([]);

    useBookStore.setState({
      book: null,
      blueprint: null,
      loadBook,
      loadDocuments,
      initBlueprint: vi.fn(),
    });

    renderWithRouter(<BookDesigner collectionId="col-1" bookId="book-1" />);
    expect(loadBook).toHaveBeenCalledWith('book-1');
  });

  it('does not call loadBook when bookId is "new"', () => {
    const loadBook = vi.fn().mockResolvedValue(null);
    const loadDocuments = vi.fn().mockResolvedValue([]);

    useBookStore.setState({
      book: null,
      blueprint: null,
      loadBook,
      loadDocuments,
      initBlueprint: vi.fn(),
    });

    renderWithRouter(<BookDesigner collectionId="col-1" bookId="new" />);
    expect(loadBook).not.toHaveBeenCalled();
  });

  it('initializes blueprint from documents when book has no customization', async () => {
    const initBlueprint = vi.fn();
    const docs = [{ id: 'd1', title: 'Doc 1', content: 'text' }];

    useBookStore.setState({
      book: null,
      blueprint: null,
      loadBook: vi.fn().mockResolvedValue({ id: 'book-1', title: 'My Book' }),
      loadDocuments: vi.fn().mockResolvedValue(docs),
      initBlueprint,
    });

    renderWithRouter(<BookDesigner collectionId="col-1" bookId="book-1" />);

    await waitFor(() => {
      expect(initBlueprint).toHaveBeenCalled();
    });
  });
});
