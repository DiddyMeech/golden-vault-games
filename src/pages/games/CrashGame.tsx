import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Rocket, RotateCcw, TrendingUp } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import { calcPayout } from "@/lib/math";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

const HOUSE_EDGE = 0.03;

const CrashGame = () => {
  const { goldCoins, user, openWalletModal } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  const [betAmount, setBetAmount] = useState(100);
  const [showTopUp, setShowTopUp] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "running" | "crashed" | "cashed_out">("idle");
  const [currentMult, setCurrentMult] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<{ mult: number; color: string }[]>([]);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const multRef = useRef(1.0);

  const drawGraph = useCallback((mult: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "hsl(216, 18%, 14%)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = h - (h / 5) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const maxT = Math.max(3, (mult - 1) * 2 + 1);
    ctx.beginPath();
    ctx.strokeStyle = crashed ? "hsl(0, 84%, 60%)" : "hsl(51, 100%, 50%)";
    ctx.lineWidth = 3;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;

    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxT;
      const m = 1 + t * 0.5 + t * t * 0.02;
      if (m > mult) break;
      const x = (i / steps) * w;
      const y = h - ((m - 1) / (Math.max(mult, 3) - 1)) * (h * 0.8) - h * 0.1;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const startGame = useCallback(async () => {
    if (!user || processing) return;
    if (goldCoins < betAmount) { setShowTopUp(true); return; }
    setProcessing(true);
    setLastWin(0);

    try {
      const { sessionId: sid, expectedOutcome } = await placeBet(betAmount, "gc", "crash");
      const cp = expectedOutcome || 1.0;
      setSessionId(sid);
      setCrashPoint(cp);
      setGameState("running");
      setCurrentMult(1.0);
      multRef.current = 1.0;
      startTimeRef.current = Date.now();
      setProcessing(false);

      intervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const m = Math.round((1 + elapsed * 0.5 + elapsed * elapsed * 0.02) * 100) / 100;
        multRef.current = m;
        setCurrentMult(m);
        drawGraph(m, false);

        if (m >= cp) {
          clearInterval(intervalRef.current!);
          setGameState("crashed");
          setCurrentMult(cp);
          drawGraph(cp, true);
          setHistory((p) => [{ mult: cp, color: "hsl(0, 84%, 60%)" }, ...p.slice(0, 19)]);
          resolveGame(sid, cp, false);
        }
      }, 50);
    } catch (e: any) {
      setProcessing(false);
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    }
  }, [user, processing, goldCoins, betAmount, placeBet, resolveGame, drawGraph]);

  const cashOut = useCallback(async () => {
    if (gameState !== "running" || !sessionId) return;
    clearInterval(intervalRef.current!);
    const m = multRef.current;
    setGameState("cashed_out");
    const win = calcPayout(betAmount, m);
    setLastWin(win);
    setHistory((p) => [{ mult: m, color: "hsl(142, 71%, 45%)" }, ...p.slice(0, 19)]);
    drawGraph(m, false);
    await resolveGame(sessionId, m, true);
  }, [gameState, sessionId, betAmount, resolveGame, drawGraph]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGameState("idle");
    setCurrentMult(1.0);
    setSessionId(null);
    setLastWin(0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold gold-text">Crash</h1>
          <span className="text-xs text-muted-foreground ml-2">House Edge: {HOUSE_EDGE * 100}%</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="glass-card gold-border-glow rounded-xl p-5 space-y-4 h-fit">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bet (GC)</label>
              <input type="number" min={10} max={goldCoins} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                disabled={gameState === "running"}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setBetAmount(v)} disabled={gameState === "running"}
                    className="flex-1 text-xs py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">{v}</button>
                ))}
              </div>
            </div>
            {gameState === "idle" && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={user ? startGame : openWalletModal}
                disabled={processing}
                className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-50">
                {!user ? "Sign In to Play" : processing ? "Starting..." : "🚀 Launch"}
              </motion.button>
            )}
            {gameState === "running" && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={cashOut}
                className="w-full font-bold py-3 rounded-xl border-2 animate-pulse"
                style={{ backgroundColor: "hsl(var(--success) / 0.15)", borderColor: "hsl(var(--success) / 0.5)", color: "hsl(var(--success))" }}>
                <TrendingUp className="w-4 h-4 inline mr-1" /> Cash Out @ {currentMult}×
              </motion.button>
            )}
            {(gameState === "crashed" || gameState === "cashed_out") && (
              <div className="space-y-3">
                {lastWin > 0 && (
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--success) / 0.1)" }}>
                    <div className="text-xs text-muted-foreground">Cashed out</div>
                    <div className="text-xl font-bold gold-text">+{lastWin.toLocaleString()} GC</div>
                  </div>
                )}
                {gameState === "crashed" && (
                  <div className="text-center p-3 rounded-lg bg-destructive/10">
                    <div className="text-sm font-medium text-destructive">Crashed @ {crashPoint}×</div>
                  </div>
                )}
                <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80">
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
              </div>
            )}
            {history.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Recent Rounds</div>
                <div className="flex flex-wrap gap-1">
                  {history.map((h, i) => (
                    <span key={i} className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ color: h.color, backgroundColor: `${h.color}20` }}>
                      {h.mult}×
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="glass-card gold-border-glow rounded-xl p-5 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center mb-4">
              <div className={`text-6xl font-extrabold font-mono ${
                gameState === "crashed" ? "text-destructive" : gameState === "cashed_out" ? "gold-text" : gameState === "running" ? "gold-text" : "text-muted-foreground"
              }`}>
                {currentMult.toFixed(2)}×
              </div>
              {gameState === "crashed" && <div className="text-sm text-destructive mt-1">CRASHED</div>}
              {gameState === "cashed_out" && <div className="text-sm mt-1" style={{ color: "hsl(var(--success))" }}>CASHED OUT</div>}
            </div>
            <canvas ref={canvasRef} width={500} height={300} className="w-full max-w-[500px] rounded-lg" />
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};

export default CrashGame;
