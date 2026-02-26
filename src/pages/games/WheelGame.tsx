import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { CircleDashed, RotateCcw } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import { calcPayout } from "@/lib/math";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

type RiskLevel = "low" | "medium" | "high";

// Segments designed so sum(mult * prob) ≈ 0.97 (3% house edge)
const WHEEL_CONFIGS: Record<RiskLevel, { label: string; mult: number; color: string }[]> = {
  low: [
    { label: "1.2×", mult: 1.2, color: "hsl(51, 100%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "1.2×", mult: 1.2, color: "hsl(51, 100%, 50%)" },
    { label: "1.7×", mult: 1.7, color: "hsl(142, 71%, 45%)" },
    { label: "1.2×", mult: 1.2, color: "hsl(51, 100%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "1.2×", mult: 1.2, color: "hsl(51, 100%, 50%)" },
    { label: "2.0×", mult: 2.0, color: "hsl(262, 83%, 58%)" },
    { label: "1.2×", mult: 1.2, color: "hsl(51, 100%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
  ],     // sum = (1.2 * 5) + 1.7 + 2.0 = 9.7 -> RTP 0.97
  medium: [
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "2.0×", mult: 2.0, color: "hsl(51, 100%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "3.7×", mult: 3.7, color: "hsl(142, 71%, 45%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "2.0×", mult: 2.0, color: "hsl(51, 100%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "2.0×", mult: 2.0, color: "hsl(51, 100%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
  ],     // sum = (2.0 * 3) + 3.7 = 9.7 -> RTP 0.97
  high: [
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "9.7×", mult: 9.7, color: "hsl(51, 100%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
    { label: "0×", mult: 0, color: "hsl(0, 84%, 50%)" },
  ],     // sum = 9.7 = 9.7 -> RTP 0.97
};

const WheelGame = () => {
  const { goldCoins, user, openWalletModal } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  const [betAmount, setBetAmount] = useState(100);
  const [risk, setRisk] = useState<RiskLevel>("low");
  const [showTopUp, setShowTopUp] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "spinning" | "result">("idle");
  const [rotation, setRotation] = useState(0);
  const [resultSegment, setResultSegment] = useState<{ label: string; mult: number } | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<{ mult: number; won: boolean }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const segments = WHEEL_CONFIGS[risk];
  const segAngle = 360 / segments.length;

  const drawWheel = useCallback((rot: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);

    const segs = WHEEL_CONFIGS[risk];
    const angle = (2 * Math.PI) / segs.length;

    segs.forEach((seg, i) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * angle, (i + 1) * angle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "hsl(0, 0%, 10%)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(i * angle + angle / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px monospace";
      ctx.fillText(seg.label, r * 0.65, 5);
      ctx.restore();
    });

    ctx.restore();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx + r + 5, cy);
    ctx.lineTo(cx + r - 15, cy - 10);
    ctx.lineTo(cx + r - 15, cy + 10);
    ctx.closePath();
    ctx.fillStyle = "hsl(51, 100%, 50%)";
    ctx.fill();
  }, [risk]);

  const spin = useCallback(async () => {
    if (!user || processing) return;
    if (goldCoins < betAmount) { setShowTopUp(true); return; }
    setProcessing(true);
    setLastWin(0);
    setResultSegment(null);

    try {
      const { sessionId, expectedOutcome } = await placeBet(betAmount, "gc", "wheel");
      setGameState("spinning");

      // Pick random segment based on hash float
      const idx = expectedOutcome !== undefined ? Math.floor(expectedOutcome * segments.length) : Math.floor(Math.random() * segments.length);
      const seg = segments[idx];

      // Calculate target rotation: align segment center to pointer (right side, 0°)
      const targetSegAngle = idx * segAngle + segAngle / 2;
      const totalRotation = rotation + 1800 + (360 - targetSegAngle); // 5 full spins + offset

      // Animate
      let start: number | null = null;
      const duration = 4000;
      const startRot = rotation;
      const delta = totalRotation - startRot;

      const animate = (ts: number) => {
        if (!start) start = ts;
        const elapsed = ts - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentRot = startRot + delta * eased;
        setRotation(currentRot);
        drawWheel(currentRot);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setRotation(currentRot % 360);
          setGameState("result");
          setResultSegment(seg);
          const animateResolve = async () => {
             const resData = await resolveGame(sessionId, seg.mult, true, { segments: segments.length, multipliers: segments.map(s => s.mult) });
             const won = resData.payout > 0;
             setLastWin(resData.payout);
             setHistory((p) => [{ mult: seg.mult, won }, ...p.slice(0, 19)]);
             setProcessing(false);
          };
          animateResolve();
        }
      };
      requestAnimationFrame(animate);
    } catch (e: any) {
      setProcessing(false);
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    }
  }, [user, processing, goldCoins, betAmount, segments, segAngle, rotation, placeBet, resolveGame, drawWheel]);

  const reset = () => { setGameState("idle"); setResultSegment(null); setLastWin(0); };

  // Draw on mount/risk change
  useState(() => { setTimeout(() => drawWheel(rotation), 50); });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <CircleDashed className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold gold-text">Wheel</h1>
          <span className="text-xs text-muted-foreground ml-2">House Edge: 3%</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="glass-card gold-border-glow rounded-xl p-5 space-y-4 h-fit">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bet (GC)</label>
              <input type="number" min={10} max={goldCoins} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                disabled={gameState === "spinning"}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setBetAmount(v)} disabled={gameState === "spinning"}
                    className="flex-1 text-xs py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Risk Level</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
                  <button key={r} onClick={() => { setRisk(r); setTimeout(() => drawWheel(rotation), 50); }}
                    disabled={gameState === "spinning"}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                      risk === r ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-border text-muted-foreground"
                    } disabled:opacity-50`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {gameState === "idle" && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={user ? spin : openWalletModal}
                disabled={processing}
                className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-50">
                {!user ? "Sign In to Play" : "🎡 Spin"}
              </motion.button>
            )}
            {gameState === "result" && (
              <div className="space-y-3">
                {lastWin > 0 && (
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--success) / 0.1)" }}>
                    <div className="text-xs text-muted-foreground">Won at {resultSegment?.label}</div>
                    <div className="text-xl font-bold gold-text">+{lastWin.toLocaleString()} GC</div>
                  </div>
                )}
                {lastWin === 0 && (
                  <div className="text-center p-3 rounded-lg bg-destructive/10">
                    <div className="text-sm font-medium text-destructive">Landed on 0× — No win</div>
                  </div>
                )}
                <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80">
                  <RotateCcw className="w-4 h-4" /> Spin Again
                </button>
              </div>
            )}
            {history.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">History</div>
                <div className="flex flex-wrap gap-1">
                  {history.map((h, i) => (
                    <span key={i} className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${h.won ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                      {h.mult}×
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Wheel canvas */}
          <div className="glass-card gold-border-glow rounded-xl p-5 flex items-center justify-center min-h-[400px]">
            <canvas ref={canvasRef} width={400} height={400} className="w-full max-w-[400px]" />
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};

export default WheelGame;
