import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';

export function AuthGuard() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function GuestGuard() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
