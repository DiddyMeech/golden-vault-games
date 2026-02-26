import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dice1, Trophy, Key, Coins } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

// --- Game Configuration & Math ---
const SYMBOLS = {
  WILD: { char: "🪙", weight: 2, name: "Wild", isWild: true }, // Substitutes any
  SCATTER: { char: "🔑", weight: 3, name: "Scatter", isScatter: true }, // 3+ triggers 10 Free Spins
  DIAMOND: { char: "💎", weight: 5, pays: [0, 0, 5, 20, 100] }, // Payouts for 1,2,3,4,5 matches
  BAG: { char: "💰", weight: 10, pays: [0, 0, 3, 10, 50] },
  CASH: { char: "💵", weight: 15, pays: [0, 0, 2, 5, 25] },
  BELL: { char: "🔔", weight: 25, pays: [0, 0, 1, 3, 15] },
  CHERRY: { char: "🍒", weight: 40, pays: [0, 0, 0.5, 2, 10] },
};

const SYMBOL_LIST = Object.values(SYMBOLS);
const TOTAL_WEIGHT = SYMBOL_LIST.reduce((sum, s) => sum + s.weight, 0);

// Generate 20 standard paylines (0=top, 1=middle, 2=bottom)
const PAYLINES = [
  [1, 1, 1, 1, 1], // 1
  [0, 0, 0, 0, 0], // 2
  [2, 2, 2, 2, 2], // 3
  [0, 1, 2, 1, 0], // 4
  [2, 1, 0, 1, 2], // 5
  [1, 0, 0, 0, 1], // 6
  [1, 2, 2, 2, 1], // 7
  [0, 0, 1, 2, 2], // 8
  [2, 2, 1, 0, 0], // 9
  [1, 2, 1, 0, 1], // 10
  [1, 0, 1, 2, 1], // 11
  [0, 1, 1, 1, 0], // 12
  [2, 1, 1, 1, 2], // 13
  [0, 1, 0, 1, 0], // 14
  [2, 1, 2, 1, 2], // 15
  [1, 1, 0, 1, 1], // 16
  [1, 1, 2, 1, 1], // 17
  [0, 0, 2, 0, 0], // 18
  [2, 2, 0, 2, 2], // 19
  [0, 2, 2, 2, 0], // 20
];

const getRandomSymbol = (rngOverride?: number) => {
  let roll = rngOverride !== undefined ? rngOverride * TOTAL_WEIGHT : Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOL_LIST) {
    roll -= s.weight;
    if (roll < 0) return s;
  }
  return SYMBOL_LIST[SYMBOL_LIST.length - 1];
};

interface EvaluatedLine {
  lineIndex: number;
  symbol: any;
  count: number;
  payoutMult: number;
  positions: { col: number; row: number }[];
}


