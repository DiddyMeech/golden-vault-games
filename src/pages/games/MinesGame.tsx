import { useState, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Bomb, Gem, RotateCcw, TrendingUp } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import { calcPayout } from "@/lib/math";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

type TileState = "hidden" | "safe" | "bomb";
interface Tile { state: TileState; isMine: boolean; }

const HOUSE_EDGE = 0.03;
const TOTAL = 25;

function generateBoard(mineCount: number, expectedOutcome?: number): Tile[] {
  const mines = new Set<number>();
  if (expectedOutcome !== undefined) {
    let seed = Math.floor(expectedOutcome * 4294967296);
    const lcg = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    while (mines.size < mineCount) mines.add(Math.floor(lcg() * TOTAL));
  } else {
    while (mines.size < mineCount) mines.add(Math.floor(Math.random() * TOTAL));
  }
  return Array.from({ length: TOTAL }, (_, i) => ({ state: "hidden" as TileState, isMine: mines.has(i) }));
}

// Correct probability formula: Mult_new = Mult_current * ((n - k) / (n - m - k)) * (1 - H)
function calcMultiplier(revealed: number, mines: number): number {
  if (revealed === 0) return 1;
  const safe = TOTAL - mines;
  let m = 1;
  for (let i = 0; i < revealed; i++) {
    m *= (TOTAL - i) / (safe - i);
  }
  return Math.round(m * (1 - HOUSE_EDGE) * 100) / 100;
}

