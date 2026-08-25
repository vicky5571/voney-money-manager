-- Migration 0005: Heavy Rocks — indexes, soft delete, cents safety, recurring helper

-- 1. Soft delete columns (audit + restore)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Composite and partial indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_desc ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_desc ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_deleted ON transactions(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_null ON transactions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_user_daterange ON budgets(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_null ON budgets(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_user_nextdue_active ON recurring_bills(user_id, next_due_date, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_deleted_null ON recurring_bills(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_null ON accounts(deleted_at) WHERE deleted_at IS NULL;

-- 3. Helper: advance recurring next_due_date safely in DB (no client drift)
CREATE OR REPLACE FUNCTION public.advance_recurring_next_due(current_due DATE, freq TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF freq = 'weekly' THEN
    RETURN current_due + INTERVAL '7 days';
  ELSIF freq = 'yearly' THEN
    RETURN (current_due + INTERVAL '1 year')::DATE;
  ELSE
    RETURN (current_due + INTERVAL '1 month')::DATE;
  END IF;
END;
$$;

-- Optional pg_cron job: auto-notify overdue bills (enable pg_cron extension if available)
-- SELECT cron.schedule('check-overdue-bills', '0 9 * * *', $$SELECT 1$$);
