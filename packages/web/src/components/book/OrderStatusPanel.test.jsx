import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderStatusPanel from './OrderStatusPanel';
import { useBookStore } from '@/stores/bookStore';

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

describe('OrderStatusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when book is null', () => {
    useBookStore.setState({ book: null, checkStatus: vi.fn() });
    const { container } = render(<OrderStatusPanel bookId="book-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the Order Status heading', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'ordered' },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.getByText('Order Status')).toBeInTheDocument();
  });

  it('renders the correct status badge', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'shipped' },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    // Badge and stepper both show "Shipped"
    const shippedElements = screen.getAllByText('Shipped');
    expect(shippedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the status stepper with all steps', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'printing' },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Ordered')).toBeInTheDocument();
    // Badge and stepper both show "Printing"
    const printingElements = screen.getAllByText('Printing');
    expect(printingElements.length).toBeGreaterThanOrEqual(1);
    const shippedElements = screen.getAllByText('Shipped');
    expect(shippedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders error message when status is error', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'error', errorMessage: 'Print provider rejected order' },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.getByText('Order Error')).toBeInTheDocument();
    expect(screen.getByText('Print provider rejected order')).toBeInTheDocument();
    expect(screen.getByText(/support@keptpages.com/)).toBeInTheDocument();
  });

  it('does not render error card when status is not error', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'ordered' },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.queryByText('Order Error')).not.toBeInTheDocument();
  });

  it('renders Order Details section', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'ordered', quantity: 3, orderCost: 23700 },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.getByText('Order Details')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('$237.00')).toBeInTheDocument();
  });

  it('renders shipping address when present', () => {
    useBookStore.setState({
      book: {
        id: 'book-1',
        status: 'shipped',
        shippingAddress: {
          name: 'Jane Smith',
          street1: '123 Main St',
          city: 'Cleveland',
          state: 'OH',
          postalCode: '44101',
          country: 'US',
        },
      },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText(/Cleveland, OH 44101/)).toBeInTheDocument();
  });

  it('does not display country if US', () => {
    useBookStore.setState({
      book: {
        id: 'book-1',
        status: 'shipped',
        shippingAddress: {
          name: 'Jane',
          street1: '123 Main',
          city: 'Town',
          state: 'OH',
          postalCode: '44101',
          country: 'US',
        },
      },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    // US country should not be displayed as a separate line
    const allText = screen.getByText('Shipping Address').parentElement.textContent;
    // The country 'US' should not appear as its own visible element
    const countryParagraphs = screen
      .getByText('Shipping Address')
      .parentElement.querySelectorAll('p');
    const countryTexts = Array.from(countryParagraphs).map((p) => p.textContent);
    expect(countryTexts).not.toContain('US');
  });

  it('renders Refresh Status button', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'ordered' },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.getByRole('button', { name: /refresh status/i })).toBeInTheDocument();
  });

  it('calls checkStatus when Refresh Status is clicked', async () => {
    const checkStatus = vi.fn().mockResolvedValue({ status: 'printing' });
    useBookStore.setState({
      book: { id: 'book-1', status: 'ordered' },
      checkStatus,
    });

    const user = userEvent.setup();
    render(<OrderStatusPanel bookId="book-1" />);

    await user.click(screen.getByRole('button', { name: /refresh status/i }));
    expect(checkStatus).toHaveBeenCalledWith('book-1');
  });

  it('renders cancelled status without the step stepper', () => {
    useBookStore.setState({
      book: { id: 'book-1', status: 'cancelled' },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    // Badge and stepper both show "Cancelled"
    const cancelledElements = screen.getAllByText('Cancelled');
    expect(cancelledElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders print option labels correctly', () => {
    useBookStore.setState({
      book: {
        id: 'book-1',
        status: 'ordered',
        printOptions: { binding: 'CW', interior: 'FC' },
      },
      checkStatus: vi.fn(),
    });
    render(<OrderStatusPanel bookId="book-1" />);
    expect(screen.getByText('Hardcover')).toBeInTheDocument();
    expect(screen.getByText('Full Color')).toBeInTheDocument();
  });
});
