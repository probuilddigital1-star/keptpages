import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminOrders from './Orders';
import { useAdminStore } from '@/stores/adminStore';

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

const mockOrders = [
  {
    id: 'order-1',
    title: 'Rose Family Cookbook',
    status: 'ordered',
    paymentStatus: 'paid',
    userEmail: 'jane@example.com',
    quantity: 2,
    orderCost: 15800,
    pageCount: 45,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'order-2',
    title: 'Letters Collection',
    status: 'shipped',
    paymentStatus: 'paid',
    userEmail: 'bob@example.com',
    quantity: 1,
    orderCost: 7900,
    pageCount: 30,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-02-03T10:00:00Z',
  },
];

describe('AdminOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminStore.setState({
      orders: mockOrders,
      total: 2,
      page: 1,
      limit: 20,
      loading: false,
      filters: { status: '' },
      setFilters: vi.fn(),
      fetchOrders: vi.fn().mockResolvedValue({
        orders: mockOrders,
        total: 2,
        page: 1,
      }),
      mockStatus: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders the Order Dashboard heading', () => {
    render(<AdminOrders />);
    expect(screen.getByText('Order Dashboard')).toBeInTheDocument();
  });

  it('renders order count badge', () => {
    render(<AdminOrders />);
    expect(screen.getByText('2 orders')).toBeInTheDocument();
  });

  it('renders singular "order" for count of 1', () => {
    useAdminStore.setState({ total: 1 });
    render(<AdminOrders />);
    expect(screen.getByText('1 order')).toBeInTheDocument();
  });

  it('renders all status filter buttons', () => {
    render(<AdminOrders />);
    expect(screen.getByText('All Orders')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Ordered')).toBeInTheDocument();
    expect(screen.getByText('Printing')).toBeInTheDocument();
    // Shipped appears both as filter and in the order list
    const shippedElements = screen.getAllByText('Shipped');
    expect(shippedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders order titles', () => {
    render(<AdminOrders />);
    expect(screen.getByText('Rose Family Cookbook')).toBeInTheDocument();
    expect(screen.getByText('Letters Collection')).toBeInTheDocument();
  });

  it('renders order email addresses', () => {
    render(<AdminOrders />);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('renders order costs formatted correctly', () => {
    render(<AdminOrders />);
    expect(screen.getByText('$158.00')).toBeInTheDocument();
    expect(screen.getByText('$79.00')).toBeInTheDocument();
  });

  it('renders status badges for orders', () => {
    render(<AdminOrders />);
    // 'ordered' appears in both the filter button (capitalized "Ordered") and the badge (lowercase "ordered")
    // The status badge renders the raw status string
    const orderedElements = screen.getAllByText('ordered');
    expect(orderedElements.length).toBeGreaterThanOrEqual(1);
    const shippedElements = screen.getAllByText('shipped');
    expect(shippedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no orders match', () => {
    useAdminStore.setState({ orders: [], total: 0 });
    render(<AdminOrders />);
    expect(screen.getByText('No orders found.')).toBeInTheDocument();
  });

  it('shows loading spinner when loading with no orders', () => {
    useAdminStore.setState({ orders: [], loading: true });
    render(<AdminOrders />);
    // Should show a spinner, not "No orders"
    expect(screen.queryByText('No orders found.')).not.toBeInTheDocument();
  });

  it('does not show pagination when only 1 page', () => {
    render(<AdminOrders />);
    expect(screen.queryByText(/page 1 of/i)).not.toBeInTheDocument();
  });

  it('shows pagination when multiple pages exist', () => {
    useAdminStore.setState({ total: 50, limit: 20 });
    render(<AdminOrders />);
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    useAdminStore.setState({ total: 50, limit: 20, page: 1 });
    render(<AdminOrders />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    useAdminStore.setState({ total: 50, limit: 20, page: 3 });
    render(<AdminOrders />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('calls fetchOrders on mount', () => {
    const fetchOrders = vi.fn().mockResolvedValue({});
    useAdminStore.setState({ fetchOrders });
    render(<AdminOrders />);
    expect(fetchOrders).toHaveBeenCalled();
  });

  it('shows "Untitled Book" for orders without title', () => {
    useAdminStore.setState({
      orders: [{ id: 'o1', title: null, status: 'ordered', createdAt: '2026-01-01' }],
      total: 1,
    });
    render(<AdminOrders />);
    expect(screen.getByText('Untitled Book')).toBeInTheDocument();
  });
});
