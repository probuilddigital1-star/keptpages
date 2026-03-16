import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import OrderPanel from './OrderPanel';
import { useBookStore } from '@/stores/bookStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { BOOK_TIERS, BOOK_ADDONS, BOOK_PRICING, calculateBookPrice } from '@/config/plans';

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

const baseSubState = {
  tier: 'free',
  bookDiscount: () => 0,
  bookDiscountPercent: 0,
};

describe('OrderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBookStore.setState(baseBookState);
    useSubscriptionStore.setState(baseSubState);
  });

  it('handles book status transition to post-order without crashing (hooks fix verified)', () => {
    const { rerender } = renderWithRouter(<OrderPanel bookId="book-1" />);

    useBookStore.setState({
      ...baseBookState,
      book: { id: 'book-1', status: 'ordered', pageCount: 30 },
    });

    expect(() => {
      rerender(<OrderPanel bookId="book-1" />);
    }).not.toThrow();
  });

  it('renders Generate PDF section for draft books', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByRole('heading', { name: /generate pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate pdf/i })).toBeInTheDocument();
  });

  it('renders Choose Your Book section with 3 tier cards', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByRole('heading', { name: /choose your book/i })).toBeInTheDocument();
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Heirloom')).toBeInTheDocument();
  });

  it('shows "Most Popular" badge on Premium tier', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('defaults to Premium tier selected', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    const radios = screen.getAllByRole('radio');
    const premiumRadio = radios.find((r) => r.value === 'premium');
    expect(premiumRadio).toBeChecked();
  });

  it('renders tier descriptions', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByText('Softcover, B&W interior')).toBeInTheDocument();
    expect(screen.getByText('Hardcover, Full color')).toBeInTheDocument();
    expect(screen.getByText('Hardcover, Full color, premium paper')).toBeInTheDocument();
  });

  it('renders add-ons section', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByText('Add-Ons')).toBeInTheDocument();
    expect(screen.getByText('Glossy cover finish')).toBeInTheDocument();
    expect(screen.getByText('Coil/spiral binding')).toBeInTheDocument();
  });

  it('shows Color interior add-on only when Classic tier is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    // Premium is default - color add-on should not be visible
    expect(screen.queryByText('Color interior')).not.toBeInTheDocument();

    // Switch to Classic
    const classicRadio = screen.getAllByRole('radio').find((r) => r.value === 'classic');
    await user.click(classicRadio);

    expect(screen.getByText('Color interior')).toBeInTheDocument();
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

  it('renders order summary with Premium tier base price', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByRole('heading', { name: /order summary/i })).toBeInTheDocument();
    // Premium base price is $69.00
    expect(screen.getAllByText('$69.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows quantity controls starting at 1', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getAllByText('Quantity').length).toBeGreaterThanOrEqual(1);
  });

  it('quantity cannot go below 1', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    const minusBtn = screen.getByRole('button', { name: '-' });
    await user.click(minusBtn);

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

  it('shows multi-copy discount when quantity >= 3', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    const plusBtn = screen.getByRole('button', { name: '+' });
    // Click + two times to get to 3
    for (let i = 0; i < 2; i++) {
      await user.click(plusBtn);
    }

    expect(screen.getByText('Multi-Copy Discount')).toBeInTheDocument();
  });

  it('shows 20% discount label at 5+ copies', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    const plusBtn = screen.getByRole('button', { name: '+' });
    for (let i = 0; i < 4; i++) {
      await user.click(plusBtn);
    }

    expect(screen.getByText(/20% multi-copy discount/i)).toBeInTheDocument();
  });

  it('shows multi-copy discount note below add-ons', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByText(/15% off at 3\+ copies, 20% off at 5\+/)).toBeInTheDocument();
  });

  it('disables Order Book button when shipping fields are empty', () => {
    renderWithRouter(<OrderPanel bookId="book-1" />);
    const orderBtn = screen.getByRole('button', { name: /order book/i });
    expect(orderBtn).toBeDisabled();
  });

  it('shows extra page costs when book has more than 60 pages', () => {
    useBookStore.setState({
      ...baseBookState,
      book: { id: 'book-1', status: 'ready', pageCount: 80 },
    });

    renderWithRouter(<OrderPanel bookId="book-1" />);
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
    expect(screen.getByText('Order Status')).toBeInTheDocument();
  });

  it('shows Keeper Pass discount line when user has keeper discount', () => {
    useSubscriptionStore.setState({
      ...baseSubState,
      tier: 'keeper',
      bookDiscount: () => 0.15,
      bookDiscountPercent: 15,
    });

    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByText(/keeper pass discount/i)).toBeInTheDocument();
  });

  it('updates price when switching tiers', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OrderPanel bookId="book-1" />);

    // Default is Premium ($69.00)
    expect(screen.getAllByText('$69.00').length).toBeGreaterThanOrEqual(1);

    // Switch to Classic ($39.00)
    const classicRadio = screen.getAllByRole('radio').find((r) => r.value === 'classic');
    await user.click(classicRadio);

    expect(screen.getAllByText('$39.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Keeper Pass callout for non-keeper users', () => {
    useSubscriptionStore.setState({ ...baseSubState, tier: 'free' });
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.getByText('Save 15% with Keeper Pass')).toBeInTheDocument();
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });

  it('hides Keeper Pass callout for keeper users', () => {
    useSubscriptionStore.setState({
      ...baseSubState,
      tier: 'keeper',
      bookDiscount: () => 0.15,
    });
    renderWithRouter(<OrderPanel bookId="book-1" />);
    expect(screen.queryByText('Save 15% with Keeper Pass')).not.toBeInTheDocument();
  });
});

