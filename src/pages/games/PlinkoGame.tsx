import { useState, useCallback, useRef, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { CircleDot, RotateCcw } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import { calcPayout } from "@/lib/math";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

const ROWS = 12;
const BUCKET_COUNT = ROWS + 1;

// Binomial probability: P(i) = C(R, i) * 0.5^R
// Multipliers are assigned inversely to probability (edges = rare = high multiplier)
function binomialCoeff(n: number, k: number): number {
  if (k > n - k) k = n - k;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return r;
}

function buildMultipliers(rows: number, riskLevel: "low" | "medium" | "high"): number[] {
  const buckets = rows + 1;
  const probs: number[] = [];
  const totalOutcomes = Math.pow(2, rows);
  for (let i = 0; i < buckets; i++) {
    probs.push(binomialCoeff(rows, i) / totalOutcomes);
  }

  // Risk scaling: higher risk = more extreme edges
  const riskScale = { low: 1, medium: 2.5, high: 6 };
  const scale = riskScale[riskLevel];

  // Target RTP ~97% (3% house edge)
  const RTP = 0.97;
  const rawMults = probs.map((p) => {
    if (p < 0.001) return 100 * scale;
    return Math.max(0.2, RTP / (p * buckets) * (scale > 1 ? Math.pow(1 / p, 0.15 * scale) / Math.pow(1 / p, 0.15) : 1));
  });

  // Normalize so expected value = RTP
  const ev = probs.reduce((sum, p, i) => sum + p * rawMults[i], 0);
  const normFactor = RTP / ev;
  return rawMults.map((m) => Math.round(m * normFactor * 10) / 10);
}

// Simulate ball using binomial: each row 50/50 left/right
function simulateBall(rows: number): number {
  let pos = 0;
  for (let i = 0; i < rows; i++) {
    pos += Math.random() < 0.5 ? 0 : 1;
  }
  return pos; // bucket index 0..rows
}

const PlinkoGame = () => {
  const { goldCoins, user } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  const [betAmount, setBetAmount] = useState(100);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [showTopUp, setShowTopUp] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [ballPath, setBallPath] = useState<{ row: number; col: number }[]>([]);
  const [landedBucket, setLandedBucket] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [processing, setProcessing] = useState(false);
  const animRef = useRef<number | null>(null);

  const multipliers = buildMultipliers(ROWS, risk);

  const dropBall = useCallback(async () => {
    if (!user || dropping) return;
    if (goldCoins < betAmount) { setShowTopUp(true); return; }
    setProcessing(true);
    setLastWin(0);
    setLandedBucket(null);

    try {
      const { sessionId, expectedOutcome } = await placeBet(betAmount, "gc", "plinko");

      // Determine outcome from server
      const bucket = expectedOutcome !== undefined ? expectedOutcome : simulateBall(ROWS);
      const mult = multipliers[bucket];
      
      // Generate a visual path that leads to this bucket
      let moves = Array(bucket).fill(1).concat(Array(ROWS - bucket).fill(0));
      moves.sort(() => Math.random() - 0.5); // shuffle for visual

      const path: { row: number; col: number }[] = [{ row: -1, col: 6 }];
      let pos = 0;
      for (let r = 0; r < ROWS; r++) {
        pos += moves[r];
        path.push({ row: r, col: pos });
      }
      const won = mult >= 1;

      setBallPath([]);
      setDropping(true);
      setProcessing(false);

      for (let i = 0; i < path.length; i++) {
        await new Promise((res) => setTimeout(res, 120));
        setBallPath((prev) => [...prev, path[i]]);
      }

      setLandedBucket(bucket);
      const resData = await resolveGame(sessionId, mult, true, { rows: ROWS, payouts: multipliers });
      setLastWin(resData.payout);

      setDropping(false);
    } catch (e: any) {
      setProcessing(false);
      setDropping(false);
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    }
  }, [user, dropping, goldCoins, betAmount, risk, multipliers, placeBet, resolveGame]);

  useEffect(() => { return () => { if (animRef.current) cancelAnimationFrame(animRef.current); }; }, []);

  const currentBallPos = ballPath.length > 0 ? ballPath[ballPath.length - 1] : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <CircleDot className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold gold-text">Plinko</h1>
          <span className="text-xs text-muted-foreground ml-2">Binomial Distribution</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="glass-card gold-border-glow rounded-xl p-5 space-y-4 h-fit">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bet (GC)</label>
              <input type="number" min={10} max={goldCoins} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))} disabled={dropping}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setBetAmount(v)} disabled={dropping}
                    className="flex-1 text-xs py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Risk Level</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((r) => (
                  <button key={r} onClick={() => setRisk(r)} disabled={dropping}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${risk === r ? "gold-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={dropBall}
              disabled={dropping || processing || !user}
              className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-50">
              {!user ? "Sign In to Play" : dropping ? "Dropping..." : processing ? "Placing bet..." : "Drop Ball"}
            </motion.button>
            {lastWin > 0 && landedBucket !== null && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center p-3 rounded-lg" style={{ backgroundColor: multipliers[landedBucket] >= 1 ? "hsl(var(--success) / 0.1)" : "hsl(var(--danger) / 0.1)" }}>
                <div className="text-xs text-muted-foreground">{multipliers[landedBucket]}× multiplier</div>
                <div className="text-xl font-bold gold-text">{lastWin > betAmount ? "+" : ""}{lastWin.toLocaleString()} GC</div>
              </motion.div>
            )}
          </div>

          <div className="glass-card gold-border-glow rounded-xl p-5 flex flex-col items-center">
            <div className="relative" style={{ width: "100%", maxWidth: 420, aspectRatio: "1" }}>
              {Array.from({ length: ROWS }, (_, row) => (
                <div key={row} className="flex justify-center" style={{ marginTop: row === 0 ? 8 : 0 }}>
                  {Array.from({ length: row + 3 }, (_, col) => (
                    <div key={col} className="w-3 h-3 rounded-full bg-muted-foreground/30 mx-2 my-1.5" />
                  ))}
                </div>
              ))}
              {currentBallPos && (
                <motion.div
                  animate={{
                    left: `${((currentBallPos.col + 0.5) / BUCKET_COUNT) * 100}%`,
                    top: `${((currentBallPos.row + 1.5) / (ROWS + 2)) * 85}%`,
                  }}
                  transition={{ type: "spring", damping: 10, stiffness: 200 }}
                  className="absolute w-5 h-5 -ml-2.5 rounded-full gold-gradient gold-glow-strong z-10"
                />
              )}
            </div>
            <div className="flex gap-1 mt-2 w-full max-w-[420px]">
              {multipliers.map((m, i) => (
                <div key={i} className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                  landedBucket === i ? "gold-gradient text-primary-foreground gold-glow-strong" :
                  m >= 5 ? "bg-destructive/20 text-destructive" :
                  m >= 2 ? "bg-primary/20 text-primary" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {m}×
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};

export default PlinkoGame;
