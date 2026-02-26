import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Dice5, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import { calcPayout } from "@/lib/math";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

const DiceGame = () => {
  const { goldCoins, user } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  const [betAmount, setBetAmount] = useState(100);
  const [threshold, setThreshold] = useState(50);
  const [direction, setDirection] = useState<"over" | "under">("under");
  const [showTopUp, setShowTopUp] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "rolling" | "result">("idle");
  const [roll, setRoll] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<{ roll: number; won: boolean }[]>([]);

  const winProb = direction === "under" ? threshold : 100 - threshold;
  const multiplier = winProb > 0 ? Math.floor((99 / winProb) * 100) / 100 : 0;
  const payout = calcPayout(betAmount, multiplier);

  const play = useCallback(async () => {
    if (!user || processing) return;
    if (goldCoins < betAmount) { setShowTopUp(true); return; }
    setProcessing(true);
    setLastWin(0);

    try {
      const { sessionId, expectedOutcome } = await placeBet(betAmount, "gc", "dice");
      setGameState("rolling");

      await new Promise((r) => setTimeout(r, 500));

      const resData = await resolveGame(sessionId, multiplier, true, { condition: direction, threshold });
      const r = expectedOutcome || 50.0;
      const won = resData.payout > 0;
      
      setRoll(r);
      setGameState("result");
      setLastWin(resData.payout);
      setHistory((p) => [{ roll: r, won }, ...p.slice(0, 19)]);
    } catch (e: any) {
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    } finally {
      setProcessing(false);
    }
  }, [user, processing, goldCoins, betAmount, threshold, direction, multiplier, payout, placeBet, resolveGame]);

  const reset = () => { setGameState("idle"); setRoll(0); setLastWin(0); };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Dice5 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold gold-text">Crypto Dice</h1>
          <span className="text-xs text-muted-foreground ml-2">House Edge: 1%</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
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
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Direction</label>
              <div className="flex gap-2">
                <button onClick={() => setDirection("under")} disabled={gameState === "rolling"}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    direction === "under" ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-border text-muted-foreground"
                  } disabled:opacity-50`}>
                  <ArrowDown className="w-4 h-4" /> Under
                </button>
                <button onClick={() => setDirection("over")} disabled={gameState === "rolling"}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    direction === "over" ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-border text-muted-foreground"
                  } disabled:opacity-50`}>
                  <ArrowUp className="w-4 h-4" /> Over
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Roll {direction === "under" ? "Under" : "Over"}: {threshold}
              </label>
              <input type="range" min={2} max={98} value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                disabled={gameState === "rolling"}
                className="w-full accent-primary" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="glass-card rounded-lg p-2">
                <div className="text-muted-foreground">Multiplier</div>
                <div className="font-bold text-foreground">{multiplier}×</div>
              </div>
              <div className="glass-card rounded-lg p-2">
                <div className="text-muted-foreground">Win Chance</div>
                <div className="font-bold text-foreground">{winProb}%</div>
              </div>
              <div className="glass-card rounded-lg p-2">
                <div className="text-muted-foreground">Payout</div>
                <div className="font-bold gold-text">{payout.toLocaleString()}</div>
              </div>
            </div>
            {gameState === "idle" && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={play}
                disabled={processing || !user}
                className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-50">
                {!user ? "Sign In to Play" : "🎲 Roll Dice"}
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
                    <div className="text-sm font-medium text-destructive">Rolled {roll.toFixed(2)} — {direction === "under" ? "Not under" : "Not over"} {threshold}</div>
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
                      {h.roll.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Result display */}
          <div className="glass-card gold-border-glow rounded-xl p-5 flex flex-col items-center justify-center min-h-[400px]">
            {/* Visual bar */}
            <div className="w-full max-w-md mb-8">
              <div className="relative h-6 rounded-full bg-secondary overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{
                    width: `${threshold}%`,
                    backgroundColor: direction === "under" ? "hsl(var(--success) / 0.3)" : "hsl(var(--destructive) / 0.2)",
                  }}
                />
                <div
                  className="absolute inset-y-0 right-0 rounded-full transition-all duration-300"
                  style={{
                    width: `${100 - threshold}%`,
                    backgroundColor: direction === "over" ? "hsl(var(--success) / 0.3)" : "hsl(var(--destructive) / 0.2)",
                  }}
                />
                {gameState === "result" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-primary shadow-lg"
                    style={{ left: `calc(${roll}% - 8px)` }}
                  />
                )}
                <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary"
                  style={{ left: `${threshold}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>{threshold}</span>
                <span>100</span>
              </div>
            </div>
            <motion.div
              key={roll}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center"
            >
              <div className={`text-7xl font-extrabold font-mono ${
                gameState === "result" ? (lastWin > 0 ? "gold-text" : "text-destructive") : "text-muted-foreground"
              }`}>
                {gameState === "rolling" ? "..." : roll > 0 ? roll.toFixed(2) : "—"}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};

export default DiceGame;
