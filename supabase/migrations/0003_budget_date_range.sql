-- Migration: Add Start and End Date to Budgets
-- Adds start_date and end_date columns, backfills existing records, and updates constraints.

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Backfill existing budgets where start_date or end_date is null
UPDATE public.budgets
SET
  start_date = MAKE_DATE(year, month, 1),
  end_date = (MAKE_DATE(year, month, 1) + INTERVAL '1 month - 1 day')::DATE
WHERE start_date IS NULL OR end_date IS NULL;

-- Make start_date and end_date NOT NULL
ALTER TABLE public.budgets
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL;

-- Allow month and year to be nullable
ALTER TABLE public.budgets
  ALTER COLUMN month DROP NOT NULL,
  ALTER COLUMN year DROP NOT NULL;

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_budgets_user_date_range ON public.budgets (user_id, start_date, end_date);
