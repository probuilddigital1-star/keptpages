import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';

function getPasswordStrength(pw) {
  if (!pw || pw.length < 8) return { score: 0, label: 'Too short', color: 'bg-red-400' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-400' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-yellow-400' };
  return { score: 3, label: 'Strong', color: 'bg-sage' };
}

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle, loading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);

  function validate() {
    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8)
      errors.password = 'Password must be at least 8 characters';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    const errors = validate();
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await signup(email, password, name);
      setSuccess(true);
    } catch {
      // Error is set in the store
    }
  }

  async function handleGoogleSignup() {
    clearError();
    try {
      await loginWithGoogle();
    } catch {
      toast('Google sign-up failed. Please try again.', 'error');
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-container-sm">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="font-display text-3xl font-bold text-walnut">
                Kept<span className="text-terracotta">Pages</span>
              </h1>
            </Link>
          </div>

          <Card className="p-8 text-center animate-scale-in">
            <div className="mb-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-sage-light flex items-center justify-center">
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
            </div>
            <h2 className="font-display text-xl font-semibold text-walnut mb-2">
              Check your email
            </h2>
            <p className="font-body text-walnut-secondary mb-6">
              We&apos;ve sent a confirmation link to{' '}
              <span className="font-medium text-walnut">{email}</span>. Click the
              link to verify your account and get started.
            </p>
            <Link
              to="/login"
              className="font-ui text-sm text-terracotta hover:text-terracotta-hover font-medium transition-colors"
            >
              Back to log in
            </Link>
          </Card>
        </div>
      </div>
    );
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
            Create your account to start preserving.
          </p>
          <p className="font-handwriting text-lg text-terracotta/60 mt-1">
            your family&apos;s memories, beautifully kept
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
              label="Full Name"
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationErrors.name) {
                  setValidationErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              error={validationErrors.name}
              autoComplete="name"
              disabled={loading}
            />

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

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                error={validationErrors.password}
                autoComplete="new-password"
                disabled={loading}
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : 'bg-cream-alt'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="font-ui text-xs text-walnut-muted mt-1">{strength.label}</p>
                </div>
              )}
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create Account
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="font-ui text-xs text-walnut-muted uppercase tracking-[3px]">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google sign-up */}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleGoogleSignup}
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
              Sign up with Google
            </Button>
          </form>
        </Card>

        {/* Log in link */}
        <p className="text-center mt-6 font-ui text-sm text-walnut-secondary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-terracotta hover:text-terracotta-hover font-medium transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
