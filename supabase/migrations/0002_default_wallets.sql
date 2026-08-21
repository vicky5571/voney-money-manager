-- Migration: Default Wallets Seed and Backfill
-- Seeds 5 default wallets (Cash, Bank BCA, Dana, GoPay, OVO) for new users
-- and backfills existing users missing any of these default wallets.

-- 1. Replace handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User')
  );

  -- Seed 5 default wallets
  INSERT INTO public.accounts (user_id, name, type, icon, balance, sort_order)
  VALUES
    (NEW.id, 'Cash', 'cash', 'wallet', 0.00, 0),
    (NEW.id, 'Bank BCA', 'bank', 'building-2', 0.00, 1),
    (NEW.id, 'Dana', 'e-wallet', 'smartphone', 0.00, 2),
    (NEW.id, 'GoPay', 'e-wallet', 'smartphone', 0.00, 3),
    (NEW.id, 'OVO', 'e-wallet', 'smartphone', 0.00, 4);

  RETURN NEW;
END;
$$;

-- 2. Backfill existing users with missing default wallets
INSERT INTO public.accounts (user_id, name, type, icon, balance, sort_order)
SELECT
  u.id,
  d.name,
  d.type,
  d.icon,
  d.balance,
  d.sort_order
FROM public.users u
CROSS JOIN (
  VALUES
    ('Cash', 'cash', 'wallet', 0.00, 0),
    ('Bank BCA', 'bank', 'building-2', 0.00, 1),
    ('Dana', 'e-wallet', 'smartphone', 0.00, 2),
    ('GoPay', 'e-wallet', 'smartphone', 0.00, 3),
    ('OVO', 'e-wallet', 'smartphone', 0.00, 4)
) AS d(name, type, icon, balance, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.accounts a
  WHERE a.user_id = u.id AND a.name = d.name
);
