import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import OrderPanel from './OrderPanel';
import { useBookStore } from '@/stores/bookStore';
import { BOOK_PRICING, DEFAULT_PRINT_OPTIONS, calculateBookPrice } from '@/config/plans';

// Mock the api module
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getBlob: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

function renderWithRouter(ui) {
  return render(ui, { wrapper: BrowserRouter });
}

const baseBookState = {
  book: { id: 'book-1', status: 'draft', pageCount: 30 },
  generatingPdf: false,
  generatePdf: vi.fn(),
  orderBook: vi.fn(),
  loading: false,
  checkStatus: vi.fn(),
};

describe('OrderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBookStore.setState(baseBookState);
  });

  /**
   * BUG TEST: React hooks are called AFTER an early return in OrderPanel.
   * Lines 64-65: if (isPostOrder) return <OrderStatusPanel />;
   * Lines 66-77: useState/useBookStore hooks are called after this return.
   *
   * This violates React's Rules of Hooks. When the component first renders
   * with a non-post-order status (calling all hooks), then the status changes
   * to a post-order status, React will see fewer hooks and crash.
   */
  it('handles book status transition to post-order without crashing (hooks fix verified)', () => {
    // First render with draft status — all hooks are called
    const { rerender } = renderWithRouter(<OrderPanel bookId="book-1" />);

    // Now transition to an ordered status — hooks are called consistently after fix
    useBookStore.setState({
      ...baseBookState,
      book: { id: 'book-1', status: 'ordered', pageCount: 30 },
    });

    // Re-render after state change — should work cleanly with hooks fix
    expect(() => {
      rerender(<OrderPanel bookId="book-1" />);
    }).not.toThrow();
  });

  it('renders Generate PDF section for draft books', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByRole('heading', { name: /generate pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate pdf/i })).toBeInTheDocument();
  });

  it('renders shipping form fields', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
  });

  it('renders order summary with correct base price', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByRole('heading', { name: /order summary/i })).toBeInTheDocument();
    // Base price is $79.00 - appears in line item and unit/total
    expect(screen.getAllByText('$79.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows quantity controls starting at 1', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    // Quantity label appears in summary and controls
    expect(screen.getAllByText('Quantity').length).toBeGreaterThanOrEqual(1);
  });

  it('quantity cannot go below 1', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    const minusBtn = screen.getByRole('button', { name: '-' });
    await user.click(minusBtn);

    // Should still show 1
    const quantityDisplay = screen.getByText('1');
    expect(quantityDisplay).toBeInTheDocument();
  });

  it('increments quantity when + is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    const plusBtn = screen.getByRole('button', { name: '+' });
    await user.click(plusBtn);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows family discount when quantity >= 5', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    const plusBtn = screen.getByRole('button', { name: '+' });
    // Click + four times to get to 5
    for (let i = 0; i < 4; i++) {
      await user.click(plusBtn);
    }

    expect(screen.getByText(/family discount/i)).toBeInTheDocument();
  });

  it('disables Order Book button when shipping fields are empty', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    const orderBtn = screen.getByRole('button', { name: /order book/i });
    expect(orderBtn).toBeDisabled();
  });

  it('shows extra page costs when book has more than 40 pages', () => {
    useBookStore.setState({
      ...baseBookState,
      book: { id: 'book-1', status: 'ready', pageCount: 60 },
    });

    renderWithRouter(<OrderPanel bookId="book-1" />);
    // 60 - 40 = 20 extra pages
    expect(screen.getByText(/extra pages/i)).toBeInTheDocument();
  });

  it('renders the Regenerate PDF button when book status is ready', () => {
    useBookStore.setState({
      ...baseBookState,
      book: { id: 'book-1', status: 'ready', pageCount: 30 },
    });

    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByRole('button', { name: /regenerate pdf/i })).toBeInTheDocument();
  });

  it('renders Download Preview button when status is ready', () => {
    useBookStore.setState({
      ...baseBookState,
      book: { id: 'book-1', status: 'ready', pageCount: 30 },
    });

    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByRole('button', { name: /download preview/i })).toBeInTheDocument();
  });

  it('renders OrderStatusPanel when book has a post-order status', () => {
    useBookStore.setState({
      ...baseBookState,
      book: { id: 'book-1', status: 'shipped', pageCount: 30 },
    });

    renderWithRouter(<OrderPanel bookId="book-1" />);
    // Should render OrderStatusPanel instead of the order form
    expect(screen.getByText('Order Status')).toBeInTheDocument();
  });
});

describe('calculateBookPrice edge cases', () => {
  it('caps base price at max then adds option modifiers (fixed)', () => {
    // BOOK_PRICING.max = 14900 cents ($149.00)
    // With 1000 pages: base = 7900 + (1000-40)*50 = 7900 + 48000 = 55900, capped at 14900
    // With expensive options (hardcover=1500, color=2000, premium paper=800):
    // optionModifiers = 4300
    // Fixed: caps base at 14900, then adds options: 14900 + 4300 = 19200

    const expensiveOptions = { binding: 'CW', interior: 'FC', paper: '080CW444', cover: 'G' };
    const priceWith1000Pages = calculateBookPrice(1000, expensiveOptions);
    const priceWith50Pages = calculateBookPrice(50, expensiveOptions);

    // With 50 pages (10 extra): base = 7900 + 10*50 = 8400 (under max)
    // 8400 + 4300 = 12700
    expect(priceWith50Pages).toBe(12700);

    // With 1000 pages: base capped at 14900, + 4300 options = 19200
    expect(priceWith1000Pages).toBe(19200);
  });

  it('calculates base price correctly for books under 40 pages', () => {
    const price = calculateBookPrice(30, DEFAULT_PRINT_OPTIONS);
    expect(price).toBe(BOOK_PRICING.base); // 7900
  });

  it('adds per-page cost for pages over 40', () => {
    const price = calculateBookPrice(50, DEFAULT_PRINT_OPTIONS);
    // 7900 + 10 * 50 = 8400
    expect(price).toBe(8400);
  });

  it('handles 0 pages', () => {
    const price = calculateBookPrice(0, DEFAULT_PRINT_OPTIONS);
    expect(price).toBe(BOOK_PRICING.base);
  });

  it('handles negative page count without crashing', () => {
    const price = calculateBookPrice(-5, DEFAULT_PRINT_OPTIONS);
    // Math.max(0, -5 - 40) = 0 extra pages
    expect(price).toBe(BOOK_PRICING.base);
  });
});
