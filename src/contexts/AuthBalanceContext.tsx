import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface BalanceState {
  user: User | null;
  loading: boolean;
  goldCoins: number;
  sweepTokens: number;
  isWalletModalOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  refreshBalance: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthBalanceContext = createContext<BalanceState | null>(null);

export const useAuthBalance = () => {
  const ctx = useContext(AuthBalanceContext);
  if (!ctx) throw new Error("useAuthBalance must be used within AuthBalanceProvider");
  return ctx;
};

export const AuthBalanceProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [goldCoins, setGoldCoins] = useState(0);
  const [sweepTokens, setSweepTokens] = useState(0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const openWalletModal = useCallback(() => setIsWalletModalOpen(true), []);
  const closeWalletModal = useCallback(() => setIsWalletModalOpen(false), []);

  const fetchBalance = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("balances")
      .select("gold_coins, sweep_tokens")
      .eq("user_id", userId)
      .single();
    if (data) {
      setGoldCoins(Number(data.gold_coins));
      setSweepTokens(Number(data.sweep_tokens));
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (user) await fetchBalance(user.id);
  }, [user, fetchBalance]);

  useEffect(() => {
    // Capture ref from URL
    const searchParams = new URLSearchParams(window.location.search);
    const refId = searchParams.get("ref");
    if (refId) localStorage.setItem("vault_ref", refId);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      
      if (u) {
        // Try to attribute referral if it exists
        const storedRef = localStorage.getItem("vault_ref");
        if (storedRef && storedRef !== u.id) {
          // Fire and forget, ignore errors (like already referred, invalid uuid, etc)
          supabase.from("affiliates").insert({ referrer_id: storedRef, referred_id: u.id })
            .then(() => localStorage.removeItem("vault_ref"))
            .catch(() => localStorage.removeItem("vault_ref"));
        }
        await fetchBalance(u.id);
      } else {
        setGoldCoins(0);
        setSweepTokens(0);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const storedRef = localStorage.getItem("vault_ref");
        if (storedRef && storedRef !== u.id) {
          supabase.from("affiliates").insert({ referrer_id: storedRef, referred_id: u.id })
            .then(() => localStorage.removeItem("vault_ref"))
            .catch(() => localStorage.removeItem("vault_ref"));
        }
        fetchBalance(u.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchBalance]);

  // Realtime balance updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("balance-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "balances", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const d = payload.new as any;
          setGoldCoins(Number(d.gold_coins));
          setSweepTokens(Number(d.sweep_tokens));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setGoldCoins(0);
    setSweepTokens(0);
  }, []);

  return (
    <AuthBalanceContext.Provider value={{ 
      user, loading, goldCoins, sweepTokens, refreshBalance, signOut,
      isWalletModalOpen, openWalletModal, closeWalletModal
    }}>
      {children}
    </AuthBalanceContext.Provider>
  );
};
