import { useAuthStore } from './authStore';
import { supabase } from '@/services/supabase';

vi.mock('@/services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

const initialState = {
  user: null,
  session: null,
  loading: true,
  error: null,
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has user=null, session=null, loading=true', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('calls supabase.auth.signInWithPassword and sets user/session on success', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockSession = { access_token: 'token-123' };
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await useAuthStore.getState().login('test@test.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { message: 'Invalid credentials' },
      });

      await expect(
        useAuthStore.getState().login('test@test.com', 'wrong')
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
    });

    it('sets loading=true while request is in progress', async () => {
      let resolveLogin;
      supabase.auth.signInWithPassword.mockReturnValue(
        new Promise((resolve) => { resolveLogin = resolve; })
      );

      const loginPromise = useAuthStore.getState().login('a@b.com', 'pw');
      expect(useAuthStore.getState().loading).toBe(true);

      resolveLogin({ data: { user: { id: '1' }, session: {} }, error: null });
      await loginPromise;
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('signup', () => {
    it('calls supabase.auth.signUp with metadata', async () => {
      const mockUser = { id: '2', email: 'new@test.com' };
      const mockSession = { access_token: 'token-456' };
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await useAuthStore.getState().signup('new@test.com', 'password', 'Jane');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'password',
        options: { data: { name: 'Jane' } },
      });
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.loading).toBe(false);
    });

    it('sets error on failure', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: {},
        error: { message: 'Email taken' },
      });

      await expect(
        useAuthStore.getState().signup('taken@test.com', 'pw', 'X')
      ).rejects.toThrow('Email taken');

      expect(useAuthStore.getState().error).toBe('Email taken');
    });
  });

  describe('loginWithGoogle', () => {
    it('calls supabase.auth.signInWithOAuth with redirectTo', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      await useAuthStore.getState().loginWithGoogle();

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
    });

    it('sets error on failure', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({
        error: { message: 'OAuth failed' },
      });

      await expect(
        useAuthStore.getState().loginWithGoogle()
      ).rejects.toThrow('OAuth failed');

      expect(useAuthStore.getState().error).toBe('OAuth failed');
    });
  });

  describe('logout', () => {
    it('calls supabase.auth.signOut and clears user/session', async () => {
      useAuthStore.setState({
        user: { id: '1' },
        session: { token: 'abc' },
        loading: false,
      });
      supabase.auth.signOut.mockResolvedValue({ error: null });

      await useAuthStore.getState().logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('sets error on failure', async () => {
      supabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      await expect(
        useAuthStore.getState().logout()
      ).rejects.toThrow('Sign out failed');

      expect(useAuthStore.getState().error).toBe('Sign out failed');
    });
  });

  describe('resetPassword', () => {
    it('calls supabase.auth.resetPasswordForEmail', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      await useAuthStore.getState().resetPassword('user@test.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@test.com', {
        redirectTo: `${window.location.origin}/login`,
      });
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' },
      });

      await expect(
        useAuthStore.getState().resetPassword('nope@test.com')
      ).rejects.toThrow('User not found');

      expect(useAuthStore.getState().error).toBe('User not found');
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('initialize', () => {
    it('sets up auth state by calling getSession and onAuthStateChange', async () => {
      const mockSession = { user: { id: '1' }, access_token: 'tok' };
      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      const mockUnsubscribe = vi.fn();
      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const cleanup = useAuthStore.getState().initialize();

      // Wait for getSession promise to resolve
      await vi.waitFor(() => {
        expect(useAuthStore.getState().loading).toBe(false);
      });

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockSession.user);
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();

      // cleanup should call unsubscribe
      cleanup();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('sets error when getSession fails', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' },
      });
      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      useAuthStore.getState().initialize();

      await vi.waitFor(() => {
        expect(useAuthStore.getState().loading).toBe(false);
      });

      expect(useAuthStore.getState().error).toBe('Network error');
    });

    it('updates state when onAuthStateChange fires', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      let authCallback;
      supabase.auth.onAuthStateChange.mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      useAuthStore.getState().initialize();

      // Simulate an auth state change
      const newSession = { user: { id: '99' }, access_token: 'new-tok' };
      authCallback('SIGNED_IN', newSession);

      expect(useAuthStore.getState().session).toEqual(newSession);
      expect(useAuthStore.getState().user).toEqual(newSession.user);
    });
  });
});
