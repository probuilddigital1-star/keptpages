import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignerToolbar from './DesignerToolbar';
import { useBookStore } from '@/stores/bookStore';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getBlob: vi.fn(),
  },
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

describe('DesignerToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBookStore.setState({
      generatingPdf: false,
      generatePdf: vi.fn(),
    });
  });

  it('renders all mode tabs', () => {
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saved"
        bookId="book-1"
      />
    );
    expect(screen.getByText('Cover')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Order')).toBeInTheDocument();
  });

  it('highlights the active mode tab', () => {
    render(
      <DesignerToolbar
        mode="pages"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saved"
        bookId="book-1"
      />
    );
    const pagesTab = screen.getByText('Pages').closest('button');
    expect(pagesTab.className).toContain('bg-terracotta');
  });

  it('calls onModeChange when a tab is clicked', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={onModeChange}
        onSave={vi.fn()}
        saveStatus="saved"
        bookId="book-1"
      />
    );

    await user.click(screen.getByText('Pages'));
    expect(onModeChange).toHaveBeenCalledWith('pages');
  });

  it('calls onSave when Save button is clicked', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={onSave}
        saveStatus="saved"
        bookId="book-1"
      />
    );

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows "Saved" when saveStatus is saved', () => {
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saved"
        bookId="book-1"
      />
    );
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows "Unsaved changes" when saveStatus is unsaved', () => {
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="unsaved"
        bookId="book-1"
      />
    );
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('shows "Saving..." when saveStatus is saving', () => {
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saving"
        bookId="book-1"
      />
    );
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('disables Generate PDF button when bookId is not provided', () => {
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saved"
        bookId={null}
      />
    );
    const genBtn = screen.getByRole('button', { name: /generate pdf/i });
    expect(genBtn).toBeDisabled();
  });

  it('enables Generate PDF button when bookId is provided', () => {
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saved"
        bookId="book-1"
      />
    );
    const genBtn = screen.getByRole('button', { name: /generate pdf/i });
    expect(genBtn).not.toBeDisabled();
  });

  it('renders undo and redo buttons', () => {
    render(
      <DesignerToolbar
        mode="cover"
        onModeChange={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saved"
        bookId="book-1"
      />
    );
    expect(screen.getByTitle(/undo/i)).toBeInTheDocument();
    expect(screen.getByTitle(/redo/i)).toBeInTheDocument();
  });
});