describe('calculateBookPrice with tiers', () => {
  it('returns premium base price for 60 or fewer pages', () => {
    expect(calculateBookPrice(60, 'premium')).toBe(6900);
    expect(calculateBookPrice(0, 'premium')).toBe(6900);
    expect(calculateBookPrice(30, 'premium')).toBe(6900);
  });

  it('returns classic base price', () => {
    expect(calculateBookPrice(40, 'classic')).toBe(3900);
  });

  it('returns heirloom base price', () => {
    expect(calculateBookPrice(40, 'heirloom')).toBe(7900);
  });

  it('adds per-page cost for extra pages over 60', () => {
    // 70 pages: 10 extra at $0.35 = 350 cents
    expect(calculateBookPrice(70, 'premium')).toBe(6900 + 10 * 35);
  });

  it('adds addon prices', () => {
    expect(calculateBookPrice(40, 'premium', ['coil'])).toBe(6900 + 800);
  });

  it('applies multi-copy discount at 3+', () => {
    const base = 6900;
    const expected = Math.round(base * 3 * 0.85);
    expect(calculateBookPrice(40, 'premium', [], 3)).toBe(expected);
  });

  it('applies 20% discount at 5+', () => {
    const base = 6900;
    const expected = Math.round(base * 5 * 0.80);
    expect(calculateBookPrice(40, 'premium', [], 5)).toBe(expected);
  });

  it('applies keeper discount', () => {
    const base = 6900;
    const expected = Math.round(base * 0.85);
    expect(calculateBookPrice(40, 'premium', [], 1, true)).toBe(expected);
  });

  it('stacks multi-copy and keeper discounts', () => {
    const base = 6900;
    // 3 copies: 15% multi-copy, then 15% keeper
    const afterMulti = Math.round(base * 3 * 0.85);
    const expected = Math.round(afterMulti * 0.85);
    expect(calculateBookPrice(40, 'premium', [], 3, true)).toBe(expected);
  });

  it('handles 0 pages', () => {
    expect(calculateBookPrice(0, 'classic')).toBe(3900);
  });

  it('handles negative page count without crashing', () => {
    expect(calculateBookPrice(-5, 'classic')).toBe(3900);
  });
});
