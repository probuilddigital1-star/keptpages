import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

let mockUser = null;

vi.mock('@/stores/authStore', () => {
  const store = (selector) => selector({ user: mockUser });
  store.getState = () => ({ user: mockUser });
  store.setState = () => {};
  store.subscribe = () => () => {};
  return { useAuthStore: store };
});

// Import after mocks
import AuthCallback from './Callback';

function renderCallback() {
  return render(
    <MemoryRouter initialEntries={['/auth/callback?code=test']}>
      <AuthCallback />
    </MemoryRouter>,
  );
}

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    mockUser = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading spinner and message', () => {
    renderCallback();
    expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
  });

  it('navigates to /app when user is present', () => {
    mockUser = { id: 'user-1', email: 'test@example.com' };
    renderCallback();
    expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
  });

  it('navigates to /login after 10s timeout with no user', async () => {
    renderCallback();
    expect(mockNavigate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('navigates to /app after timeout if user appeared in store', async () => {
    renderCallback();

    // Simulate user appearing before timeout
    mockUser = { id: 'user-1' };

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
  });
});
