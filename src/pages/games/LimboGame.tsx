import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, RotateCcw } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import { calcPayout } from "@/lib/math";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

import LiveWinsFeed from "@/components/LiveWinsFeed";

const LimboGame = () => {
  const { goldCoins, user } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  const [betAmount, setBetAmount] = useState(100);
  const [target, setTarget] = useState(2.0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "rolling" | "result">("idle");
  const [result, setResult] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<{ mult: number; won: boolean }[]>([]);

  const winChance = Math.min(99, Math.max(1, Math.floor((0.99 / target) * 10000) / 100));
  const payout = calcPayout(betAmount, target);

  const play = useCallback(async () => {
    if (!user || processing) return;
    if (goldCoins < betAmount) { setShowTopUp(true); return; }
    setProcessing(true);
    setLastWin(0);

    try {
      const { sessionId, expectedOutcome } = await placeBet(betAmount, "gc", "limbo");
      setGameState("rolling");

      await new Promise((r) => setTimeout(r, 600));

      const resData = await resolveGame(sessionId, target, true);
      const res = expectedOutcome || 1.0;
      const won = resData.payout > 0;
      
      setResult(res);
      setGameState("result");
      setLastWin(resData.payout);
      setHistory((p) => [{ mult: res, won }, ...p.slice(0, 19)]);
    } catch (e: any) {
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    } finally {
      setProcessing(false);
    }
  }, [user, processing, goldCoins, betAmount, target, payout, placeBet, resolveGame]);

  const reset = () => { setGameState("idle"); setResult(0); setLastWin(0); };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold gold-text">Limbo</h1>
          <span className="text-xs text-muted-foreground ml-2">House Edge: 1%</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Controls */}
          <div className="glass-card gold-border-glow rounded-xl p-5 space-y-4 h-fit">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bet (GC)</label>
              <input type="number" min={10} max={goldCoins} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                disabled={gameState === "rolling"}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setBetAmount(v)} disabled={gameState === "rolling"}
                    className="flex-1 text-xs py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Target Multiplier</label>
              <input type="number" min={1.01} max={1000} step={0.01} value={target}
                onChange={(e) => setTarget(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                disabled={gameState === "rolling"}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex gap-2 mt-2">
                {[1.5, 2, 5, 10].map((v) => (
                  <button key={v} onClick={() => setTarget(v)} disabled={gameState === "rolling"}
                    className="flex-1 text-xs py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">{v}×</button>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Win Chance: {winChance}%</span>
              <span>Payout: {payout.toLocaleString()} GC</span>
            </div>
            {gameState === "idle" && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={play}
                disabled={processing || !user}
                className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-50">
                {!user ? "Sign In to Play" : "⚡ Roll"}
              </motion.button>
            )}
            {gameState === "result" && (
              <div className="space-y-3">
                {lastWin > 0 && (
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--success) / 0.1)" }}>
                    <div className="text-xs text-muted-foreground">You won</div>
                    <div className="text-xl font-bold gold-text">+{lastWin.toLocaleString()} GC</div>
                  </div>
                )}
                {lastWin === 0 && (
                  <div className="text-center p-3 rounded-lg bg-destructive/10">
                    <div className="text-sm font-medium text-destructive">Result {result.toFixed(2)}× — Below target</div>
                  </div>
                )}
                <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80">
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
              </div>
            )}
            {history.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">History</div>
                <div className="flex flex-wrap gap-1">
                  {history.map((h, i) => (
                    <span key={i} className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${h.won ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                      {h.mult.toFixed(2)}×
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Result display */}
          <div className="glass-card gold-border-glow rounded-xl p-5 flex flex-col items-center justify-center min-h-[400px]">
            <motion.div
              key={result}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center"
            >
              <div className={`text-7xl font-extrabold font-mono ${
                gameState === "result" ? (lastWin > 0 ? "gold-text" : "text-destructive") : "text-muted-foreground"
              }`}>
                {gameState === "rolling" ? "..." : result > 0 ? `${result.toFixed(2)}×` : "—"}
              </div>
              {gameState === "result" && (
                <div className={`text-sm mt-2 font-medium ${lastWin > 0 ? "gold-text" : "text-destructive"}`}>
                  Target: {target.toFixed(2)}× — {lastWin > 0 ? "WIN" : "MISS"}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};

export default LimboGame;
