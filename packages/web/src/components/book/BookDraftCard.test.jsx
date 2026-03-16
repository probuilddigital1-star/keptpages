import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BookDraftCard from './BookDraftCard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCard(draft = {}) {
  const defaultDraft = {
    id: 'draft-1',
    title: 'Holiday Recipes',
    collectionId: 'col-1',
    pageCount: 28,
    colorScheme: 'default',
    updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    ...draft,
  };
  return render(
    <BrowserRouter>
      <BookDraftCard draft={defaultDraft} />
    </BrowserRouter>,
  );
}

describe('BookDraftCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when draft is null', () => {
    const { container } = render(
      <BrowserRouter>
        <BookDraftCard draft={null} />
      </BrowserRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows "Your book is waiting" heading', () => {
    renderCard();
    expect(screen.getByText('Your book is waiting')).toBeInTheDocument();
  });

  it('shows draft title and page count', () => {
    renderCard();
    expect(screen.getByText(/"Holiday Recipes"/)).toBeInTheDocument();
    expect(screen.getByText(/28 pages/)).toBeInTheDocument();
  });

  it('shows relative time', () => {
    renderCard();
    expect(screen.getByText(/Last edited/)).toBeInTheDocument();
  });

  it('renders Continue Designing button', () => {
    renderCard();
    expect(screen.getByText('Continue Designing')).toBeInTheDocument();
  });

  it('navigates to book designer on Continue click', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByText('Continue Designing'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/book/col-1?bookId=draft-1');
  });

  it('shows mini cover preview with color scheme', () => {
    const { container } = renderCard({ colorScheme: 'forest' });
    // The cover swatch should have the forest color bg
    const swatch = container.querySelector('[style*="background-color"]');
    expect(swatch).toBeTruthy();
  });

  it('handles missing title gracefully', () => {
    renderCard({ title: null });
    expect(screen.getByText(/Untitled Book/)).toBeInTheDocument();
  });
});
