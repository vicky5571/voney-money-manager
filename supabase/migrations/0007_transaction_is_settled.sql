-- Migration 0007: Add is_settled to transactions table

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for filtering unsettled transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_settled ON transactions(user_id, is_settled);
