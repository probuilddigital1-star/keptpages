import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import Settings from './index';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogout = vi.fn();
const mockFetchSubscription = vi.fn().mockResolvedValue({});
const mockUpgrade = vi.fn();

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
      name: 'Free Forever',
      price: 0,
      features: ['25 document scans', '1 collection'],
    },
    KEEPER: {
      id: 'keeper',
      name: 'Keeper',
      price: 39.99,
      features: ['Unlimited scans', 'Unlimited collections', 'Family sharing'],
    },
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
    upgrade: mockUpgrade,
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

    expect(screen.getByText('Free Forever')).toBeInTheDocument();
  });

  it('shows current plan badge for keeper tier', () => {
    setupSubscriptionStore({ tier: 'keeper' });
    renderSettings();

    expect(screen.getByText('Keeper')).toBeInTheDocument();
  });

  it('shows upgrade card for free users', () => {
    setupSubscriptionStore({ tier: 'free' });
    renderSettings();

    expect(screen.getByText('Upgrade to Keeper')).toBeInTheDocument();
    expect(screen.getByText(/\$39\.99/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument();
  });

  it('does not show upgrade card for keeper users', () => {
    setupSubscriptionStore({ tier: 'keeper' });
    renderSettings();

    expect(screen.queryByText('Upgrade to Keeper')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade now/i })).not.toBeInTheDocument();
  });

  it('shows cancel subscription button for keeper users', () => {
    setupSubscriptionStore({ tier: 'keeper' });
    renderSettings();

    expect(screen.getByRole('button', { name: /cancel subscription/i })).toBeInTheDocument();
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
