import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import Settings from './index';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogout = vi.fn();
const mockFetchSubscription = vi.fn().mockResolvedValue({});
const mockPurchaseKeeperPass = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/subscriptionStore', () => ({
  useSubscriptionStore: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: {
    put: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    upload: vi.fn().mockResolvedValue({ url: 'https://example.com/avatar.jpg' }),
  },
}));

vi.mock('@/config/plans', () => ({
  PLANS: {
    FREE: {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['25 scans per month', '2 collections'],
    },
    BOOK_PURCHASER: {
      id: 'book_purchaser',
      name: 'Book Purchaser',
      features: ['Unlimited scans', '3 collections', 'PDF export for purchased books'],
    },
    KEEPER_PASS: {
      id: 'keeper',
      name: 'Keeper Pass',
      price: 59,
      oneTime: true,
      features: [
        'Unlimited scans',
        'Unlimited collections',
        'Full PDF export',
        'Family sharing',
        '15% off all books forever',
      ],
    },
    // Backwards-compat alias used by Settings component
    get KEEPER() { return this.KEEPER_PASS; },
  },
}));

vi.mock('@/utils/formatters', () => ({
  formatDate: vi.fn((d) => d),
}));

import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuthStore(overrides = {}) {
  const defaults = {
    user: {
      email: 'test@example.com',
      user_metadata: { name: 'Jane Doe', avatar_url: null },
    },
    logout: mockLogout,
  };

  const merged = { ...defaults, ...overrides };
  useAuthStore.mockImplementation((selector) => selector(merged));
}

function setupSubscriptionStore(overrides = {}) {
  const defaults = {
    tier: 'free',
    usage: { scans: 10, collections: 1 },
    subscription: null,
    loading: false,
    fetchSubscription: mockFetchSubscription,
    purchaseKeeperPass: mockPurchaseKeeperPass,
  };

  const merged = { ...defaults, ...overrides };
  useSubscriptionStore.mockImplementation((selector) => selector(merged));
}

function renderSettings() {
  return renderWithRouter(<Settings />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthStore();
    setupSubscriptionStore();
  });

  it('renders profile section with name input', () => {
    renderSettings();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Jane Doe');
  });

  it('renders email input as disabled', () => {
    renderSettings();
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toBeDisabled();
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('renders subscription section', () => {
    renderSettings();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Current Plan:')).toBeInTheDocument();
  });

  it('shows current plan badge for free tier', () => {
    setupSubscriptionStore({ tier: 'free' });
    renderSettings();

    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows current plan badge for keeper tier', () => {
    setupSubscriptionStore({ tier: 'keeper' });
    renderSettings();

    expect(screen.getByText('Keeper Pass')).toBeInTheDocument();
  });

  it('shows Keeper Pass upsell card for free users', () => {
    setupSubscriptionStore({ tier: 'free' });
    renderSettings();

    // Heading + button both say "Get Keeper Pass"
    expect(screen.getAllByText('Get Keeper Pass').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\$59/)).toBeInTheDocument();
    expect(screen.getByText('one-time')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get keeper pass/i })).toBeInTheDocument();
  });

  it('does not show Keeper Pass upsell for keeper users', () => {
    setupSubscriptionStore({ tier: 'keeper' });
    renderSettings();

    expect(screen.queryByRole('button', { name: /get keeper pass/i })).not.toBeInTheDocument();
  });

  it('shows active info for keeper users', () => {
    setupSubscriptionStore({ tier: 'keeper' });
    renderSettings();

    expect(screen.getByText(/unlimited access/i)).toBeInTheDocument();
    expect(screen.getByText(/15% off all book orders/i)).toBeInTheDocument();
  });

  it('renders account section with delete button', () => {
    renderSettings();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('renders export data button', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /export all data/i })).toBeInTheDocument();
  });

  it('shows delete confirmation modal', async () => {
    renderSettings();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /delete account/i }));

    const dialog = screen.getByRole('dialog', { name: /delete account/i });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/this action is permanent/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByPlaceholderText(/type delete to confirm/i),
    ).toBeInTheDocument();

    // The "Delete My Account" button should be disabled until user types DELETE
    const deleteBtn = within(dialog).getByRole('button', { name: /delete my account/i });
    expect(deleteBtn).toBeDisabled();
  });

  it('enables delete button only when "DELETE" is typed', async () => {
    renderSettings();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /delete account/i }));

    const dialog = screen.getByRole('dialog', { name: /delete account/i });
    const input = within(dialog).getByPlaceholderText(/type delete to confirm/i);
    const deleteBtn = within(dialog).getByRole('button', { name: /delete my account/i });

    expect(deleteBtn).toBeDisabled();

    await user.type(input, 'DELETE');

    expect(deleteBtn).not.toBeDisabled();
  });

  it('shows usage stats', () => {
    setupSubscriptionStore({
      tier: 'free',
      usage: { scans: 10, collections: 1 },
    });
    renderSettings();

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Scans Used')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Collections Created')).toBeInTheDocument();
  });

  it('calls fetchSubscription on mount', () => {
    renderSettings();
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);
  });

  it('subscription card has id="subscription"', () => {
    renderSettings();
    const subscriptionCard = document.getElementById('subscription');
    expect(subscriptionCard).toBeInTheDocument();
    expect(subscriptionCard).toHaveTextContent('Current Plan:');
  });
});
