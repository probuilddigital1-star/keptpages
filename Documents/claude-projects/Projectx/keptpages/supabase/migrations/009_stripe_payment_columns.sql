-- Migration 009: Add Stripe/payment columns and tables
-- Adds payment-related columns to profiles, subscriptions, and books tables.
-- Creates new payments table for tracking webhook-recorded payment events.

-- ==========================================================================
-- 1. PROFILES — Stripe subscription columns
-- ==========================================================================

-- Stripe customer ID (created on first checkout)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Active Stripe subscription ID
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Subscription status: 'none', 'active', 'past_due', 'canceled', 'trialing'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Plan identifier: e.g. 'keeper_yearly', 'keeper_monthly'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- When the current billing period ends
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Last time the subscription was updated via webhook
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMPTZ;

-- ==========================================================================
-- 2. SUBSCRIPTIONS — cancel flag
-- ==========================================================================

-- Whether the subscription cancels at end of current period
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- ==========================================================================
-- 3. PAYMENTS TABLE — webhook-recorded payment events
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  stripe_session_id     TEXT,
  stripe_payment_intent TEXT,
  stripe_invoice_id     TEXT,
  amount                INTEGER NOT NULL,
  currency              TEXT DEFAULT 'usd',
  status                TEXT DEFAULT 'succeeded',
  payment_type          TEXT DEFAULT 'subscription',
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================================================
-- 4. BOOKS — Stripe payment tracking columns
-- ==========================================================================

-- Checkout session for book order
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Payment intent for book order
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Payment status: 'pending', 'succeeded', 'failed'
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- ==========================================================================
-- 5. INDEXES
-- ==========================================================================

-- Fast lookup by Stripe customer ID (used in webhook handlers)
CREATE INDEX idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Payments by user (dashboard history)
CREATE INDEX idx_payments_user_id
  ON public.payments (user_id, created_at DESC);

-- Payments by Stripe session (webhook dedup)
CREATE INDEX idx_payments_stripe_session
  ON public.payments (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Payments by Stripe invoice (webhook dedup)
CREATE INDEX idx_payments_stripe_invoice
  ON public.payments (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- ==========================================================================
-- 6. ROW LEVEL SECURITY — payments table
-- ==========================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role should INSERT payments (via Stripe webhook handler).
-- No user-facing write policies needed.

-- ==========================================================================
-- 7. NOTIFY PostgREST to pick up schema changes
-- ==========================================================================

NOTIFY pgrst, 'reload schema';
