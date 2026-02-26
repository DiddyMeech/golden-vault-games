import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleDashed, Play, RotateCcw, TrendingUp } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";

const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

type BetTarget = number | "red" | "black" | "even" | "odd" | "1-18" | "19-36" | "1st12" | "2nd12" | "3rd12" | "col1" | "col2" | "col3";

interface Bet {
  target: BetTarget;
  amount: number;
}

const getNumberColorClass = (n: number) => {
  if (n === 0) return "bg-green-500 border-green-600";
  if (RED_NUMBERS.has(n)) return "bg-red-600 border-red-700";
  return "bg-black border-neutral-800";
};

const EuropeanRoulette = () => {
  const { goldCoins, user } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();
  
  const [bets, setBets] = useState<Record<string, number>>({});
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number>(0);
  const [showTopUp, setShowTopUp] = useState(false);
  
  const totalBet = useMemo(() => Object.values(bets).reduce((sum, amt) => sum + amt, 0), [bets]);

  const handlePlaceBet = (target: BetTarget) => {
    if (spinning) return;
    setBets(prev => {
      const current = prev[target.toString()] || 0;
      return { ...prev, [target.toString()]: current + selectedChip };
    });
  };

  const clearBets = () => {
    if (spinning) return;
    setBets({});
  };

  const evaluateWin = (resultNum: number): number => {
    let winContent = 0;
    
    Object.entries(bets).forEach(([targetStr, amt]) => {
      // Straight Up
      const numTarget = parseInt(targetStr);
      if (!isNaN(numTarget) && numTarget === resultNum) {
        winContent += amt * 36;
      }
      // Outside Bets
      if (resultNum !== 0) {
        if (targetStr === "red" && RED_NUMBERS.has(resultNum)) winContent += amt * 2;
        if (targetStr === "black" && BLACK_NUMBERS.has(resultNum)) winContent += amt * 2;
        if (targetStr === "even" && resultNum % 2 === 0) winContent += amt * 2;
        if (targetStr === "odd" && resultNum % 2 !== 0) winContent += amt * 2;
        if (targetStr === "1-18" && resultNum >= 1 && resultNum <= 18) winContent += amt * 2;
        if (targetStr === "19-36" && resultNum >= 19 && resultNum <= 36) winContent += amt * 2;
        // Dozens
        if (targetStr === "1st12" && resultNum >= 1 && resultNum <= 12) winContent += amt * 3;
        if (targetStr === "2nd12" && resultNum >= 13 && resultNum <= 24) winContent += amt * 3;
        if (targetStr === "3rd12" && resultNum >= 25 && resultNum <= 36) winContent += amt * 3;
        // Columns (1: 1,4,7...  2: 2,5,8... 3: 3,6,9...)
        if (targetStr === "col1" && resultNum % 3 === 1) winContent += amt * 3;
        if (targetStr === "col2" && resultNum % 3 === 2) winContent += amt * 3;
        if (targetStr === "col3" && resultNum % 3 === 0) winContent += amt * 3;
      }
    });

    return winContent;
  };

  const spin = async () => {
    if (!user) return;
    if (totalBet === 0) return;
    if (goldCoins < totalBet) {
      setShowTopUp(true);
      return;
    }

    setSpinning(true);
    setLastWin(0);
    setLastResult(null);

    try {
      const { sessionId, expectedOutcome } = await placeBet(totalBet, "gc", "roulette");
      
      // Determine result using the backend seed (0-36)
      const numberIndex = Math.floor(expectedOutcome * 37);
      const resultNumber = WHEEL_NUMBERS[numberIndex];
      
      // Calculate rotation
      const segmentAngle = 360 / 37;
      // We want the resultNumber to end up at the top (0 degrees or 270 depending on drawing, let's assume top pointer)
      // If WHEEL_NUMBERS[0] is at 0 degrees, then WHEEL_NUMBERS[i] is at i * segmentAngle
      // To bring it to the top (pointer), we rotate by 360 - (i * segmentAngle) + some base rotations
      
      const extraRotations = 5 * 360; // 5 full spins
      const targetRotation = extraRotations + (360 - (numberIndex * segmentAngle));
      
      setWheelRotation(prev => prev + targetRotation + (360 - (prev % 360))); // normalize

      // Wait for animation (5 seconds)
      setTimeout(async () => {
        setLastResult(resultNumber);
        const winAmount = evaluateWin(resultNumber);
        setLastWin(winAmount);
        
        let multiplier = 0;
        if (winAmount > 0) {
           multiplier = winAmount / totalBet;
        }

        await resolveGame(sessionId, multiplier, winAmount > 0, { resultNumber, bets });
        setSpinning(false);
      }, 5000);

    } catch (e: any) {
       if (e.message?.includes("Insufficient")) setShowTopUp(true);
       setSpinning(false);
    }
  };

  // UI Grid Generation
  const col3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  const col2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
  const col1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  const renderBetBox = (target: BetTarget, label: React.ReactNode, extraClass: string = "") => {
    const betAmt = bets[target.toString()] || 0;
    return (
      <div 
        className={`relative flex items-center justify-center font-bold text-white border border-white/10 cursor-pointer select-none transition-colors hover:brightness-125 ${extraClass}`}
        onClick={() => handlePlaceBet(target)}
      >
        {label}
        {betAmt > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute z-10 w-6 h-6 rounded-full bg-blue-500 border border-white/50 shadow-lg flex items-center justify-center text-[10px] font-bold text-white top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {betAmt > 999 ? '1k+' : betAmt}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 max-w-7xl mx-auto p-4 absolute inset-0 pt-20 overflow-y-auto w-full pb-[120px]">
      <div className="flex flex-col gap-6">
        
        {/* Top Header */}
        <div className="flex items-center gap-2 mb-2">
          <CircleDashed className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold gold-text">European Roulette</h1>
          <span className="text-xs text-muted-foreground ml-2">House Edge: 2.70%</span>
        </div>

        {/* 3D Wheel Area */}
        <div className="glass-card gold-border-glow rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden h-[350px]">
          {/* Wheel Container */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full bg-neutral-900 border-8 border-neutral-800 shadow-2xl flex items-center justify-center p-2"
               style={{ boxShadow: "inset 0 0 50px rgba(0,0,0,1), 0 10px 30px rgba(0,0,0,0.5)" }}>
            
            {/* The Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 z-20">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-white drop-shadow-md"></div>
            </div>

            {/* Rotating Wheel */}
            <motion.div 
              className="w-full h-full rounded-full relative overflow-hidden"
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 5, ease: [0.15, 0.85, 0.3, 1] }}
            >
              {WHEEL_NUMBERS.map((num, i) => {
                const angle = i * (360 / 37);
                const isRed = RED_NUMBERS.has(num);
                const isGreen = num === 0;
                return (
                  <div key={num} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[8.5%] h-1/2" style={{ transformOrigin: "bottom center" }}>
                      {/* Segment Color Wedge */}
                      <div className="absolute inset-0 clip-wedge" style={{ 
                         backgroundColor: isGreen ? '#22c55e' : isRed ? '#dc2626' : '#171717',
                         clipPath: "polygon(50% 100%, 0 0, 100% 0)"
                      }}></div>
                      {/* Number Text */}
                      <div className="absolute top-2 w-full text-center text-[10px] md:text-sm font-bold text-white z-10 select-none">
                        {num}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Center Hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-neutral-800 rounded-full border-4 border-yellow-600/50 shadow-inner z-10 flex items-center justify-center">
                 <div className="w-1/2 h-1/2 rounded-full bg-neutral-900/50 gold-glow"></div>
              </div>
            </motion.div>
          </div>

          {/* Realtime Result Notification */}
          <AnimatePresence>
            {lastResult !== null && !spinning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: 50 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className={`absolute bottom-6 px-10 py-3 rounded-full border shadow-2xl z-30 font-bold text-3xl flex items-center gap-3 ${getNumberColorClass(lastResult)}`}
              >
                {lastResult}
                {lastWin > 0 && <span className="text-yellow-400 text-xl ml-2 tracking-wide font-medium">+{lastWin} GC</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3D Betting Table Matrix */}
        <div className="flex justify-center p-4 bg-[#0a5223] rounded-3xl shadow-inner border-[10px] border-neutral-900 overflow-x-auto">
          <div className="flex min-w-[800px] h-[220px]">
             {/* Zero */}
             <div className="w-16">
               {renderBetBox(0, "0", "h-full bg-green-600 border-green-700/50 rounded-l-xl")}
             </div>

             <div className="flex-1 flex flex-col">
               {/* 3 Rows of Numbers */}
               <div className="flex-1 flex pb-0">
                 {col3.map(n => renderBetBox(n, n, `flex-1 ${getNumberColorClass(n)}`))}
               </div>
               <div className="flex-1 flex">
                 {col2.map(n => renderBetBox(n, n, `flex-1 ${getNumberColorClass(n)}`))}
               </div>
               <div className="flex-1 flex">
                 {col1.map(n => renderBetBox(n, n, `flex-1 ${getNumberColorClass(n)}`))}
               </div>
               
               {/* Dozens */}
               <div className="h-10 flex border-t-2 border-white/20">
                 {renderBetBox("1st12", "1st 12", "flex-1 bg-transparent hover:bg-white/10")}
                 {renderBetBox("2nd12", "2nd 12", "flex-1 bg-transparent hover:bg-white/10 border-l border-r border-white/10")}
                 {renderBetBox("3rd12", "3rd 12", "flex-1 bg-transparent hover:bg-white/10")}
               </div>
               
               {/* Outside Bets */}
               <div className="h-12 flex border-t border-white/10 text-sm">
                 {renderBetBox("1-18", "1 TO 18", "flex-1 bg-transparent hover:bg-white/10 rounded-bl-xl")}
                 {renderBetBox("even", "EVEN", "flex-1 bg-transparent hover:bg-white/10")}
                 {renderBetBox("red", <div className="w-8 h-6 bg-red-600 rounded"></div>, "flex-1 bg-transparent hover:bg-white/10")}
                 {renderBetBox("black", <div className="w-8 h-6 bg-black rounded"></div>, "flex-1 bg-transparent hover:bg-white/10")}
                 {renderBetBox("odd", "ODD", "flex-1 bg-transparent hover:bg-white/10")}
                 {renderBetBox("19-36", "19 TO 36", "flex-1 bg-transparent hover:bg-white/10")}
               </div>
             </div>

             {/* Columns */}
             <div className="w-16 flex flex-col border-l-2 border-white/20">
                {renderBetBox("col3", "2:1", "flex-1 bg-transparent hover:bg-white/10 rounded-tr-xl")}
                {renderBetBox("col2", "2:1", "flex-1 bg-transparent hover:bg-white/10")}
                {renderBetBox("col1", "2:1", "flex-1 bg-transparent hover:bg-white/10 rounded-br-xl")}
                <div className="h-22"></div> {/* offset spacer for exactly aligning with numbers */}
             </div>
          </div>
        </div>

        {/* Betting Controls */}
        <div className="glass-card p-4 rounded-full flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-50 shadow-2xl border-white/10 bg-background/80 backdrop-blur-xl">
           <div className="flex items-center gap-2">
             {[1, 10, 50, 100, 500].map(val => (
               <button 
                 key={val} 
                 onClick={() => setSelectedChip(val)}
                 className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 font-bold flex items-center justify-center text-xs transition-transform ${selectedChip === val ? 'scale-110 borderColor-primary bg-primary/20 text-primary' : 'border-white/20 bg-black hover:bg-white/10 text-white'}`}
               >
                 {val}
               </button>
             ))}
           </div>
           
           <div className="flex gap-4 items-center">
              <div className="flex flex-col text-right pr-4 border-r border-white/10">
                <span className="text-xs text-muted-foreground">Total Bet</span>
                <span className="font-bold gold-text text-xl">{totalBet.toLocaleString()} GC</span>
              </div>
              
              <button 
                onClick={clearBets} 
                disabled={spinning || totalBet === 0}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 transition"
                title="Clear Bets"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={spinning || totalBet === 0 || !user}
                onClick={spin}
                className="px-8 py-3 rounded-xl gold-gradient text-black font-bold flex items-center gap-2 disabled:opacity-50 disabled:grayscale transition"
              >
                <Play className="w-5 h-5" fill="currentColor" /> {spinning ? "Spinning..." : "SPIN"}
              </motion.button>
           </div>
        </div>

      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />
    </div>
  );
};

export default EuropeanRoulette;