const TileButton = memo(({ tile, index, active, onReveal }: { tile: Tile; index: number; active: boolean; onReveal: (i: number) => void }) => (
  <motion.button
    whileHover={tile.state === "hidden" && active ? { scale: 1.08 } : {}}
    whileTap={tile.state === "hidden" && active ? { scale: 0.95 } : {}}
    onClick={() => onReveal(index)}
    disabled={!active || tile.state !== "hidden"}
    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200 ${
      tile.state === "hidden" ? "game-tile" : tile.state === "bomb" ? "game-tile-bomb" : "game-tile-safe"
    }`}
  >
    {tile.state === "bomb" && <Bomb className="w-5 h-5 text-destructive" />}
    {tile.state === "safe" && <Gem className="w-5 h-5 text-primary" />}
  </motion.button>
));
TileButton.displayName = "TileButton";

const MinesGame = () => {
  const { goldCoins, user, openWalletModal } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  const [mineCount, setMineCount] = useState(5);
  const [betAmount, setBetAmount] = useState(100);
  const [board, setBoard] = useState<Tile[]>(() => generateBoard(5));
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [moves, setMoves] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);

  const currentMultiplier = calcMultiplier(revealed, mineCount);

  const startGame = useCallback(async () => {
    if (!user) return;
    if (goldCoins < betAmount) { setShowTopUp(true); return; }
    setProcessing(true);
    try {
      const { sessionId, expectedOutcome } = await placeBet(betAmount, "gc", "mines");
      setSessionId(sessionId);
      setBoard(generateBoard(mineCount, expectedOutcome));
      setGameActive(true);
      setGameOver(false);
      setRevealed(0);
      setLastWin(0);
      setMoves([]);
    } catch (e: any) {
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    } finally { setProcessing(false); }
  }, [user, goldCoins, betAmount, mineCount, placeBet]);

  const revealTile = useCallback(async (index: number) => {
    if (!gameActive || board[index].state !== "hidden") return;
    const newBoard = [...board];
    if (newBoard[index].isMine) {
      newBoard.forEach((t, i) => { if (t.isMine) newBoard[i] = { ...t, state: "bomb" }; });
      setBoard(newBoard);
      setGameActive(false);
      setGameOver(true);
      setLastWin(0);
      if (sessionId) resolveGame(sessionId, 0, false, { mineCount, moves: [...moves, index], cashedOut: false });
    } else {
      const r = revealed + 1;
      newBoard[index] = { ...newBoard[index], state: "safe" };
      setBoard(newBoard);
      setRevealed(r);
      const newMoves = [...moves, index];
      setMoves(newMoves);
      if (r === TOTAL - mineCount) {
        const m = calcMultiplier(r, mineCount);
        setGameActive(false);
        setGameOver(true);
        if (sessionId) {
          const res = await resolveGame(sessionId, m, true, { mineCount, moves: newMoves, cashedOut: true });
          setLastWin(res.payout);
        }
      }
    }
  }, [gameActive, board, revealed, mineCount, sessionId, resolveGame, moves]);

  const cashOut = useCallback(async () => {
    if (!gameActive || revealed === 0 || !sessionId) return;
    setProcessing(true);
    const m = currentMultiplier;
    setGameActive(false);
    setGameOver(true);
    setBoard((prev) => prev.map((t) => ({ ...t, state: t.isMine ? "bomb" : t.state })));
    const res = await resolveGame(sessionId, m, true, { mineCount, moves, cashedOut: true });
    setLastWin(res.payout);
    setProcessing(false);
  }, [gameActive, revealed, sessionId, currentMultiplier, betAmount, resolveGame, mineCount, moves]);

  const reset = useCallback(() => {
    setBoard(generateBoard(mineCount));
    setGameActive(false);
    setGameOver(false);
    setRevealed(0);
    setLastWin(0);
    setSessionId(null);
  }, [mineCount]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Bomb className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold gold-text">Mines</h1>
          <span className="text-xs text-muted-foreground ml-2">House Edge: {HOUSE_EDGE * 100}%</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="glass-card gold-border-glow rounded-xl p-5 space-y-4 h-fit">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bet (GC)</label>
              <input type="number" min={10} max={goldCoins} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))} disabled={gameActive}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setBetAmount(v)} disabled={gameActive}
                    className="flex-1 text-xs py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Mines ({mineCount})</label>
              <input type="range" min={1} max={24} value={mineCount} onChange={(e) => setMineCount(parseInt(e.target.value))} disabled={gameActive} className="w-full accent-primary" />
            </div>
            <div className="glass-card p-3 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Multiplier</div>
              <div className="text-2xl font-bold gold-text">{currentMultiplier}×</div>
              {revealed > 0 && gameActive && <div className="text-xs text-muted-foreground">Win: {calcPayout(betAmount, currentMultiplier).toLocaleString()} GC</div>}
            </div>
            {!gameActive && !gameOver && (
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={user ? startGame : openWalletModal}
                  disabled={processing}
                  className="flex-1 gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-50">
                  {!user ? "Sign In to Play" : processing ? "Placing bet..." : "Start Game"}
                </motion.button>
              </div>)}
            {gameActive && revealed > 0 && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={cashOut} disabled={processing}
                className="w-full font-bold py-3 rounded-xl border-2"
                style={{ backgroundColor: "hsl(var(--success) / 0.15)", borderColor: "hsl(var(--success) / 0.5)", color: "hsl(var(--success))" }}>
                <TrendingUp className="w-4 h-4 inline mr-1" /> Cash Out {calcPayout(betAmount, currentMultiplier).toLocaleString()} GC
              </motion.button>
            )}
            {gameOver && (
              <div className="space-y-3">
                {lastWin > 0 && <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--success) / 0.1)" }}><div className="text-xs text-muted-foreground">Won</div><div className="text-xl font-bold gold-text">+{lastWin.toLocaleString()} GC</div></div>}
                {lastWin === 0 && <div className="text-center p-3 rounded-lg bg-destructive/10"><div className="text-sm font-medium text-destructive">💥 Boom!</div></div>}
                <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80">
                  <RotateCcw className="w-4 h-4" /> New Game
                </button>
              </div>
            )}
          </div>
          <div className="glass-card gold-border-glow rounded-xl p-5">
            <div className="grid grid-cols-5 gap-2 max-w-[400px] mx-auto">
              {board.map((tile, i) => <TileButton key={i} tile={tile} index={i} active={gameActive} onReveal={revealTile} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};

export default MinesGame;
