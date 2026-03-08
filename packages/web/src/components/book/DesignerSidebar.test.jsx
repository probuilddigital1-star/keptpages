import { render, screen } from '@testing-library/react';
import DesignerSidebar from './DesignerSidebar';
import { useBookStore } from '@/stores/bookStore';

// Mock all panel sub-components to isolate sidebar logic
vi.mock('./panels/PageListPanel', () => ({
  default: () => <div data-testid="page-list-panel">PageListPanel</div>,
}));
vi.mock('./panels/GlobalSettingsPanel', () => ({
  default: () => <div data-testid="global-settings-panel">GlobalSettingsPanel</div>,
}));
vi.mock('./panels/PageSettingsPanel', () => ({
  default: ({ page, pageIndex }) => (
    <div data-testid="page-settings-panel">PageSettingsPanel {pageIndex}</div>
  ),
}));
vi.mock('./panels/ElementSettingsPanel', () => ({
  default: ({ element }) => (
    <div data-testid="element-settings-panel">ElementSettingsPanel {element.id}</div>
  ),
}));
vi.mock('./panels/AddPagePanel', () => ({
  default: () => <div data-testid="add-page-panel">AddPagePanel</div>,
}));
vi.mock('./panels/AddElementPanel', () => ({
  default: () => <div data-testid="add-element-panel">AddElementPanel</div>,
}));
vi.mock('./panels/ImageLibraryPanel', () => ({
  default: () => <div data-testid="image-library-panel">ImageLibraryPanel</div>,
}));
vi.mock('./panels/CoverDesignerPanel', () => ({
  default: () => <div data-testid="cover-designer-panel">CoverDesignerPanel</div>,
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('DesignerSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBookStore.setState({
      selectedElementId: null,
      blueprint: {
        pages: [
          {
            id: 'page-1',
            kind: 'document',
            elements: [
              { id: 'el-1', type: 'text', text: 'Hello' },
              { id: 'el-2', type: 'image', imageKey: 'img.jpg' },
            ],
          },
          {
            id: 'page-2',
            kind: 'custom-text',
            elements: [],
          },
        ],
      },
      selectedPageIndex: 0,
    });
  });

  it('renders CoverDesignerPanel when mode is cover', () => {
    render(<DesignerSidebar mode="cover" />);
    expect(screen.getByTestId('cover-designer-panel')).toBeInTheDocument();
  });

  it('renders GlobalSettingsPanel when mode is settings', () => {
    render(<DesignerSidebar mode="settings" />);
    expect(screen.getByTestId('global-settings-panel')).toBeInTheDocument();
  });

  it('returns null when mode is order', () => {
    const { container } = render(<DesignerSidebar mode="order" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders pages mode panels by default', () => {
    render(<DesignerSidebar mode="pages" />);
    expect(screen.getByTestId('page-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('add-page-panel')).toBeInTheDocument();
    expect(screen.getByTestId('add-element-panel')).toBeInTheDocument();
    expect(screen.getByTestId('image-library-panel')).toBeInTheDocument();
  });

  it('renders PageSettingsPanel when a page is selected', () => {
    render(<DesignerSidebar mode="pages" />);
    expect(screen.getByTestId('page-settings-panel')).toBeInTheDocument();
  });

  it('renders ElementSettingsPanel when an element is selected', () => {
    useBookStore.setState({ selectedElementId: 'el-1' });
    render(<DesignerSidebar mode="pages" />);
    expect(screen.getByTestId('element-settings-panel')).toBeInTheDocument();
  });

  it('does not render ElementSettingsPanel when no element is selected', () => {
    useBookStore.setState({ selectedElementId: null });
    render(<DesignerSidebar mode="pages" />);
    expect(screen.queryByTestId('element-settings-panel')).not.toBeInTheDocument();
  });

  it('does not render PageSettingsPanel when blueprint is null', () => {
    useBookStore.setState({ blueprint: null });
    render(<DesignerSidebar mode="pages" />);
    expect(screen.queryByTestId('page-settings-panel')).not.toBeInTheDocument();
  });
});
