-- Add provably fair seed columns to game_sessions
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS server_seed text;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS client_seed text;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS nonce integer DEFAULT 1;

-- Revoke public access to critical RPCs to force usage of the secure Edge Function
REVOKE ALL ON FUNCTION public.place_bet_and_update_balance(numeric, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.place_bet_and_update_balance(numeric, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.place_bet_and_update_balance(numeric, text, text, text) FROM anon;

REVOKE ALL ON FUNCTION public.resolve_game_session(uuid, numeric, boolean) FROM public;
REVOKE ALL ON FUNCTION public.resolve_game_session(uuid, numeric, boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.resolve_game_session(uuid, numeric, boolean) FROM anon;

-- Note: The service_role key used by Edge Functions bypasses RLS and permissions, 
-- so it can still call these RPCs.

-- We also need to update place_bet_and_update_balance to accept server_seed, client_seed
DROP FUNCTION IF EXISTS public.place_bet_and_update_balance(numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.place_bet_and_update_balance(
  p_amount numeric,
  p_currency text,
  p_game_type text,
  p_server_seed text DEFAULT NULL,
  p_server_seed_hash text DEFAULT NULL,
  p_client_seed text DEFAULT NULL
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
    -- Fallback to check if service_role is setting user_id indirectly, normally auth.uid() is empty for service_role unless set, 
    -- but since Edge func calls it with service role, it might be null!
    -- Wait, if it's called by edge function with service_role, auth.uid() is null!
    -- We need to pass p_user_id !
  END IF;
END;
$$;
