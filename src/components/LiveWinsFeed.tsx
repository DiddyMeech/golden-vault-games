import { useState, useEffect } from "react";
import { Trophy, TrendingUp, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedNumber } from "./AnimatedNumber";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { Link } from "react-router-dom";

interface LiveEvent {
  id: string;
  user_id: string;
  user: string;
  game: string;
  crypto: string;
  amount: number;
  type: "bet" | "redemption" | "high_roller";
  isWin?: boolean;
}

const LiveWinsFeed = () => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "high_roller" | "my_bets">("all");
  const { user } = useAuthBalance();

  useEffect(() => {
    // Initial fetch of recent games
    // ... rest is same but skipped in replacement text up to the return ...
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("game_sessions")
        .select("id, user_id, game_type, currency, payout, bet_amount, status")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (data) {
        const initialEvents = data.map((session) => {
          const isWin = session.payout > session.bet_amount;
          const isHighRoller = session.payout >= session.bet_amount * 50;
          const event: LiveEvent = {
            id: session.id,
            user_id: session.user_id,
            user: `User 0x...${session.user_id.substring(session.user_id.length - 4)}`,
            game: session.game_type,
            crypto: session.currency.toUpperCase(),
            amount: isWin ? session.payout : session.bet_amount,
            type: isHighRoller ? "high_roller" : "bet",
            isWin
          };
          return event;
        });
        setEvents(initialEvents);
      }
    };

    fetchRecent();

    // Subscribe to new game sessions
    const gameSub = supabase
      .channel("live_games")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: "status=eq.completed" },
        (payload) => {
          const session = payload.new;
          if (!session.user_id) return;
          const isWin = session.payout > session.bet_amount;
          const isHighRoller = session.payout >= session.bet_amount * 50;
          
          const newEvent: LiveEvent = {
            id: session.id,
            user_id: session.user_id,
            user: `User 0x...${session.user_id.substring(session.user_id.length - 4)}`,
            game: session.game_type,
            crypto: session.currency.toUpperCase(),
            amount: isWin ? session.payout : session.bet_amount,
            type: isHighRoller ? "high_roller" : "bet",
            isWin
          };

          setEvents((prev) => [newEvent, ...prev].slice(0, 15));
        }
      )
      .subscribe();

    // Subscribe to new redemptions
    const txSub = supabase
      .channel("live_tx")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: "type=eq.withdrawal" },
        (payload) => {
          const tx = payload.new;
          if (!tx.user_id) return;
          const newEvent: LiveEvent = {
            id: tx.id,
            user_id: tx.user_id,
            user: `User 0x...${tx.user_id.substring(tx.user_id.length - 4)}`,
            game: "Redemption",
            crypto: tx.currency.toUpperCase(),
            amount: Math.abs(tx.amount),
            type: "redemption"
          };
          setEvents((prev) => [newEvent, ...prev].slice(0, 15));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameSub);
      supabase.removeChannel(txSub);
    };
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterTab === "high_roller") return e.type === "high_roller";
    if (filterTab === "my_bets") return user && e.user_id === user.id;
    return true;
  });

  return (
    <div className="glass-card gold-border-glow rounded-xl p-4 h-full flex flex-col">
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Activity</span>
          <div className="w-2 h-2 rounded-full animate-pulse ml-auto" style={{ backgroundColor: "hsl(var(--success))" }} />
        </div>
        <div className="flex gap-2 text-xs">
           <button onClick={() => setFilterTab("all")} className={`px-2 py-1 rounded-md transition-colors ${filterTab === "all" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-white/5"}`}>All Bets</button>
           <button onClick={() => setFilterTab("high_roller")} className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${filterTab === "high_roller" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-white/5"}`}>High Rollers</button>
           <button onClick={() => setFilterTab("my_bets")} disabled={!user} className={`px-2 py-1 rounded-md transition-colors ${filterTab === "my_bets" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-white/5 disabled:opacity-30"}`}>My Bets</button>
        </div>
      </div>
      
      <div className="space-y-2 overflow-hidden flex-1 relative">
        {filteredEvents.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">{filterTab === "my_bets" && !user ? "Log in to see your bets." : "Waiting for live action..."}</div>
        )}
        <AnimatePresence initial={false}>
          {filteredEvents.map((w) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, x: 20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                w.type === "redemption" ? "bg-emerald-500/10 border border-emerald-500/20" : 
                w.type === "high_roller" ? "bg-primary/10 border border-primary/20" : 
                "bg-secondary/50"
              }`}
            >
              {w.type === "redemption" ? (
                 <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              ) : w.isWin ? (
                 <TrendingUp className="w-3 h-3 text-primary flex-shrink-0" />
              ) : (
                <div className="w-3 h-3 flex-shrink-0 opacity-50" />
              )}
              
              <span className="text-muted-foreground truncate" title={w.user}>{w.user}</span>
              <span className={`font-medium truncate ${w.type === "redemption" ? "text-emerald-400" : "text-foreground"}`}>
                {w.game}
                {w.type === "redemption" && " Requested"}
              </span>
              
              <span className={`ml-auto font-bold whitespace-nowrap ${
                w.type === "redemption" ? "text-emerald-400" : 
                w.isWin ? "gold-text" : "text-muted-foreground"
              }`}>
                {w.type === "high_roller" && <span className="mr-1">🔥</span>}
                <AnimatedNumber value={w.amount} format={(v) => Number.isInteger(v) ? v.toString() : v.toFixed(2)} /> {w.crypto}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/50 text-center">
        <Link to="/provably-fair" className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto">
          <ShieldCheck className="w-3 h-3" /> Verify Provably Fair Hash
        </Link>
      </div>
    </div>
  );
};

export default LiveWinsFeed;
