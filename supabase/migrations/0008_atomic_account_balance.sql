-- Migration 0008: Atomic account balance increment/decrement function

CREATE OR REPLACE FUNCTION increment_account_balance(
  p_account_id UUID,
  p_amount NUMERIC,
  p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE accounts
  SET balance = balance + p_amount
  WHERE id = p_account_id AND user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or access denied';
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_account_balance(UUID, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_account_balance(UUID, NUMERIC, UUID) TO service_role;
