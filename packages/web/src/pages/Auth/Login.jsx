import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  function validate() {
    const errors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    const errors = validate();
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await login(email, password);
      navigate('/app');
    } catch {
      // Error is set in the store
    }
  }

  async function handleGoogleLogin() {
    clearError();
    try {
      await loginWithGoogle();
    } catch {
      toast('Google sign-in failed. Please try again.', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-container-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="font-display text-3xl font-bold text-walnut">
              Kept<span className="text-terracotta">Pages</span>
            </h1>
          </Link>
          <p className="font-body text-walnut-secondary mt-2">
            Welcome back. Sign in to your account.
          </p>
          <p className="font-handwriting text-lg text-terracotta/60 mt-1">
            every page tells a story
          </p>
        </div>

        <Card className="p-8 animate-scale-in">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {/* Server error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600 font-ui animate-slide-up">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              error={validationErrors.email}
              autoComplete="email"
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={validationErrors.password}
              autoComplete="current-password"
              disabled={loading}
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="font-ui text-sm text-terracotta hover:text-terracotta-hover transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Log In
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="font-ui text-xs text-walnut-muted uppercase tracking-[3px]">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google sign-in */}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Button>
          </form>
        </Card>

        {/* Sign up link */}
        <p className="text-center mt-6 font-ui text-sm text-walnut-secondary">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="text-terracotta hover:text-terracotta-hover font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
