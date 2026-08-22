-- Migration: Recurring Bills and Subscriptions
-- Adds recurring_bills table with RLS and performance indexes

CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'weekly', 'yearly')),
  due_day INTEGER NOT NULL DEFAULT 1,
  next_due_date DATE NOT NULL,
  last_paid_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON public.recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_next_due ON public.recurring_bills(next_due_date);

ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring bills"
  ON public.recurring_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring bills"
  ON public.recurring_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring bills"
  ON public.recurring_bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring bills"
  ON public.recurring_bills FOR DELETE
  USING (auth.uid() = user_id);
