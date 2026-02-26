-- 1. Create Affiliates Table
CREATE TABLE IF NOT EXISTS public.affiliates (
  referrer_id uuid REFERENCES public.profiles(id) NOT NULL,
  referred_id uuid REFERENCES public.profiles(id) PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for Affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referrals" ON public.affiliates
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referral on themselves" ON public.affiliates
  FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- 2. Modify resolve_game_session to issue Affiliate Commission inline securely.
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
  v_referrer_id uuid;
  v_affiliate_bonus numeric;
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

  -- Give Affiliate 5% of House Edge (which is 0.15% of bet amount total)
  IF v_session.currency = 'st' THEN
    SELECT referrer_id INTO v_referrer_id FROM affiliates WHERE referred_id = v_user_id;

    IF v_referrer_id IS NOT NULL THEN
      v_affiliate_bonus := ROUND(v_session.bet_amount * 0.0015, 4);
      IF v_affiliate_bonus > 0 THEN
        UPDATE balances SET sweep_tokens = sweep_tokens + v_affiliate_bonus WHERE user_id = v_referrer_id;
        INSERT INTO transactions (user_id, type, amount, currency, session_id, status)
        VALUES (v_referrer_id, 'affiliate_commission', v_affiliate_bonus, 'st', p_session_id, 'confirmed');
      END IF;
    END IF;
  END IF;

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