const SlotsGame = () => {
  const { goldCoins, user } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  
  const [betAmount, setBetAmount] = useState(100);
  // Grid is 5 cols x 3 rows. Array of columns (each column array has 3 symbols)
  const [grid, setGrid] = useState<any[][]>([
    [SYMBOLS.CHERRY, SYMBOLS.BELL, SYMBOLS.CASH],
    [SYMBOLS.BELL, SYMBOLS.CHERRY, SYMBOLS.BAG],
    [SYMBOLS.CASH, SYMBOLS.BELL, SYMBOLS.CHERRY],
    [SYMBOLS.BAG, SYMBOLS.CASH, SYMBOLS.BELL],
    [SYMBOLS.DIAMOND, SYMBOLS.BAG, SYMBOLS.CASH],
  ]);
  
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [showTopUp, setShowTopUp] = useState(false);
  
  const [freeSpins, setFreeSpins] = useState(0);
  const [freeSpinsTotalWin, setFreeSpinsTotalWin] = useState(0);
  const [winningLines, setWinningLines] = useState<EvaluatedLine[]>([]);
  
  const intervalRefs = useRef<number[]>([]);

  // Function to spin a specific column visually
  const spinColumnVisually = (colIndex: number) => {
    return window.setInterval(() => {
      setGrid((prev) => {
        const newGrid = [...prev];
        newGrid[colIndex] = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
        return newGrid;
      });
    }, 80); // Speed of blur
  };

  const evaluateGrid = (finalGrid: any[][]) => {
    let totalMult = 0;
    const lines: EvaluatedLine[] = [];
    
    // Evaluate 20 Lines
    for (let i = 0; i < PAYLINES.length; i++) {
        const line = PAYLINES[i];
        let matchSymbol = null;
        let count = 0;
        let positions = [];
        let hasWild = false;

        for (let col = 0; col < 5; col++) {
            const row = line[col];
            const sym = finalGrid[col][row];
            positions.push({col, row});

            if (col === 0) {
               matchSymbol = sym;
               count = 1;
               if (sym.isWild) hasWild = true;
               continue;
            }

            if (sym === matchSymbol || sym.isWild || (matchSymbol?.isWild && !sym.isScatter)) {
                count++;
                if (sym.isWild) hasWild = true;
                if (matchSymbol?.isWild && !sym.isScatter && !sym.isWild) {
                    matchSymbol = sym; // wild converts to first real symbol
                }
            } else {
                break; // line broken
            }
        }

        if (count >= 3 && matchSymbol && matchSymbol.pays) {
           const mult = matchSymbol.pays[count - 1]; // pays array is 0-indexed [1,2,3,4,5]
           if (mult > 0) {
              totalMult += mult;
              lines.push({ lineIndex: i, symbol: matchSymbol, count, payoutMult: mult, positions: positions.slice(0, count) });
           }
        }
    }

    // Evaluate Scatters
    let scatters = 0;
    const scatterPositions = [];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 3; row++) {
         if (finalGrid[col][row].isScatter) {
            scatters++;
            scatterPositions.push({col, row});
         }
      }
    }
    
    let newFreeSpins = 0;
    if (scatters >= 3) {
       newFreeSpins = 10;
       lines.push({ lineIndex: -1, symbol: SYMBOLS.SCATTER, count: scatters, payoutMult: 0, positions: scatterPositions });
    }

    return { totalMult, lines, newFreeSpins };
  };

  const spin = useCallback(async () => {
    if (spinning || !user) return;
    
    const isFreeSpin = freeSpins > 0;
    if (!isFreeSpin && goldCoins < betAmount) { setShowTopUp(true); return; }
    
    setSpinning(true);
    if (!isFreeSpin) setLastWin(0);
    setWinningLines([]);
    
    try {
      let sessionId = null;
      let randSequence = [];
      
      // If it's a real spin (not free), register hit with DB
      if (!isFreeSpin) {
          const res = await placeBet(betAmount, "gc", "slots_vault");
          sessionId = res.sessionId;
          // Use expectedOutcome to seed 15 rng calls
          let seed = res.expectedOutcome !== undefined ? res.expectedOutcome : Math.random();
          for(let i=0; i<15; i++) {
              seed = (seed * 1664525 + 1013904223) % 4294967296;
              randSequence.push(seed / 4294967296);
          }
      } else {
          // Free spins use local random bridging for now
          for(let i=0; i<15; i++) randSequence.push(Math.random());
      }

      // Pre-calculate final grid
      const finalGrid = [
        [getRandomSymbol(randSequence[0]), getRandomSymbol(randSequence[1]), getRandomSymbol(randSequence[2])],
        [getRandomSymbol(randSequence[3]), getRandomSymbol(randSequence[4]), getRandomSymbol(randSequence[5])],
        [getRandomSymbol(randSequence[6]), getRandomSymbol(randSequence[7]), getRandomSymbol(randSequence[8])],
        [getRandomSymbol(randSequence[9]), getRandomSymbol(randSequence[10]), getRandomSymbol(randSequence[11])],
        [getRandomSymbol(randSequence[12]), getRandomSymbol(randSequence[13]), getRandomSymbol(randSequence[14])],
      ];

      // Visual Animation
      for (let col = 0; col < 5; col++) {
         intervalRefs.current[col] = spinColumnVisually(col);
      }

      // Stop reels sequentially
      for (let col = 0; col < 5; col++) {
         setTimeout(() => {
            clearInterval(intervalRefs.current[col]);
            setGrid(prev => { const n = [...prev]; n[col] = finalGrid[col]; return n; });
            
            // Last reel stopped
            if (col === 4) {
               setTimeout(async () => {
                  const { totalMult, lines, newFreeSpins } = evaluateGrid(finalGrid);
                  const payoutAmount = Math.floor(betAmount * totalMult);
                  
                  if (!isFreeSpin && sessionId) {
                     await resolveGame(sessionId, totalMult, payoutAmount > 0, { grid: finalGrid });
                  }
                  
                  setWinningLines(lines);
                  
                  if (payoutAmount > 0) {
                     if (isFreeSpin) {
                        setFreeSpinsTotalWin(prev => prev + payoutAmount);
                     } else {
                        setLastWin(payoutAmount);
                     }
                  }

                  if (newFreeSpins > 0) {
                     if (!isFreeSpin) setFreeSpinsTotalWin(payoutAmount); // init
                     setFreeSpins(prev => prev + newFreeSpins);
                  } else if (isFreeSpin) {
                     setFreeSpins(prev => prev - 1);
                     if (freeSpins === 1) {
                         // End of free spins
                         setLastWin(freeSpinsTotalWin + payoutAmount);
                     }
                  }

                  setSpinning(false);
               }, 300);
            }
         }, 800 + (col * 300));
      }

    } catch (e: any) { 
        setSpinning(false); 
        if (e.message?.includes("Insufficient")) setShowTopUp(true);
    }
  }, [spinning, user, goldCoins, betAmount, freeSpins, freeSpinsTotalWin, placeBet, resolveGame]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-6">
           <Dice1 className="w-6 h-6 text-primary" />
           <h1 className="text-2xl font-bold gold-text">The Vault Heist Video Slots</h1>
           <span className="text-xs text-muted-foreground ml-2">20 Lines • 96.5% RTP</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          
          {/* Controls Panel */}
          <div className="glass-card gold-border-glow rounded-xl p-5 space-y-4 h-fit bg-[#0d0d0d]">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Bet per Line</label>
              <input type="number" min={1} value={betAmount/20} onChange={e => setBetAmount(Math.max(20, (parseInt(e.target.value) || 1) * 20))} disabled={spinning || freeSpins > 0}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">Total Bet: <span className="text-white font-bold">{betAmount} GC</span></div>
            </div>
            
            <motion.button 
               whileHover={spinning ? {} : { scale: 1.02 }} 
               onClick={spin} 
               disabled={spinning || !user}
               className={`w-full font-bold py-4 rounded-xl shadow-lg border-2 flex items-center justify-center gap-2 ${freeSpins > 0 ? 'bg-purple-600 border-purple-400 text-white animate-pulse' : 'gold-gradient gold-glow text-black border-yellow-300'}`}
            >
              {!user ? "Sign In" : spinning ? "Spinning..." : freeSpins > 0 ? `Free Spin (${freeSpins})` : "🎰 SPIN"}
            </motion.button>
            
            {/* Free Spins Alert */}
            <AnimatePresence>
               {freeSpins > 0 && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 rounded-xl bg-purple-900/30 border border-purple-500/50 text-center">
                    <div className="text-xs text-purple-300 uppercase tracking-widest font-bold mb-1"><Key className="w-3 h-3 inline mr-1"/> Free Spins</div>
                    <div className="text-lg font-bold text-white">{freeSpins} Remaining</div>
                    <div className="text-xs text-muted-foreground mt-2">Total Win: <span className="text-yellow-400 font-bold">{freeSpinsTotalWin.toLocaleString()} GC</span></div>
                 </motion.div>
               )}
            </AnimatePresence>

            {/* Standard Win Alert */}
            <AnimatePresence>
              {lastWin > 0 && freeSpins === 0 && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center p-4 rounded-xl bg-green-900/20 border border-green-500/30">
                  <div className="text-xs text-green-400 font-bold uppercase tracking-wider"><Trophy className="w-3 h-3 inline mr-1"/> Big Win!</div>
                  <div className="text-2xl font-black gold-text mt-1">+{lastWin.toLocaleString()} GC</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-bold">Max Payouts</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                 <div className="flex items-center gap-1"><span className="text-sm">💎</span> 100x</div>
                 <div className="flex items-center gap-1"><span className="text-sm">💰</span> 50x</div>
                 <div className="flex items-center gap-1"><span className="text-sm">💵</span> 25x</div>
                 <div className="flex items-center gap-1"><span className="text-sm">🔑</span> Free Spins</div>
              </div>
            </div>
          </div>

          {/* Reel Matrix */}
          <div className="glass-card gold-border-glow rounded-3xl p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#151515]">
             {/* Slot Machine Frame Background */}
             <div className="absolute inset-0 border-[15px] md:border-[20px] border-[#1f1f1f] rounded-3xl pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,1)] z-0"></div>
             
             {/* 5x3 Grid */}
             <div className="flex gap-1 md:gap-3 bg-black/80 p-2 md:p-4 rounded-xl border-4 border-[#2a2a2a] relative z-10 shadow-2xl">
                {/* 5 Columns */}
                {grid.map((columnData, colIndex) => (
                   <div key={colIndex} className="flex flex-col gap-1 md:gap-3">
                      {/* 3 Rows per column */}
                      {columnData.map((symbolObj, rowIndex) => {
                         // Check if this cell is part of a winning line
                         const isWinning = winningLines.some(line => line.positions.some(p => p.col === colIndex && p.row === rowIndex));
                         
                         return (
                           <div key={`${colIndex}-${rowIndex}`} className={`w-14 h-16 md:w-24 md:h-28 rounded-lg bg-gradient-to-b from-white/10 to-transparent border border-white/5 flex items-center justify-center relative shadow-inner overflow-hidden transition-all duration-300 ${isWinning ? 'ring-2 ring-yellow-400 bg-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.5)] z-20 scale-105' : ''}`}>
                              {/* Reel lighting effect */}
                              <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                              <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                              
                              <motion.span 
                                 key={`${symbolObj.char}-${colIndex}-${rowIndex}-${spinning}`}
                                 initial={spinning ? { y: -50, opacity: 0, filter: "blur(4px)" } : {}}
                                 animate={spinning ? { y: 0, opacity: 1, filter: "blur(0px)" } : {}}
                                 className={`text-3xl md:text-5xl select-none drop-shadow-2xl ${isWinning ? 'animate-bounce' : ''}`}
                              >
                                 {symbolObj.char}
                              </motion.span>
                              
                              {/* Specific Wild/Scatter overlays */}
                              {symbolObj.isWild && !spinning && <div className="absolute bottom-1 right-1 text-[8px] md:text-[10px] font-black text-yellow-500 uppercase">WILD</div>}
                              {symbolObj.isScatter && !spinning && <div className="absolute bottom-1 right-1 text-[8px] md:text-[10px] font-black text-purple-400 uppercase">SCATTER</div>}
                           </div>
                         );
                      })}
                   </div>
                ))}
             </div>

             {/* Winning Lines Indicator Overlay */}
             <div className="absolute bottom-4 z-20 text-center w-full">
               <AnimatePresence>
                 {winningLines.length > 0 && !spinning && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-block px-6 py-2 bg-black/80 rounded-full border border-yellow-500/50 gold-text font-bold text-sm tracking-widest shadow-xl">
                      {winningLines.length} WINNING LINES!
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};
export default SlotsGame;
