import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentPickerModal } from './DocumentPickerModal';
import { useScanStore } from '@/stores/scanStore';
import { useDocumentsStore } from '@/stores/documentsStore';

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

const mockScans = [
  {
    id: 'scan-1',
    title: 'Apple Pie Recipe',
    documentType: 'recipe',
    status: 'completed',
    originalFilename: 'apple.jpg',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'scan-2',
    title: 'Grandma Letter',
    documentType: 'letter',
    status: 'completed',
    originalFilename: 'letter.jpg',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'scan-3',
    title: 'Processing Scan',
    documentType: 'document',
    status: 'processing',
    originalFilename: 'process.jpg',
    createdAt: '2026-01-25T10:00:00Z',
  },
];

describe('DocumentPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScanStore.setState({
      scans: mockScans,
      fetchScans: vi.fn().mockResolvedValue(undefined),
    });
    useDocumentsStore.setState({
      addToCollection: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('does not render when open is false', () => {
    render(
      <DocumentPickerModal
        open={false}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );
    expect(screen.queryByText('Add Documents')).not.toBeInTheDocument();
  });

  it('renders when open is true', () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );
    expect(screen.getByText('Add Documents')).toBeInTheDocument();
  });

  it('only shows completed scans', async () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );
    // Wait for async fetchScans to complete and loading state to clear
    await waitFor(() => {
      expect(screen.getByText('Apple Pie Recipe')).toBeInTheDocument();
    });
    expect(screen.getByText('Grandma Letter')).toBeInTheDocument();
    // Processing scans should not be shown
    expect(screen.queryByText('Processing Scan')).not.toBeInTheDocument();
  });

  it('filters out scans already in the collection', async () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
        existingItems={[{ id: 'scan-1' }]}
      />
    );
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText('Grandma Letter')).toBeInTheDocument();
    });
    // scan-1 is already in the collection
    expect(screen.queryByText('Apple Pie Recipe')).not.toBeInTheDocument();
  });

  it('shows empty message when all scans are already in collection', async () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
        existingItems={[{ id: 'scan-1' }, { id: 'scan-2' }]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/all your scans are already/i)).toBeInTheDocument();
    });
  });

  it('shows empty message when no scans exist', async () => {
    useScanStore.setState({
      scans: [],
      fetchScans: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/no scans yet/i)).toBeInTheDocument();
    });
  });

  it('shows selected count', async () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/0 selected/i)).toBeInTheDocument();
    });
  });

  it('toggles selection when a scan is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Apple Pie Recipe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Apple Pie Recipe'));
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it('disables Add button when no scans are selected', async () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/0 selected/i)).toBeInTheDocument();
    });
    const addBtn = screen.getByRole('button', { name: /^add/i });
    expect(addBtn).toBeDisabled();
  });

  it('enables Add button when scans are selected', async () => {
    const user = userEvent.setup();
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Apple Pie Recipe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Apple Pie Recipe'));
    const addBtn = screen.getByRole('button', { name: /add \(1\)/i });
    expect(addBtn).not.toBeDisabled();
  });

  it('renders document type badges', async () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Recipe')).toBeInTheDocument();
    });
    expect(screen.getByText('Letter')).toBeInTheDocument();
  });

  it('calls addToCollection for each selected scan when Add is clicked', async () => {
    const addToCollection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    useDocumentsStore.setState({ addToCollection });

    const user = userEvent.setup();
    render(
      <DocumentPickerModal
        open={true}
        onClose={onClose}
        collectionId="col-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Apple Pie Recipe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Apple Pie Recipe'));
    await user.click(screen.getByText('Grandma Letter'));

    await user.click(screen.getByRole('button', { name: /add \(2\)/i }));

    await waitFor(() => {
      expect(addToCollection).toHaveBeenCalledTimes(2);
    });
    expect(addToCollection).toHaveBeenCalledWith('col-1', 'scan-1');
    expect(addToCollection).toHaveBeenCalledWith('col-1', 'scan-2');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentPickerModal
        open={true}
        onClose={onClose}
        collectionId="col-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/0 selected/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters existing items with nested scan objects', async () => {
    render(
      <DocumentPickerModal
        open={true}
        onClose={vi.fn()}
        collectionId="col-1"
        existingItems={[{ scan: { id: 'scan-1' } }]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Grandma Letter')).toBeInTheDocument();
    });
    expect(screen.queryByText('Apple Pie Recipe')).not.toBeInTheDocument();
  });
});
