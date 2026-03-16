import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import Dashboard from './index';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchCollections = vi.fn().mockResolvedValue([]);
const mockCreateCollection = vi.fn();
const mockFetchSubscription = vi.fn().mockResolvedValue({});

vi.mock('@/stores/collectionsStore', () => ({
  useCollectionsStore: vi.fn(),
}));

vi.mock('@/stores/subscriptionStore', () => ({
  useSubscriptionStore: vi.fn(),
}));

vi.mock('@/stores/bookStore', () => ({
  useBookStore: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

import { useCollectionsStore } from '@/stores/collectionsStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useBookStore } from '@/stores/bookStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock CollectionCard to simplify assertions
vi.mock('@/components/collection/CollectionCard', () => ({
  default: ({ collection }) => (
    <div data-testid={`collection-card-${collection.id}`}>{collection.name}</div>
  ),
}));

// Mock BookDraftCard
vi.mock('@/components/book/BookDraftCard', () => ({
  default: ({ draft }) =>
    draft ? <div data-testid="book-draft-card">{draft.title}</div> : null,
}));

const mockFetchLatestDraft = vi.fn().mockResolvedValue(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupCollectionsStore(overrides = {}) {
  const defaults = {
    collections: [],
    loading: false,
    error: null,
    fetchCollections: mockFetchCollections,
    createCollection: mockCreateCollection,
  };

  const merged = { ...defaults, ...overrides };

  // useCollectionsStore is called with a selector: useCollectionsStore((s) => s.fieldName)
  useCollectionsStore.mockImplementation((selector) => selector(merged));
}

function setupSubscriptionStore(overrides = {}) {
  const defaults = {
    tier: 'free',
    usage: { scans: 0, collections: 0 },
    limits: { scans: 25, collections: 1 },
    fetchSubscription: mockFetchSubscription,
  };

  const merged = { ...defaults, ...overrides };
  useSubscriptionStore.mockImplementation((selector) => selector(merged));
}

function setupBookStore(overrides = {}) {
  const defaults = {
    drafts: [],
    fetchLatestDraft: mockFetchLatestDraft,
  };

  const merged = { ...defaults, ...overrides };
  useBookStore.mockImplementation((selector) => selector(merged));
}

function renderDashboard() {
  return renderWithRouter(<Dashboard />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCollectionsStore();
    setupSubscriptionStore();
    setupBookStore();
  });

  it('renders page title "Your Collections"', () => {
    renderDashboard();
    expect(screen.getByText('Your Collections')).toBeInTheDocument();
  });

  it('renders "New Collection" button', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /new collection/i })).toBeInTheDocument();
  });

  it('renders collection cards when collections exist', () => {
    setupCollectionsStore({
      collections: [
        { id: 'c1', name: 'Grandma Recipes', document_count: 5 },
        { id: 'c2', name: 'Family Letters', document_count: 12 },
      ],
    });

    renderDashboard();

    expect(screen.getByTestId('collection-card-c1')).toBeInTheDocument();
    expect(screen.getByText('Grandma Recipes')).toBeInTheDocument();
    expect(screen.getByTestId('collection-card-c2')).toBeInTheDocument();
    expect(screen.getByText('Family Letters')).toBeInTheDocument();
  });

  it('shows empty state when no collections', () => {
    setupCollectionsStore({ collections: [], loading: false });

    renderDashboard();

    expect(
      screen.getByText(/start preserving your family/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create your first collection/i }),
    ).toBeInTheDocument();
  });

  it('shows loading skeleton when loading=true', () => {
    setupCollectionsStore({ loading: true, collections: [] });

    renderDashboard();

    // Skeleton cards render as pulsing placeholders instead of a spinner
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows scan usage bar for free tier users', () => {
    setupSubscriptionStore({
      tier: 'free',
      usage: { scans: 10, collections: 1 },
      limits: { scans: 25, collections: 1 },
    });

    renderDashboard();

    expect(screen.getByText('Scan Usage')).toBeInTheDocument();
    expect(screen.getByText('10 of 25 scans used')).toBeInTheDocument();
  });

  it('does not show scan usage bar for keeper tier users', () => {
    setupSubscriptionStore({
      tier: 'keeper',
      usage: { scans: 100, collections: 5 },
      limits: { scans: Infinity, collections: Infinity },
    });

    renderDashboard();

    expect(screen.queryByText('Scan Usage')).not.toBeInTheDocument();
  });

  it('shows upgrade warning when scans usage is 80% or more', () => {
    setupSubscriptionStore({
      tier: 'free',
      usage: { scans: 21, collections: 1 },
      limits: { scans: 25, collections: 1 },
    });

    renderDashboard();

    expect(screen.getByText(/running low on scans/i)).toBeInTheDocument();
    expect(screen.getByText(/get keeper pass/i)).toBeInTheDocument();
  });

  it('calls fetchCollections on mount', () => {
    renderDashboard();
    expect(mockFetchCollections).toHaveBeenCalledTimes(1);
  });

  it('calls fetchSubscription on mount', () => {
    renderDashboard();
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);
  });

  it('shows error state when collectionsError is set', () => {
    setupCollectionsStore({ error: 'Failed to load collections' });

    renderDashboard();

    expect(screen.getByText('Failed to load collections')).toBeInTheDocument();
  });

  it('opens create modal when "New Collection" is clicked', async () => {
    renderDashboard();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /new collection/i }));

    expect(screen.getByRole('dialog', { name: /new collection/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/collection name/i)).toBeInTheDocument();
  });

  it('calls fetchLatestDraft on mount', () => {
    renderDashboard();
    expect(mockFetchLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('shows book draft card when a draft exists', () => {
    setupBookStore({
      drafts: [{ id: 'draft-1', title: 'My Cookbook', collectionId: 'col-1' }],
    });

    renderDashboard();
    expect(screen.getByTestId('book-draft-card')).toBeInTheDocument();
    expect(screen.getByText('My Cookbook')).toBeInTheDocument();
  });

  it('does not show book draft card when no drafts', () => {
    setupBookStore({ drafts: [] });

    renderDashboard();
    expect(screen.queryByTestId('book-draft-card')).not.toBeInTheDocument();
  });
});
