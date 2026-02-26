import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TowerControl, RotateCcw, TrendingUp, Skull, CheckCircle } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import { calcPayout } from "@/lib/math";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

const FLOORS = 8;
const COLS = 3;
// We now have 1 bomb and 2 safe tiles per row
interface Floor { tiles: ("hidden" | "safe" | "trap")[]; bombIndex: number; }

function generateTower(hashNum?: number): Floor[] {
  let num = hashNum !== undefined ? hashNum : Math.floor(Math.random() * Math.pow(COLS, FLOORS));
  return Array.from({ length: FLOORS }, () => {
    const bombIndex = num % COLS;
    num = Math.floor(num / COLS);
    return { tiles: Array(COLS).fill("hidden") as Floor["tiles"], bombIndex };
  });
}

// 2 out of 3 tiles are safe. True probability of passing is 2/3.
// Pure math multiplier = 1 / (2/3) = 1.5 per floor.
// With a 3% house edge, multiplier = (1.5 ^ floor) * 0.97
function getFloorMultiplier(floor: number): number { 
    if (floor === 0) return 1;
    const rawMulti = Math.pow(1.5, floor) * 0.97;
    return Math.floor(rawMulti * 100) / 100;
}

const TowerGame = () => {
  const { goldCoins, user } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  const [betAmount, setBetAmount] = useState(100);
  const [tower, setTower] = useState<Floor[]>(() => generateTower());
  const [moves, setMoves] = useState<number[]>([]);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const currentMultiplier = getFloorMultiplier(currentFloor);

  const startGame = useCallback(async () => {
    if (!user) return;
    if (goldCoins < betAmount) { setShowTopUp(true); return; }
    setProcessing(true);
    try {
      const { sessionId, expectedOutcome } = await placeBet(betAmount, "gc", "tower");
      const hashNum = expectedOutcome !== undefined ? Math.floor(expectedOutcome * Math.pow(COLS, FLOORS)) : undefined;
      setSessionId(sessionId); setTower(generateTower(hashNum)); setCurrentFloor(0); setMoves([]);
      setGameActive(true); setGameOver(false); setWon(false); setLastWin(0);
    } catch { setShowTopUp(true); }
    setProcessing(false);
  }, [user, goldCoins, betAmount, placeBet]);

  const pickTile = useCallback(async (fi: number, ti: number) => {
    if (!gameActive || fi !== currentFloor || processing) return;
    
    const newTower = tower.map((f, i) => {
      if (i !== fi) return f;
      return { 
          ...f, 
          tiles: f.tiles.map((_, j) => (j === ti ? (ti === f.bombIndex ? "trap" : "safe") : (j === f.bombIndex && ti !== f.bombIndex ? "trap" : "hidden"))) as Floor["tiles"] 
      };
    });
    setTower(newTower);
    
    const newMoves = [...moves, ti];
    setMoves(newMoves);
    
    if (ti !== tower[fi].bombIndex) { // Safe
      const next = currentFloor + 1;
      if (next >= FLOORS) {
        setProcessing(true);
        const m = getFloorMultiplier(next); 
        setGameActive(false); setGameOver(true); setWon(true);
        if (sessionId) {
          const res = await resolveGame(sessionId, m, true, { moves: newMoves, cashedOut: true });
          setLastWin(res.payout);
        }
        setProcessing(false);
      } else { 
          setCurrentFloor(next); 
      }
    } else { // Trap
      setProcessing(true);
      setGameActive(false); setGameOver(true); setWon(false); setLastWin(0);
      if (sessionId) await resolveGame(sessionId, 0, false, { moves: newMoves, cashedOut: false });
      setProcessing(false);
    }
  }, [gameActive, tower, currentFloor, betAmount, sessionId, resolveGame, moves, processing]);

  const cashOut = useCallback(async () => {
    if (!gameActive || currentFloor === 0 || !sessionId || processing) return;
    setProcessing(true);
    const m = currentMultiplier; 
    setGameActive(false); setGameOver(true); setWon(true);
    
    // Reveal all remaining bombs
    const newTower = tower.map((f, i) => {
       if (f.tiles.includes("safe") || f.tiles.includes("trap")) return f;
       return {
           ...f,
           tiles: f.tiles.map((_, j) => (j === f.bombIndex ? "trap" : "hidden")) as Floor["tiles"]
       };
    });
    setTower(newTower);

    const res = await resolveGame(sessionId, m, true, { moves, cashedOut: true });
    setLastWin(res.payout);
    setProcessing(false);
  }, [gameActive, currentFloor, sessionId, currentMultiplier, resolveGame, moves, processing, tower]);

  const reset = useCallback(() => { 
      setTower(generateTower()); 
      setCurrentFloor(0); 
      setGameActive(false); 
      setGameOver(false); 
      setWon(false); 
      setLastWin(0); 
      setSessionId(null); 
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 max-w-7xl mx-auto p-4 absolute inset-0 pt-20 overflow-y-auto w-full pb-[120px]">
      <div>
        <div className="flex items-center gap-2 mb-6">
            <TowerControl className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold gold-text">Tower</h1>
            <span className="text-xs text-muted-foreground ml-2">2 Safe, 1 Bomb per floor • 97% RTP</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="glass-card gold-border-glow rounded-xl p-5 space-y-4 h-fit bg-[#0d0d0d]">
            <div>
              <label htmlFor="tower-bet" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bet (GC)</label>
              <input id="tower-bet" type="number" min={10} value={betAmount} onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))} disabled={gameActive}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex gap-2 mt-2">
                  {[100,500,1000,5000].map(v => (
                      <button key={v} onClick={() => setBetAmount(v)} disabled={gameActive} title={`Bet ${v} GC`} className="flex-1 text-xs py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors">
                          {v}
                      </button>
                  ))}
              </div>
            </div>
            
            <div className="glass-card p-4 rounded-lg text-center bg-black/40 border border-white/5">
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Floor {currentFloor}/{FLOORS}</div>
                <div className="text-3xl font-black gold-text">{currentMultiplier.toFixed(2)}x</div>
                {gameActive && currentFloor > 0 && <div className="text-[10px] text-green-400 mt-1">Current Win: {calcPayout(betAmount, currentMultiplier).toLocaleString()} GC</div>}
            </div>
            
            {!gameActive && !gameOver && (
                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startGame} disabled={processing||!user} title="Start Game" className="w-full gold-shimmer-btn font-bold py-4 rounded-xl gold-glow disabled:opacity-50 text-black shadow-lg">
                    {!user ? "Sign In" : "Start Climb"}
                </motion.button>
            )}
            
            {gameActive && currentFloor > 0 && (
                <motion.button whileHover={{scale:1.02}} onClick={cashOut} title="Cash Out" disabled={processing} className="w-full font-bold py-4 rounded-xl border-2 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30">
                    <TrendingUp className="w-4 h-4"/>
                    Cash Out {calcPayout(betAmount, currentMultiplier).toLocaleString()} GC
                </motion.button>
            )}
            
            {gameOver && (
                <div className="space-y-4">
                    {lastWin > 0 && (
                        <div className="text-center p-4 rounded-xl bg-green-900/20 border border-green-500/30">
                            <div className="text-xs text-green-400 font-bold uppercase tracking-wider"><CheckCircle className="w-3 h-3 inline mr-1"/> Escaped!</div>
                            <div className="text-2xl font-black gold-text mt-1">+{lastWin.toLocaleString()} GC</div>
                        </div>
                    )}
                    {!won && (
                        <div className="text-center p-4 rounded-xl bg-red-900/20 border border-red-500/30">
                            <div className="text-sm font-bold text-red-500 flex items-center justify-center gap-1"><Skull className="w-4 h-4"/> TRAP TRIGGERED</div>
                            <div className="text-xs text-red-400/70 mt-1">You lost {betAmount} GC</div>
                        </div>
                    )}
                    <button onClick={reset} title="New Game" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground font-bold hover:bg-secondary/80 transition-colors">
                        <RotateCcw className="w-4 h-4"/> New Game
                    </button>
                </div>
            )}
          </div>
          
          <div className="glass-card gold-border-glow rounded-3xl p-6 md:p-10 relative overflow-hidden bg-gradient-to-b from-[#111] to-[#050505]">
            <div className="flex flex-col-reverse gap-3 max-w-[360px] mx-auto relative z-10 w-full">
              {tower.map((floor, fi) => (
                  <div key={fi} className={`flex items-center gap-4 transition-all duration-300 ${fi === currentFloor ? 'scale-105' : 'scale-100 opacity-90'}`}>
                      <div className="w-12 text-right text-sm text-yellow-500/80 font-bold font-mono tracking-wider">
                          {getFloorMultiplier(fi+1).toFixed(2)}x
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-3">
                          {floor.tiles.map((tile, ti) => (
                              <motion.button 
                                  key={ti} 
                                  whileHover={(fi === currentFloor && gameActive && tile === "hidden" && !processing) ? {scale:1.05, y: -2} : {}} 
                                  whileTap={(fi === currentFloor && gameActive && tile === "hidden" && !processing) ? {scale:0.95} : {}}
                                  onClick={() => pickTile(fi, ti)} 
                                  disabled={!gameActive || fi !== currentFloor || tile !== "hidden" || processing} 
                                  title={`Pick tile ${ti}`}
                                  className={`
                                      h-14 md:h-16 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner overflow-hidden border-2
                                      ${tile === "hidden" 
                                          ? (fi === currentFloor && gameActive) 
                                              ? "bg-[#222] border-[#444] hover:bg-[#333] hover:border-primary shadow-[0_0_15px_rgba(255,215,0,0.1)] cursor-pointer" 
                                              : (fi < currentFloor || !gameActive)
                                                  ? "bg-black/40 border-white/5 opacity-50 cursor-not-allowed" 
                                                  : "bg-[#161616] border-[#222]" 
                                          : tile === "safe" 
                                              ? "bg-green-500/20 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" 
                                              : "bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                      }
                                  `}
                              >
                                  {tile === "safe" && <motion.div initial={{scale:0, rotate:-180}} animate={{scale:1, rotate:0}} transition={{type:"spring"}}><CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-500" /></motion.div>}
                                  {tile === "trap" && <motion.div initial={{scale:0, rotate:180}} animate={{scale:1, rotate:0}} transition={{type:"spring"}}><Skull className="w-6 h-6 md:w-8 md:h-8 text-red-500 animate-pulse" /></motion.div>}
                              </motion.button>
                          ))}
                      </div>
                  </div>
              ))}
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed/></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc"/>
    </div>
  );
};
export default TowerGame;
