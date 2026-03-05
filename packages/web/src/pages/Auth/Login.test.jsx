import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import Login from './Login';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    loading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

// Grab the mock so we can change return values per-test
import { useAuthStore } from '@/stores/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLogin() {
  return renderWithRouter(<Login />);
}

function setStoreMock(overrides) {
  useAuthStore.mockReturnValue({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    loading: false,
    error: null,
    clearError: mockClearError,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStoreMock({});
  });

  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders "Log In" button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders "Sign in with Google" button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('renders link to signup page', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/signup');
  });

  it('renders link to forgot password page', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('shows validation error when submitting empty form', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls store.login() with email and password on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'secret123');
    });
  });

  it('navigates to /app after successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  it('shows loading state on button during login', () => {
    setStoreMock({ loading: true });
    renderLogin();

    const button = screen.getByRole('button', { name: /log in/i });
    expect(button).toBeDisabled();
    // Spinner should be present inside the button
    expect(button.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('displays error message from store', () => {
    setStoreMock({ error: 'Invalid credentials' });
    renderLogin();

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('renders KeptPages logo', () => {
    renderLogin();
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });
});
