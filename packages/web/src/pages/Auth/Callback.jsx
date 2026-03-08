import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';

/**
 * OAuth callback handler.
 *
 * After Google (or any OAuth provider) authenticates the user, Supabase
 * redirects here with ?code=... (PKCE flow).
 *
 * IMPORTANT: We do NOT manually call exchangeCodeForSession here.
 * The Supabase client's internal _initialize() auto-detects the PKCE code
 * from the URL and exchanges it automatically. Calling it manually causes
 * a race condition where one exchange succeeds and the other fails —
 * and if _initialize() loses the race, it calls _removeSession() which
 * destroys the valid session.
 *
 * This page sits OUTSIDE the AuthGuard so the Supabase client has time
 * to process the code before any redirect-to-login logic fires.
 * We simply wait for onAuthStateChange to fire and populate the user.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // When user appears in the store (set by onAuthStateChange), go to /app
  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
      return;
    }

    // Safety net: if after 10 seconds we still have no user, go to login.
    // This handles edge cases where the code is invalid or expired.
    const timer = setTimeout(() => {
      const { user: currentUser } = useAuthStore.getState();
      if (currentUser) {
        navigate('/app', { replace: true });
      } else {
        console.error('OAuth callback: no session established after 10s');
        navigate('/login', { replace: true });
      }
    }, 10_000);

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
