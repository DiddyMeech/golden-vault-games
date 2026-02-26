
-- Security Lockdown: Remove dangerous user-facing policies

-- 1. Remove user INSERT/UPDATE on balances (only system/triggers should modify)
DROP POLICY IF EXISTS "Users update own balance" ON public.balances;
DROP POLICY IF EXISTS "Users insert own balance" ON public.balances;

-- 2. Remove user INSERT/UPDATE on game_sessions (only RPC functions should modify)
DROP POLICY IF EXISTS "Users update own sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON public.game_sessions;

-- 3. Remove user INSERT on transactions (only RPC functions should log)
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;

-- 4. Add server_seed_hash for provably fair logging
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS server_seed_hash text;

-- 5. Add positive bet constraint
DO $$ BEGIN
  ALTER TABLE public.game_sessions ADD CONSTRAINT positive_bet CHECK (bet_amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Add wallet_address column with format validation to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_address text;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT valid_wallet_address 
    CHECK (wallet_address IS NULL OR wallet_address ~ '^0x[a-fA-F0-9]{40}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Atomic place_bet_and_update_balance RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.place_bet_and_update_balance(
  p_amount numeric,
  p_currency text,
  p_game_type text,
  p_server_seed_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_session_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Bet amount must be positive';
  END IF;
  IF p_currency NOT IN ('gc', 'st') THEN
    RAISE EXCEPTION 'Invalid currency';
  END IF;

  -- Lock row and check balance atomically
  IF p_currency = 'gc' THEN
    SELECT gold_coins INTO v_balance FROM balances WHERE user_id = v_user_id FOR UPDATE;
  ELSE
    SELECT sweep_tokens INTO v_balance FROM balances WHERE user_id = v_user_id FOR UPDATE;
  END IF;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Balance not found';
  END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct atomically
  IF p_currency = 'gc' THEN
    UPDATE balances SET gold_coins = gold_coins - p_amount, updated_at = now() WHERE user_id = v_user_id;
  ELSE
    UPDATE balances SET sweep_tokens = sweep_tokens - p_amount, updated_at = now() WHERE user_id = v_user_id;
  END IF;

  -- Create game session
  INSERT INTO game_sessions (user_id, game_type, bet_amount, currency, status, server_seed_hash)
  VALUES (v_user_id, p_game_type, p_amount, p_currency, 'active', p_server_seed_hash)
  RETURNING id INTO v_session_id;

  -- Log transaction
  INSERT INTO transactions (user_id, type, amount, currency, session_id, status)
  VALUES (v_user_id, 'bet', -p_amount, p_currency, v_session_id, 'confirmed');

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;

-- 8. Atomic resolve_game_session RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.resolve_game_session(
  p_session_id uuid,
  p_multiplier numeric,
  p_won boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_session record;
  v_payout numeric;
  v_gc numeric;
  v_st numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and fetch session
  SELECT * INTO v_session FROM game_sessions
  WHERE id = p_session_id AND user_id = v_user_id AND status = 'active'
  FOR UPDATE;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Invalid or already resolved session';
  END IF;

  IF p_won THEN
    v_payout := ROUND(v_session.bet_amount * p_multiplier, 2);
  ELSE
    v_payout := 0;
  END IF;

  UPDATE game_sessions SET
    status = 'completed',
    multiplier = p_multiplier,
    payout = v_payout,
    resolved_at = now()
  WHERE id = p_session_id;

  IF v_payout > 0 THEN
    IF v_session.currency = 'gc' THEN
      UPDATE balances SET gold_coins = gold_coins + v_payout, updated_at = now() WHERE user_id = v_user_id;
    ELSE
      UPDATE balances SET sweep_tokens = sweep_tokens + v_payout, updated_at = now() WHERE user_id = v_user_id;
    END IF;

    INSERT INTO transactions (user_id, type, amount, currency, session_id, status)
    VALUES (v_user_id, 'win', v_payout, v_session.currency, p_session_id, 'confirmed');
  END IF;

  SELECT gold_coins, sweep_tokens INTO v_gc, v_st FROM balances WHERE user_id = v_user_id;

  RETURN jsonb_build_object('payout', v_payout, 'balance', jsonb_build_object('gold_coins', v_gc, 'sweep_tokens', v_st));
END;
$$;
