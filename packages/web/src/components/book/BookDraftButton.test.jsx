import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BookDraftButton from './BookDraftButton';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockBookStore = {
  drafts: [],
  fetchDrafts: vi.fn().mockResolvedValue([]),
};

vi.mock('@/stores/bookStore', () => ({
  useBookStore: (selector) => selector(mockBookStore),
}));

const mockSubscriptionStore = {
  tier: 'free',
};

vi.mock('@/stores/subscriptionStore', () => ({
  useSubscriptionStore: (selector) => selector(mockSubscriptionStore),
}));

function renderButton(props = {}) {
  return render(
    <BrowserRouter>
      <BookDraftButton collectionId="col-1" documentCount={10} {...props} />
    </BrowserRouter>,
  );
}

describe('BookDraftButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookStore.drafts = [];
    mockSubscriptionStore.tier = 'free';
  });

  it('renders nothing for no_account tier', () => {
    mockSubscriptionStore.tier = 'no_account';
    const { container } = renderButton();
    expect(container.innerHTML).toBe('');
  });

  it('shows Create Book button for free users with 5+ docs', () => {
    renderButton({ documentCount: 10 });
    expect(screen.getByText('Create Book')).toBeInTheDocument();
  });

  it('shows disabled button for free users with <5 docs', () => {
    renderButton({ documentCount: 3 });
    expect(screen.getByText('Add more recipes to create a book')).toBeInTheDocument();
  });

  it('shows Keeper Pass savings note for non-keeper users with 5+ docs', () => {
    renderButton({ documentCount: 10 });
    expect(screen.getByText(/keeper pass members save 15%/i)).toBeInTheDocument();
  });

  it('does not show Keeper Pass note for keeper users', () => {
    mockSubscriptionStore.tier = 'keeper';
    renderButton({ documentCount: 10 });
    expect(screen.queryByText(/keeper pass members save 15%/i)).not.toBeInTheDocument();
  });

  it('shows continue card when draft exists', () => {
    mockBookStore.drafts = [{
      id: 'draft-1',
      title: 'My Cookbook',
      pageCount: 12,
      colorScheme: 'default',
      updatedAt: new Date().toISOString(),
    }];

    renderButton();
    expect(screen.getByText('Continue Your Cookbook')).toBeInTheDocument();
    expect(screen.getByText(/12 pages/)).toBeInTheDocument();
    expect(screen.getByText('Continue Designing')).toBeInTheDocument();
    expect(screen.getByText('or start a new book')).toBeInTheDocument();
  });

  it('navigates to existing draft on Continue Designing click', async () => {
    const user = userEvent.setup();
    mockBookStore.drafts = [{
      id: 'draft-1',
      title: 'My Cookbook',
      pageCount: 12,
      colorScheme: 'default',
      updatedAt: new Date().toISOString(),
    }];

    renderButton();
    await user.click(screen.getByText('Continue Designing'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/book/col-1?bookId=draft-1');
  });

  it('navigates to new book on "or start a new book" click', async () => {
    const user = userEvent.setup();
    mockBookStore.drafts = [{
      id: 'draft-1',
      title: 'My Cookbook',
      pageCount: 12,
      colorScheme: 'default',
      updatedAt: new Date().toISOString(),
    }];

    renderButton();
    await user.click(screen.getByText('or start a new book'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/book/col-1');
  });

  it('fetches drafts on mount', () => {
    renderButton();
    expect(mockBookStore.fetchDrafts).toHaveBeenCalledWith('col-1');
  });

  it('shows Create Book for keeper tier (no keeper gate)', () => {
    mockSubscriptionStore.tier = 'keeper';
    renderButton({ documentCount: 10 });
    expect(screen.getByText('Create Book')).toBeInTheDocument();
  });

  it('shows Create Book for book_purchaser tier', () => {
    mockSubscriptionStore.tier = 'book_purchaser';
    renderButton({ documentCount: 10 });
    expect(screen.getByText('Create Book')).toBeInTheDocument();
  });
});
