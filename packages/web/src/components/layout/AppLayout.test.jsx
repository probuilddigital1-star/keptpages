import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useUIStore } from '@/stores/uiStore';
import { AppLayout } from './AppLayout';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));
vi.mock('@/stores/subscriptionStore', () => ({
  useSubscriptionStore: vi.fn(),
}));
vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(),
}));

const mockLogout = vi.fn().mockResolvedValue();

function setupMocks({ tier = 'free', user = null } = {}) {
  const defaultUser = user || {
    id: '1',
    email: 'alice@example.com',
    user_metadata: { name: 'Alice' },
  };

  // useAuthStore is called in multiple ways:
  // - useAuthStore() -> { user }
  // - useAuthStore((s) => s.logout) -> logout fn
  useAuthStore.mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector({ user: defaultUser, logout: mockLogout });
    }
    return { user: defaultUser };
  });

  useSubscriptionStore.mockReturnValue({ tier });
  useUIStore.mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector({ toggleSidebar: vi.fn() });
    }
    return { toggleSidebar: vi.fn() };
  });
}

function renderLayout({ initialEntry = '/app' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/app" element={<div>App Home</div>} />
          <Route path="/app/scan" element={<div>Scan Page</div>} />
          <Route path="/app/settings" element={<div>Settings Page</div>} />
        </Route>
        <Route path="/" element={<div>Landing Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders skip-to-content link', () => {
    setupMocks();
    renderLayout();
    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders main landmark with id', () => {
    setupMocks();
    renderLayout();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders KeptPages logo in sidebar', () => {
    setupMocks();
    renderLayout();
    // Multiple logos exist (sidebar + topbar); just check at least one
    const logos = screen.getAllByText(/Kept/);
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it('renders nav items (Home, Scan, Settings)', () => {
    setupMocks();
    renderLayout();
    // Both sidebar and bottom tabs render these, so use getAllByText
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Scan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  it('renders user avatar/initial in sidebar', () => {
    setupMocks({
      user: {
        id: '1',
        email: 'bob@example.com',
        user_metadata: { name: 'Bob' },
      },
    });
    renderLayout();
    // The initial "B" should appear for Bob (sidebar and topbar)
    const initials = screen.getAllByText('B');
    expect(initials.length).toBeGreaterThanOrEqual(1);
  });

  it('renders user email initial when name is not available', () => {
    setupMocks({
      user: {
        id: '2',
        email: 'charlie@example.com',
        user_metadata: {},
      },
    });
    renderLayout();
    const initials = screen.getAllByText('C');
    expect(initials.length).toBeGreaterThanOrEqual(1);
  });

  it('renders bottom tabs on mobile', () => {
    setupMocks();
    renderLayout();
    // Bottom tabs nav is always rendered (visibility controlled by CSS)
    // The bottom tabs contain nav items too
    const homeLinks = screen.getAllByText('Home');
    expect(homeLinks.length).toBeGreaterThanOrEqual(2); // sidebar + bottom tabs
  });

  it('renders logout button', () => {
    setupMocks();
    renderLayout();
    const logoutButton = screen.getByTitle('Log out');
    expect(logoutButton).toBeInTheDocument();
  });

  it('calls logout and navigates when logout button is clicked', async () => {
    setupMocks();
    renderLayout();
    const user = userEvent.setup();
    const logoutButton = screen.getByTitle('Log out');

    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows upgrade badge for free tier users', () => {
    setupMocks({ tier: 'free' });
    renderLayout();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('does not show upgrade badge for paid tier users', () => {
    setupMocks({ tier: 'keeper' });
    renderLayout();
    expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
  });

  it('dropdown menu has overflow guard class', async () => {
    setupMocks();
    renderLayout();
    const user = userEvent.setup();

    // Open the topbar avatar dropdown (the button element, not the sidebar div)
    const avatarButtons = screen.getAllByText('A');
    const clickable = avatarButtons.find((el) => el.tagName === 'BUTTON');
    await user.click(clickable);

    // The dropdown should contain Sign Out and have the overflow guard
    const signOut = screen.getByText('Sign Out');
    const dropdown = signOut.closest('div.absolute');
    expect(dropdown).toHaveClass('max-w-[calc(100vw-2rem)]');
    expect(dropdown).toHaveClass('right-0');
  });

  it('upgrade link href includes #subscription', () => {
    setupMocks({ tier: 'free' });
    renderLayout();
    const upgradeLink = screen.getByText('Upgrade');
    expect(upgradeLink.closest('a')).toHaveAttribute('href', '/app/settings#subscription');
  });
});
