import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { Spinner } from '@/components/ui/Spinner';

/**
 * OAuth callback handler.
 *
 * After Google (or any OAuth provider) authenticates the user, Supabase
 * redirects here with either:
 *   - PKCE flow: ?code=... in the query string
 *   - Implicit flow: #access_token=... in the hash fragment
 *
 * This page sits OUTSIDE the AuthGuard so the Supabase client has time
 * to exchange the code/token before any redirect-to-login logic fires.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const handled = useRef(false);

  // On mount, explicitly try to exchange the code for a session (PKCE)
  // or let the client detect the hash fragment (implicit).
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // PKCE flow: exchange the authorization code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('OAuth code exchange failed:', error.message);
          navigate('/login', { replace: true });
        }
        // On success, onAuthStateChange will fire and set the user
      });
    }
    // For implicit flow, the Supabase client auto-detects the hash.
    // Either way, we rely on onAuthStateChange updating the store.
  }, [navigate]);

  // Watch for the user to appear in the store, then redirect to /app
  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
      return;
    }

    // Safety net: if after 5 seconds we still have no user, go to login
    const timer = setTimeout(() => {
      const { user: currentUser } = useAuthStore.getState();
      if (currentUser) {
        navigate('/app', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream gap-4">
      <Spinner size="lg" />
      <p className="font-ui text-sm text-walnut-secondary">
        Completing sign in...
      </p>
    </div>
  );
}
