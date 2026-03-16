import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useOrdersStore } from '@/stores/ordersStore';
import OrdersPage from './index';

// Mock the store
vi.mock('@/stores/ordersStore', () => ({
  useOrdersStore: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

describe('OrdersPage', () => {
  const mockFetchOrders = vi.fn().mockResolvedValue(undefined);

  function renderPage(storeState = {}) {
    useOrdersStore.mockImplementation((selector) => {
      const state = {
        orders: [],
        loading: false,
        error: null,
        fetchOrders: mockFetchOrders,
        ...storeState,
      };
      return selector ? selector(state) : state;
    });

    return render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByText('Your Orders')).toBeInTheDocument();
  });

  it('shows empty state when no orders', () => {
    renderPage({ orders: [] });
    expect(screen.getByText(/Your first book is waiting/)).toBeInTheDocument();
    expect(screen.getByText(/Browse Collections/)).toBeInTheDocument();
    expect(screen.getByText(/Start Scanning/)).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    renderPage({ loading: true, orders: [] });
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders order cards with title', () => {
    renderPage({
      orders: [
        {
          id: 'b1',
          title: 'Family Recipes',
          status: 'ordered',
          paymentStatus: 'succeeded',
          quantity: 1,
          pageCount: 60,
          createdAt: '2026-03-14T00:00:00Z',
          updatedAt: '2026-03-14T00:00:00Z',
        },
      ],
    });

    expect(screen.getByText('Family Recipes')).toBeInTheDocument();
    expect(screen.getByText('Ordered')).toBeInTheDocument();
  });

  it('renders tracking info when available', () => {
    renderPage({
      orders: [
        {
          id: 'b2',
          title: 'My Book',
          status: 'shipped',
          paymentStatus: 'succeeded',
          quantity: 1,
          shippingAddress: {
            trackingId: 'TRACK123',
            trackingUrl: 'https://ups.com/track/TRACK123',
          },
          createdAt: '2026-03-14T00:00:00Z',
          updatedAt: '2026-03-14T00:00:00Z',
        },
      ],
    });

    const link = screen.getByText('TRACK123');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://ups.com/track/TRACK123');
  });

  it('calls fetchOrders on mount', () => {
    renderPage();
    expect(mockFetchOrders).toHaveBeenCalled();
  });

  it('shows error message when present', () => {
    renderPage({
      orders: [
        {
          id: 'b3',
          title: 'Failed Book',
          status: 'error',
          errorMessage: 'Lulu order failed',
          createdAt: '2026-03-14T00:00:00Z',
        },
      ],
    });

    expect(screen.getByText('Lulu order failed')).toBeInTheDocument();
  });
});
