import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CollectionPage from './index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCollectionsStore = {
  collections: [],
  loading: false,
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  fetchCollections: vi.fn().mockResolvedValue([]),
};

const mockDocumentsStore = {
  documents: {},
  loading: false,
  fetchDocuments: vi.fn().mockResolvedValue([]),
  removeFromCollection: vi.fn().mockResolvedValue({}),
  reorderDocuments: vi.fn().mockResolvedValue({}),
};

const mockSubscriptionStore = {
  tier: 'free',
};

vi.mock('@/stores/collectionsStore', () => ({
  useCollectionsStore: (selector) => selector(mockCollectionsStore),
}));

vi.mock('@/stores/documentsStore', () => ({
  useDocumentsStore: (selector) => selector(mockDocumentsStore),
}));

vi.mock('@/stores/subscriptionStore', () => ({
  useSubscriptionStore: (selector) => selector(mockSubscriptionStore),
}));

vi.mock('@/services/api', () => ({
  api: { post: vi.fn(), getBlob: vi.fn() },
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/components/collection/DocumentPickerModal', () => ({
  DocumentPickerModal: ({ open }) => open ? <div data-testid="doc-picker">picker</div> : null,
}));

vi.mock('@/components/collection/ExportOptionsModal', () => ({
  __esModule: true,
  default: ({ open }) => open ? <div data-testid="export-modal">export</div> : null,
}));

vi.mock('@/components/collection/DocumentCard', () => ({
  __esModule: true,
  default: ({ document, onMoveUp, onMoveDown, onRemove, onClick }) => (
    <div data-testid={`doc-${document.id}`}>
      <span>{document.title}</span>
      {onMoveUp && <button onClick={() => onMoveUp(document.id)}>Move Up</button>}
      {onMoveDown && <button onClick={() => onMoveDown(document.id)}>Move Down</button>}
      <button onClick={() => onRemove(document.id)}>Remove</button>
      <button onClick={onClick}>View</button>
    </div>
  ),
}));

function renderCollection(collectionId = 'col-1') {
  return render(
    <MemoryRouter initialEntries={[`/app/collection/${collectionId}`]}>
      <Routes>
        <Route path="/app/collection/:id" element={<CollectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CollectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionsStore.collections = [];
    mockCollectionsStore.loading = false;
    mockDocumentsStore.documents = {};
    mockDocumentsStore.loading = false;
    mockSubscriptionStore.tier = 'free';
  });

  it('shows spinner when collections are loading', () => {
    mockCollectionsStore.loading = true;
    renderCollection();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows not found when collection does not exist', () => {
    mockCollectionsStore.loading = false;
    mockCollectionsStore.collections = [];
    renderCollection();
    expect(screen.getByText('Collection not found')).toBeInTheDocument();
  });

  it('renders collection name and description', () => {
    mockCollectionsStore.collections = [
      { id: 'col-1', name: 'Family Recipes', description: 'Grandma\'s favorites' },
    ];
    renderCollection();
    expect(screen.getByText('Family Recipes')).toBeInTheDocument();
    expect(screen.getByText("Grandma's favorites")).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    mockDocumentsStore.documents = { 'col-1': [] };
    renderCollection();
    expect(screen.getByText('Add your first document to this collection')).toBeInTheDocument();
    expect(screen.getByText('Scan a Document')).toBeInTheDocument();
  });

  it('renders document list', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    mockDocumentsStore.documents = {
      'col-1': [
        { id: 'doc-1', title: 'Recipe 1', type: 'recipe' },
        { id: 'doc-2', title: 'Letter 1', type: 'letter' },
      ],
    };
    renderCollection();
    expect(screen.getByTestId('doc-doc-1')).toBeInTheDocument();
    expect(screen.getByTestId('doc-doc-2')).toBeInTheDocument();
  });

  it('shows action buttons: Add Document, Scan New, Export PDF, Delete', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    renderCollection();
    expect(screen.getByText('Add Document')).toBeInTheDocument();
    expect(screen.getByText('Scan New')).toBeInTheDocument();
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows Create Book button for keeper tier', () => {
    mockSubscriptionStore.tier = 'keeper';
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    renderCollection();
    expect(screen.getByText('Create Book')).toBeInTheDocument();
  });

  it('does not show Create Book button for free tier', () => {
    mockSubscriptionStore.tier = 'free';
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    renderCollection();
    expect(screen.queryByText('Create Book')).not.toBeInTheDocument();
  });

  it('opens document picker when Add Document is clicked', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    renderCollection();
    fireEvent.click(screen.getByText('Add Document'));
    expect(screen.getByTestId('doc-picker')).toBeInTheDocument();
  });

  it('opens delete confirmation modal when Delete is clicked', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'My Collection' }];
    renderCollection();
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
  });

  it('calls deleteCollection and navigates on confirm delete', async () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    mockCollectionsStore.deleteCollection.mockResolvedValue();
    renderCollection();
    fireEvent.click(screen.getByText('Delete'));
    // Click the danger button inside the modal
    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((b) => b.textContent === 'Delete Collection');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(mockCollectionsStore.deleteCollection).toHaveBeenCalledWith('col-1');
    });
  });

  it('first document has no Move Up, last has no Move Down', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    mockDocumentsStore.documents = {
      'col-1': [
        { id: 'doc-1', title: 'First', type: 'recipe' },
        { id: 'doc-2', title: 'Last', type: 'recipe' },
      ],
    };
    renderCollection();
    const firstDoc = screen.getByTestId('doc-doc-1');
    const lastDoc = screen.getByTestId('doc-doc-2');
    expect(firstDoc.querySelector('button')).toBeTruthy();
    // First doc should NOT have Move Up
    expect(within(firstDoc).queryByText('Move Up')).not.toBeInTheDocument();
    // Last doc should NOT have Move Down
    expect(within(lastDoc).queryByText('Move Down')).not.toBeInTheDocument();
  });

  it('calls removeFromCollection after confirmation when Remove is clicked', async () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    mockDocumentsStore.documents = {
      'col-1': [{ id: 'doc-1', title: 'Recipe', type: 'recipe' }],
    };
    renderCollection();
    // Click Remove button on the document card — opens confirmation modal
    fireEvent.click(screen.getByText('Remove'));
    // Confirmation modal should appear
    expect(screen.getByText('Remove Document')).toBeInTheDocument();
    expect(screen.getByText(/Remove this document from the collection/)).toBeInTheDocument();
    // Click the confirm "Remove" button in the modal
    const modalButtons = screen.getAllByRole('button', { name: /Remove/i });
    const confirmBtn = modalButtons.find((btn) => btn.closest('[role="dialog"]'));
    fireEvent.click(confirmBtn);
    expect(mockDocumentsStore.removeFromCollection).toHaveBeenCalledWith('col-1', 'doc-1');
  });

  it('enables inline name editing on click', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'My Collection' }];
    renderCollection();
    fireEvent.click(screen.getByText('My Collection'));
    expect(screen.getByDisplayValue('My Collection')).toBeInTheDocument();
  });

  it('navigates back when Back button is clicked', () => {
    mockCollectionsStore.collections = [{ id: 'col-1', name: 'Test' }];
    renderCollection();
    fireEvent.click(screen.getByText('Back to collections'));
    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });
});

// Need within for scoped queries
import { within } from '@testing-library/react';
