-- Migration 0010: Default business categories and freelance business scope
-- Enables out-of-the-box business tracking for freelance income and business expenses.

UPDATE categories
SET scope = 'business'
WHERE name ILIKE 'Freelance' AND is_default = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Client Project' AND is_default = true) THEN
    INSERT INTO categories (name, icon, color, type, scope, is_default, sort_order, user_id)
    VALUES ('Client Project', 'Briefcase', '#6366F1', 'income', 'business', true, 10, NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Business Expense' AND is_default = true) THEN
    INSERT INTO categories (name, icon, color, type, scope, is_default, sort_order, user_id)
    VALUES ('Business Expense', 'Receipt', '#8B5CF6', 'expense', 'business', true, 10, NULL);
  END IF;
END $$;
