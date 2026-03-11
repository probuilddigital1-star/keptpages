import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import Settings from './index';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogout = vi.fn();
const mockFetchSubscription = vi.fn().mockResolvedValue({});
const mockUpgrade = vi.fn();

let uploadResolve;
let uploadReject;

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
    upload: vi.fn(() => new Promise((resolve, reject) => {
      uploadResolve = resolve;
      uploadReject = reject;
    })),
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

describe('Settings – avatar upload spinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthStore();
    setupSubscriptionStore();
  });

  it('shows a spinner while the avatar is uploading', async () => {
    renderSettings();
    const user = userEvent.setup();

    // No spinner initially
    expect(screen.queryByTestId('avatar-upload-spinner')).not.toBeInTheDocument();

    // Select a file via the hidden input
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    // Spinner should now be visible (upload is pending)
    expect(screen.getByTestId('avatar-upload-spinner')).toBeInTheDocument();
  });

  it('hides the spinner after upload completes', async () => {
    renderSettings();
    const user = userEvent.setup();

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    // Spinner should be visible
    expect(screen.getByTestId('avatar-upload-spinner')).toBeInTheDocument();

    // Resolve the upload
    uploadResolve({ url: 'https://example.com/avatar.jpg' });

    await waitFor(() => {
      expect(screen.queryByTestId('avatar-upload-spinner')).not.toBeInTheDocument();
    });
  });

  it('hides the spinner after upload fails', async () => {
    renderSettings();
    const user = userEvent.setup();

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    expect(screen.getByTestId('avatar-upload-spinner')).toBeInTheDocument();

    // Reject the upload
    uploadReject(new Error('Upload failed'));

    await waitFor(() => {
      expect(screen.queryByTestId('avatar-upload-spinner')).not.toBeInTheDocument();
    });
  });
});
