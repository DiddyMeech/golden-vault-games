import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { audio } from "@/lib/audio";
import { toast } from "sonner";

export const useBettingEngine = () => {
  const { refreshBalance } = useAuthBalance();
  const betTimestamps = useRef<number[]>([]);

  const placeBet = useCallback(async (amount: number, currency: "gc" | "st", gameType: string, gameData?: any, clientSeed?: string): Promise<{ sessionId: string, serverSeedHash: string, expectedOutcome?: number }> => {
    if (localStorage.getItem("account_frozen") === "true") {
      toast.error("Account Frozen: Automated betting detected. Please contact support.");
      throw new Error("ACCOUNT_FROZEN");
    }

    const now = Date.now();
    betTimestamps.current.push(now);
    if (betTimestamps.current.length > 10) {
      betTimestamps.current.shift();
    }
    
    if (betTimestamps.current.length === 10) {
      const timeDiff = now - betTimestamps.current[0];
      if (timeDiff < 1000) {
         localStorage.setItem("account_frozen", "true");
         toast.error("Account Frozen: Max 10 bets/sec exceeded.", { duration: 10000 });
         throw new Error("ACCOUNT_FROZEN");
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    audio.playClick();
    const { data, error } = await supabase.functions.invoke("betting-engine", {
      body: { 
        action: "place_bet", 
        amount, 
        currency, 
        game_type: gameType,
        game_data: gameData,
        client_seed: clientSeed || Math.random().toString(36).substring(7)
      },
    });
    
    if (error) {
       console.error("Place bet error:", error);
       throw error;
    }
    await refreshBalance();
    return { sessionId: data.session_id, serverSeedHash: data.server_seed_hash, expectedOutcome: data.expected_outcome };
  }, [refreshBalance]);

  const resolveGame = useCallback(async (sessionId: string, multiplier: number, won: boolean, gameData?: any) => {
    const { data, error } = await supabase.functions.invoke("betting-engine", {
      body: { 
        action: "resolve_game", 
        session_id: sessionId,
        target_multiplier: multiplier,
        game_data: gameData
      },
    });
    
    if (error) {
       console.error("Resolve game error:", error);
       throw error;
    }
    await refreshBalance();
    if (data.payout > 0 && won) {
        audio.playWin();
    }
    return data;
  }, [refreshBalance]);

  const generateCrashPoint = useCallback(async (): Promise<number> => {
    const { data, error } = await supabase.functions.invoke("betting-engine", {
      body: { action: "generate_crash_point" },
    });
    if (error) throw error;
    return data.crash_point;
  }, []);

  return { placeBet, resolveGame, generateCrashPoint };
};
