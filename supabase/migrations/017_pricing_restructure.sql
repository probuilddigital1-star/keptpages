-- ============================================================================
-- Migration 017: Pricing Restructure (Subscription → Project-Based Model)
-- Adds 'book_purchaser' tier, Keeper Pass tracking columns, and updates
-- scan/collection limit functions for the new 4-tier pricing model.
-- ============================================================================

-- 1. Add 'book_purchaser' to the subscription_tier enum
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'book_purchaser';

-- 2. Add pricing restructure columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS keeper_pass_purchased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_book_purchased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS book_discount_percent INTEGER NOT NULL DEFAULT 0;

-- 3. Update can_create_scan: book_purchaser and keeper get unlimited
CREATE OR REPLACE FUNCTION can_create_scan(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  current_count INT;
BEGIN
  SELECT tier, scan_count
  INTO user_tier, current_count
  FROM public.profiles
  WHERE id = user_uuid;

  IF user_tier = 'keeper' OR user_tier = 'book_purchaser' THEN
    RETURN TRUE;
  END IF;

  -- Free tier limit: 25 scans
  RETURN current_count < 25;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update can_create_collection: keeper=unlimited, book_purchaser<3, free<2
CREATE OR REPLACE FUNCTION can_create_collection(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  current_count INT;
BEGIN
  SELECT tier, collection_count
  INTO user_tier, current_count
  FROM public.profiles
  WHERE id = user_uuid;

  IF user_tier = 'keeper' THEN
    RETURN TRUE;
  END IF;

  IF user_tier = 'book_purchaser' THEN
    RETURN current_count < 3;
  END IF;

  -- Free tier limit: 2 collections
  RETURN current_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Migrate owner/admin account to Keeper Pass holder
-- The owner is the only subscriber — identified by tier='keeper' or having a stripe_subscription_id
UPDATE public.profiles
SET
  keeper_pass_purchased_at = now(),
  book_discount_percent = 15
WHERE tier = 'keeper';
