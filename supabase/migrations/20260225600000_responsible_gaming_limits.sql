-- Responsible Gaming Limits

-- 1. Add fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS self_excluded_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_bet_limit_gc numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_bet_limit_st numeric;

-- 2. Update place_bet_and_update_balance RPC to check limits
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
  v_profile record;
  v_daily_wagered numeric;
  v_recent_bets_count int;
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

  -- 1. Anti-Botting Security Rate Limiter (Max 10 bets/sec)
  SELECT COALESCE(COUNT(*), 0) INTO v_recent_bets_count
  FROM transactions 
  WHERE user_id = v_user_id 
    AND type = 'bet' 
    AND created_at > (now() - interval '1 second');

  IF v_recent_bets_count >= 10 THEN
    -- Freeze account for 1 hour to stop botting activity
    UPDATE profiles SET self_excluded_until = now() + interval '1 hour' WHERE id = v_user_id;
    RAISE EXCEPTION 'Account temporarily frozen due to rapid-fire bet submissions (Botting suspected).';
  END IF;

  -- 2. Responsible Gaming Checks
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
  IF v_profile.self_excluded_until IS NOT NULL AND v_profile.self_excluded_until > now() THEN
    RAISE EXCEPTION 'Account is self-excluded until %', v_profile.self_excluded_until;
  END IF;

  IF p_currency = 'gc' AND v_profile.daily_bet_limit_gc IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_daily_wagered
    FROM transactions 
    WHERE user_id = v_user_id 
      AND type = 'bet' 
      AND currency = 'gc' 
      AND created_at > (now() - interval '24 hours');
      
    IF v_daily_wagered + p_amount > v_profile.daily_bet_limit_gc THEN
      RAISE EXCEPTION 'Daily Gold Coin bet limit reached';
    END IF;
  END IF;

  IF p_currency = 'st' AND v_profile.daily_bet_limit_st IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_daily_wagered
    FROM transactions 
    WHERE user_id = v_user_id 
      AND type = 'bet' 
      AND currency = 'st' 
      AND created_at > (now() - interval '24 hours');
      
    IF v_daily_wagered + p_amount > v_profile.daily_bet_limit_st THEN
      RAISE EXCEPTION 'Daily Sweep Token bet limit reached';
    END IF;
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
