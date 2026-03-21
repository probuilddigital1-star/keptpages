import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const SESSION_KEY = 'keptpages_session_id';

function refreshSessionId() {
  try {
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return null;
  }
}

function clearSessionId() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Not available in test/SSR
  }
}

/**
 * Build the OAuth redirect URL based on current environment.
 * In production this must point to the app domain (app.keptpages.com)
 * so the Supabase client can pick up the session from the URL hash.
 */
function getOAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  session: null,
  loading: true,
  error: null,

  // Actions
  initialize: () => {
    if (!isSupabaseConfigured) {
      // No Supabase credentials — skip auth, render app as guest
      set({ loading: false });
      return () => {};
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    }).catch(() => {
      set({ loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          refreshSessionId();
        } else if (event === 'SIGNED_OUT') {
          clearSessionId();
        }
        set({
          session,
          user: session?.user ?? null,
          loading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      refreshSessionId();
      set({ user: data.user, session: data.session, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  signup: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      set({ user: data.user, session: data.session, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl(),
        },
      });
      if (error) throw error;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearSessionId();
      set({ user: null, session: null, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
