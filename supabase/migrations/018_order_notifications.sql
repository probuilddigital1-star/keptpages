-- Migration 018: Add email_notifications_sent column for idempotent email delivery
-- Used by the Lulu status cron poller to track which notification emails have been sent

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS email_notifications_sent JSONB DEFAULT '{}';

COMMENT ON COLUMN public.books.email_notifications_sent IS 'Tracks sent notification emails, e.g. {"order_confirmation": "2026-03-15T...", "shipping": "2026-03-15T..."}';
