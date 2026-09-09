-- Migration 0009: One-off data heal for legacy transfer records miscategorized as Food/Other
-- Ensures dedicated Transfer categories exist and associates past transfer transactions with them.

DO $$
DECLARE
  v_rec RECORD;
  v_cat_id UUID;
BEGIN
  -- For each user who has transfer transactions
  FOR v_rec IN 
    SELECT DISTINCT user_id 
    FROM transactions 
    WHERE note ILIKE 'Transfer to %' OR note ILIKE 'Transfer from %'
  LOOP
    -- Find or create Transfer category for this user
    SELECT id INTO v_cat_id 
    FROM categories 
    WHERE user_id = v_rec.user_id AND name ILIKE 'Transfer'
    LIMIT 1;

    IF v_cat_id IS NULL THEN
      INSERT INTO categories (user_id, name, icon, color, type, is_default, sort_order)
      VALUES (v_rec.user_id, 'Transfer', 'ArrowRightLeft', '#14B8A6', 'expense', false, 99)
      RETURNING id INTO v_cat_id;
    END IF;

    -- Update transactions with the resolved category
    IF v_cat_id IS NOT NULL THEN
      UPDATE transactions
      SET category_id = v_cat_id
      WHERE user_id = v_rec.user_id
        AND (note ILIKE 'Transfer to %' OR note ILIKE 'Transfer from %')
        AND (category_id IS DISTINCT FROM v_cat_id);
    END IF;
  END LOOP;
END;
$$;
