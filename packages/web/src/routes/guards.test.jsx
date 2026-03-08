import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AuthGuard, GuestGuard } from './guards';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

function renderWithRoutes(guard, { initialEntry = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={guard}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/app" element={<div>App Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows spinner when loading is true', () => {
    useAuthStore.mockReturnValue({ user: null, loading: true });

    renderWithRoutes(<AuthGuard />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is null and not loading', () => {
    useAuthStore.mockReturnValue({ user: null, loading: false });

    renderWithRoutes(<AuthGuard />);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders Outlet (child content) when user is present', () => {
    useAuthStore.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
    });

    renderWithRoutes(<AuthGuard />);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});

describe('GuestGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows spinner when loading is true', () => {
    useAuthStore.mockReturnValue({ user: null, loading: true });

    renderWithRoutes(<GuestGuard />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /app when user is present and not loading', () => {
    useAuthStore.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
    });

    renderWithRoutes(<GuestGuard />);

    expect(screen.getByText('App Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders Outlet (child content) when user is null', () => {
    useAuthStore.mockReturnValue({ user: null, loading: false });

    renderWithRoutes(<GuestGuard />);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('App Page')).not.toBeInTheDocument();
  });
});
