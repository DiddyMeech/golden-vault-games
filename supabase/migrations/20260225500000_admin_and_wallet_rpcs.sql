-- Admin and Wallet Expansion

-- 1. Add roles to profiles for Admin panel access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'player';

-- 2. Request Withdrawal RPC
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_currency text,
  p_wallet_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_tx_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be positive';
  END IF;
  
  IF p_currency NOT IN ('btc', 'eth', 'sol', 'usdt') THEN
    RAISE EXCEPTION 'Invalid currency';
  END IF;

  -- Lock row and check balance
  SELECT sweep_tokens INTO v_balance FROM balances WHERE user_id = v_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Balance not found';
  END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient sweep tokens';
  END IF;

  -- Deduct sweep tokens
  UPDATE balances SET sweep_tokens = sweep_tokens - p_amount, updated_at = now() WHERE user_id = v_user_id;

  -- Insert transaction (negative amount)
  INSERT INTO transactions (user_id, type, amount, currency, status, wallet_address)
  VALUES (v_user_id, 'withdrawal', -p_amount, p_currency, 'pending', p_wallet_address)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'tx_id', v_tx_id);
END;
$$;

-- 3. Submit Deposit RPC
CREATE OR REPLACE FUNCTION public.submit_deposit(
  p_currency text,
  p_tx_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tx_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_currency NOT IN ('btc', 'eth', 'sol', 'usdt') THEN
    RAISE EXCEPTION 'Invalid currency';
  END IF;

  -- Insert pending deposit transaction (amount starts at 0, admin/system verifies)
  INSERT INTO transactions (user_id, type, amount, currency, status, tx_hash)
  VALUES (v_user_id, 'deposit', 0, p_currency, 'pending', p_tx_hash)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'tx_id', v_tx_id);
END;
$$;

-- 4. Admin Update Transaction Status RPC
CREATE OR REPLACE FUNCTION public.admin_update_transaction_status(
  p_tx_id uuid,
  p_status text,
  p_final_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_role text;
  v_tx record;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_admin_role FROM profiles WHERE id = v_admin_id;
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Requires admin privileges';
  END IF;

  -- Get transaction with row lock
  SELECT * INTO v_tx FROM transactions WHERE id = p_tx_id FOR UPDATE;
  
  IF v_tx IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  IF v_tx.status = 'confirmed' OR v_tx.status = 'failed' OR v_tx.status = 'rejected' THEN
    RAISE EXCEPTION 'Transaction is already finalized';
  END IF;

  -- Handle Deposit Approval
  IF v_tx.type = 'deposit' AND p_status = 'confirmed' THEN
    IF p_final_amount IS NULL OR p_final_amount <= 0 THEN
      RAISE EXCEPTION 'Final amount required to confirm deposit';
    END IF;
    
    -- Update transaction amount
    UPDATE transactions SET status = p_status, amount = p_final_amount WHERE id = p_tx_id;
    
    -- Credit Gold Coins (assuming 1 Crypto = X Gold Coins/Tokens mapping logic handled outside, but for simplicity we can credit ST for now depending on platform rules, wait, Sweepstakes usually gives GC + free ST)
    -- Or maybe this just credits GC? For now, we will credit Sweep Tokens for tests, or whatever currency system they use. 
    -- Actually, deposits aren't fully architected in the UI for packages. We'll default to just keeping the deposit status updated. 
  END IF;

  -- Handle Withdrawal Rejection/Failure (Refund)
  IF v_tx.type = 'withdrawal' AND (p_status = 'failed' OR p_status = 'rejected') THEN
    -- Refund the deducted amount (which was negative, so we add the ABS value back to sweep_tokens)
    UPDATE balances SET sweep_tokens = sweep_tokens + ABS(v_tx.amount), updated_at = now() WHERE user_id = v_tx.user_id;
    UPDATE transactions SET status = p_status WHERE id = p_tx_id;
  END IF;

  -- Normal Status Update
  IF NOT (v_tx.type = 'deposit' AND p_status = 'confirmed') AND NOT (v_tx.type = 'withdrawal' AND (p_status = 'failed' OR p_status = 'rejected')) THEN
    UPDATE transactions SET status = p_status WHERE id = p_tx_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
