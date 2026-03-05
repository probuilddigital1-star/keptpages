import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/env';

// True when real credentials are configured
export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey
);

// Create a real client or a no-op stub depending on environment
let client;

if (isSupabaseConfigured) {
  client = createClient(config.supabaseUrl, config.supabaseAnonKey);
} else {
  // Stub that won't crash when auth methods are called without credentials
  const noop = () => ({ data: null, error: { message: 'Supabase not configured' } });
  const noopAsync = async () => noop();
  client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: noopAsync,
      signUp: noopAsync,
      signInWithOAuth: noopAsync,
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: noopAsync,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => {
      const chain = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        delete: () => chain,
        eq: () => chain,
        single: async () => ({ data: null, error: null }),
        order: () => chain,
      };
      return chain;
    },
  };
  console.warn('Supabase not configured — running in demo mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = client;
