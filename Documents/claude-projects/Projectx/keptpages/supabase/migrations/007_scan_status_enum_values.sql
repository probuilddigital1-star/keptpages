-- Migration 007: Add missing scan_status enum values
-- Original enum: uploading, uploaded, processing, review, accepted, failed
-- Worker code also uses: completed, reprocessing, error
-- Add the missing values so the worker can set these statuses.

ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'reprocessing';
ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'error';

NOTIFY pgrst, 'reload schema';
