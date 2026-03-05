import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import ForgotPassword from './ForgotPassword';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockResetPassword = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    resetPassword: mockResetPassword,
    loading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

import { useAuthStore } from '@/stores/authStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderForgotPassword() {
  return renderWithRouter(<ForgotPassword />);
}

function setStoreMock(overrides) {
  useAuthStore.mockReturnValue({
    resetPassword: mockResetPassword,
    loading: false,
    error: null,
    clearError: mockClearError,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForgotPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStoreMock({});
  });

  it('renders email input', () => {
    renderForgotPassword();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders "Send Reset Link" button', () => {
    renderForgotPassword();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders back to login link', () => {
    renderForgotPassword();
    const link = screen.getByRole('link', { name: /back to log in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('shows validation error when submitting empty email', async () => {
    renderForgotPassword();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email format', async () => {
    renderForgotPassword();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('calls store.resetPassword() on submit with valid email', async () => {
    mockResetPassword.mockResolvedValue(undefined);
    renderForgotPassword();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows success state after submission', async () => {
    mockResetPassword.mockResolvedValue(undefined);
    renderForgotPassword();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    // The "Send Reset Link" button should no longer be visible
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
  });

  it('displays error message from store', () => {
    setStoreMock({ error: 'Too many requests' });
    renderForgotPassword();

    expect(screen.getByText('Too many requests')).toBeInTheDocument();
  });

  it('renders KeptPages logo', () => {
    renderForgotPassword();
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });
});
