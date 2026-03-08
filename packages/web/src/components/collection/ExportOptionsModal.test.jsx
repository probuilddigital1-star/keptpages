import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportOptionsModal from './ExportOptionsModal';

const mockDocuments = [
  { id: 'doc-1', title: 'Apple Pie Recipe', type: 'recipe' },
  { id: 'doc-2', title: 'Grandma Letter', type: 'letter' },
  { id: 'doc-3', title: 'Travel Journal', type: 'journal' },
];

describe('ExportOptionsModal', () => {
  it('does not render when open is false', () => {
    render(
      <ExportOptionsModal
        open={false}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.queryByText('Export Options')).not.toBeInTheDocument();
  });

  it('renders when open is true', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.getByText('Export Options')).toBeInTheDocument();
  });

  it('renders all color theme options', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.getByText('Heritage')).toBeInTheDocument();
    expect(screen.getByText('Garden')).toBeInTheDocument();
    expect(screen.getByText('Heirloom')).toBeInTheDocument();
    expect(screen.getByText('Parchment')).toBeInTheDocument();
    expect(screen.getByText('Modern')).toBeInTheDocument();
  });

  it('renders the font selector', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.getByLabelText('Font')).toBeInTheDocument();
    expect(screen.getByText('Serif')).toBeInTheDocument();
    expect(screen.getByText('Sans-Serif')).toBeInTheDocument();
    expect(screen.getByText('Monospace')).toBeInTheDocument();
  });

  it('renders section toggle checkboxes', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.getByText('Title Page')).toBeInTheDocument();
    expect(screen.getByText('Copyright Page')).toBeInTheDocument();
    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
    expect(screen.getByText('Page Numbers')).toBeInTheDocument();
    expect(screen.getByText('Include Original Scans')).toBeInTheDocument();
  });

  it('renders all documents with checkboxes', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.getByText('Apple Pie Recipe')).toBeInTheDocument();
    expect(screen.getByText('Grandma Letter')).toBeInTheDocument();
    expect(screen.getByText('Travel Journal')).toBeInTheDocument();
  });

  it('shows correct document count', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });

  it('renders Select All and Deselect All buttons', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('deselects all documents when Deselect All is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );

    await user.click(screen.getByText('Deselect All'));
    expect(screen.getByText(/0\/3/)).toBeInTheDocument();
  });

  it('disables Export PDF when no documents are selected', async () => {
    const user = userEvent.setup();
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );

    await user.click(screen.getByText('Deselect All'));
    const exportBtn = screen.getByRole('button', { name: /export pdf/i });
    expect(exportBtn).toBeDisabled();
  });

  it('calls onExport with the correct options when Export PDF is clicked', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={onExport}
        documents={mockDocuments}
      />
    );

    await user.click(screen.getByRole('button', { name: /export pdf/i }));

    expect(onExport).toHaveBeenCalledTimes(1);
    const args = onExport.mock.calls[0][0];
    expect(args.template).toBe('heritage');
    expect(args.fontFamily).toBe('serif');
    expect(args.includeTitlePage).toBe(true);
    expect(args.includeCopyright).toBe(true);
    expect(args.includeToc).toBe(true);
    expect(args.showPageNumbers).toBe(true);
    expect(args.includeOriginalScans).toBe(false);
    expect(args.documentIds).toEqual(['doc-1', 'doc-2', 'doc-3']);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ExportOptionsModal
        open={true}
        onClose={onClose}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders move up/down buttons for reordering', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );

    const moveUpBtns = screen.getAllByRole('button', { name: /move up/i });
    const moveDownBtns = screen.getAllByRole('button', { name: /move down/i });
    expect(moveUpBtns.length).toBe(3);
    expect(moveDownBtns.length).toBe(3);
  });

  it('first document move up is disabled', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );

    const moveUpBtns = screen.getAllByRole('button', { name: /move up/i });
    expect(moveUpBtns[0]).toBeDisabled();
  });

  it('last document move down is disabled', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={mockDocuments}
      />
    );

    const moveDownBtns = screen.getAllByRole('button', { name: /move down/i });
    expect(moveDownBtns[moveDownBtns.length - 1]).toBeDisabled();
  });

  it('handles empty documents array', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={[]}
      />
    );
    expect(screen.getByText(/0\/0/)).toBeInTheDocument();
  });

  it('shows document title as Untitled when title is missing', () => {
    render(
      <ExportOptionsModal
        open={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        documents={[{ id: 'doc-x', title: '', type: 'document' }]}
      />
    );
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});
