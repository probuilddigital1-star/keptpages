import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import Signup from './Signup';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignup = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    signup: mockSignup,
    loginWithGoogle: mockLoginWithGoogle,
    loading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

import { useAuthStore } from '@/stores/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSignup() {
  return renderWithRouter(<Signup />);
}

function setStoreMock(overrides) {
  useAuthStore.mockReturnValue({
    signup: mockSignup,
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

describe('Signup page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStoreMock({});
  });

  it('renders name, email, and password inputs', () => {
    renderSignup();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders "Create Account" button', () => {
    renderSignup();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    renderSignup();
    const link = screen.getByRole('link', { name: /log in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('calls store.signup() with email, password, name on submit', async () => {
    mockSignup.mockResolvedValue(undefined);
    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('jane@example.com', 'secret123', 'Jane Doe');
    });
  });

  it('shows validation error for short password', async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'ab');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/password must be at least 8 characters/i),
    ).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('shows validation errors when submitting empty form', async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('shows success/confirmation view after successful signup', async () => {
    mockSignup.mockResolvedValue(undefined);
    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to log in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('displays error message from store', () => {
    setStoreMock({ error: 'Email already taken' });
    renderSignup();

    expect(screen.getByText('Email already taken')).toBeInTheDocument();
  });
});
