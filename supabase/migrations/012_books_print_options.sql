-- Migration 012: Add print_options JSONB column to books table
-- Stores user-selected print configuration (binding, interior color, paper, cover finish)

ALTER TABLE books ADD COLUMN IF NOT EXISTS print_options JSONB DEFAULT '{}';

COMMENT ON COLUMN books.print_options IS 'User-selected print options: binding, interior, paper, cover';
