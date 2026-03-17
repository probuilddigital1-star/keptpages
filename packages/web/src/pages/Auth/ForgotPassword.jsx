import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ForgotPassword() {
  const { resetPassword, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [sent, setSent] = useState(false);

  function validate() {
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Enter a valid email address';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    const err = validate();
    setValidationError(err);
    if (err) return;

    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      // Error is set in the store
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
        </div>

        <Card className="p-8 animate-scale-in">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-sage-light flex items-center justify-center mb-4">
                <svg
                  className="h-7 w-7 text-sage"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-semibold text-walnut mb-2">
                Check your inbox
              </h2>
              <p className="font-body text-walnut-secondary mb-6">
                If an account exists for{' '}
                <span className="font-medium text-walnut">{email}</span>, we&apos;ve
                sent a password reset link.
              </p>
              <Link
                to="/login"
                className="font-ui text-sm text-terracotta hover:text-terracotta-hover font-medium transition-colors"
              >
                Back to log in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold text-walnut mb-1">
                  Reset your password
                </h2>
                <p className="font-body text-sm text-walnut-secondary">
                  Enter the email address associated with your account and we&apos;ll
                  send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                {/* Server error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600 font-ui">
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
                    if (validationError) setValidationError('');
                  }}
                  error={validationError}
                  autoComplete="email"
                  disabled={loading}
                />

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send Reset Link
                </Button>
              </form>
            </>
          )}
        </Card>

        {/* Back to login */}
        {!sent && (
          <p className="text-center mt-6 font-ui text-sm text-walnut-secondary">
            <Link
              to="/login"
              className="text-terracotta hover:text-terracotta-hover font-medium transition-colors inline-flex items-center gap-1"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
