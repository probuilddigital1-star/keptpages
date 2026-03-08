import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionPickerModal } from './CollectionPickerModal';
import { useCollectionsStore } from '@/stores/collectionsStore';
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

const mockCollections = [
  { id: 'col-1', name: 'Family Recipes', itemCount: 5 },
  { id: 'col-2', name: 'Letters', itemCount: 2 },
];

describe('CollectionPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCollectionsStore.setState({
      collections: mockCollections,
      loading: false,
      fetchCollections: vi.fn().mockResolvedValue(undefined),
      createCollection: vi.fn(),
    });
    useDocumentsStore.setState({
      addToCollection: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('does not render when open is false', () => {
    render(
      <CollectionPickerModal open={false} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.queryByText('Add to Collection')).not.toBeInTheDocument();
  });

  it('renders when open is true', () => {
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.getByText('Add to Collection')).toBeInTheDocument();
  });

  it('renders existing collections', () => {
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.getByText('Family Recipes')).toBeInTheDocument();
    expect(screen.getByText('Letters')).toBeInTheDocument();
  });

  it('shows item counts for collections', () => {
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.getByText('5 items')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('shows singular "item" for collections with 1 item', () => {
    useCollectionsStore.setState({
      collections: [{ id: 'col-1', name: 'Solo', itemCount: 1 }],
      loading: false,
      fetchCollections: vi.fn().mockResolvedValue(undefined),
      createCollection: vi.fn(),
    });
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('renders Create New Collection button', () => {
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.getByRole('button', { name: /create new collection/i })).toBeInTheDocument();
  });

  it('switches to create mode when Create New Collection is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );

    await user.click(screen.getByRole('button', { name: /create new collection/i }));
    expect(screen.getByLabelText(/collection name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create & add/i })).toBeInTheDocument();
  });

  it('disables Create & Add when name is empty', async () => {
    const user = userEvent.setup();
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );

    await user.click(screen.getByRole('button', { name: /create new collection/i }));
    expect(screen.getByRole('button', { name: /create & add/i })).toBeDisabled();
  });

  it('enables Create & Add when name is entered', async () => {
    const user = userEvent.setup();
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );

    await user.click(screen.getByRole('button', { name: /create new collection/i }));
    await user.type(screen.getByLabelText(/collection name/i), 'New Collection');
    expect(screen.getByRole('button', { name: /create & add/i })).not.toBeDisabled();
  });

  it('calls addToCollection when a collection is picked', async () => {
    const addToCollection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    useDocumentsStore.setState({ addToCollection });

    const user = userEvent.setup();
    render(
      <CollectionPickerModal open={true} onClose={onClose} scanId="scan-1" />
    );

    await user.click(screen.getByText('Family Recipes'));

    expect(addToCollection).toHaveBeenCalledWith('col-1', 'scan-1');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows empty state when no collections exist', () => {
    useCollectionsStore.setState({
      collections: [],
      loading: false,
      fetchCollections: vi.fn().mockResolvedValue(undefined),
      createCollection: vi.fn(),
    });

    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.getByText(/no collections yet/i)).toBeInTheDocument();
  });

  it('returns to pick mode when Back is clicked in create mode', async () => {
    const user = userEvent.setup();
    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );

    await user.click(screen.getByRole('button', { name: /create new collection/i }));
    expect(screen.getByLabelText(/collection name/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Family Recipes')).toBeInTheDocument();
  });

  it('shows "0 items" when itemCount is 0', () => {
    useCollectionsStore.setState({
      collections: [{ id: 'col-1', name: 'Empty Col', itemCount: 0 }],
      loading: false,
      fetchCollections: vi.fn().mockResolvedValue(undefined),
      createCollection: vi.fn(),
    });

    render(
      <CollectionPickerModal open={true} onClose={vi.fn()} scanId="scan-1" />
    );
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });
});
