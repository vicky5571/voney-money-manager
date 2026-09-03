-- Migration 0006: Add scope to categories table ('personal' | 'business')

ALTER TABLE categories ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'personal';

-- Create an index on categories for fast user/scope lookup
CREATE INDEX IF NOT EXISTS idx_categories_user_scope ON categories(user_id, scope);
