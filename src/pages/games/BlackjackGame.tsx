import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Play, RotateCcw, AlertTriangle } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { useBettingEngine } from "@/hooks/useBettingEngine";
import TopUpModal from "@/components/TopUpModal";
import LiveWinsFeed from "@/components/LiveWinsFeed";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// --- Game Logic Constants & Types ---
const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

interface Card {
  suit: string;
  rank: string;
  value: number; // 11 for Ace initially
}

type HandStatus = "betting" | "playing" | "stood" | "busted" | "blackjack" | "won" | "lost" | "push";

interface Hand {
  id: string; // unique string for splits
  seatIndex: number;
  bet: number;
  cards: Card[];
  status: HandStatus;
  canHit: boolean;
  canDouble: boolean;
  canSplit: boolean;
}

const generateShoe = (deckCount: number = 6): Card[] => {
  const shoe: Card[] = [];
  for (let i = 0; i < deckCount; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        let value = parseInt(rank);
        if (isNaN(value)) value = rank === "A" ? 11 : 10;
        shoe.push({ suit, rank, value });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
};

const calculateHandValue = (cards: Card[]): number => {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    sum += c.value;
    if (c.rank === "A") aces++;
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
};

// --- Component ---
const BlackjackGame = () => {
  const { goldCoins, user, openWalletModal } = useAuthBalance();
  const { placeBet, resolveGame } = useBettingEngine();

  // State
  const [shoe, setShoe] = useState<Card[]>([]);
  const [roundsSinceShuffle, setRoundsSinceShuffle] = useState(0);
  
  const [gameState, setGameState] = useState<"betting" | "dealing" | "playing" | "dealerTurn" | "resolving">("betting");
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [hands, setHands] = useState<Hand[]>([
    { id: "s0", seatIndex: 0, bet: 0, cards: [], status: "betting", canHit: false, canDouble: false, canSplit: false },
    { id: "s1", seatIndex: 1, bet: 0, cards: [], status: "betting", canHit: false, canDouble: false, canSplit: false },
    { id: "s2", seatIndex: 2, bet: 0, cards: [], status: "betting", canHit: false, canDouble: false, canSplit: false },
  ]);
  const [activeHandIndex, setActiveHandIndex] = useState<number>(0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sessionIds, setSessionIds] = useState<Record<string, string>>({}); // Mapping hand ID to DB session
  
  const [betDialogOpen, setBetDialogOpen] = useState(false);
  const [betDialogSeat, setBetDialogSeat] = useState<number | null>(null);
  const [betInput, setBetInput] = useState("100");

  // Initialize Shoe
  useEffect(() => {
    setShoe(generateShoe(6));
  }, []);

  const drawCard = useCallback(() => {
    let currentShoe = [...shoe];
    if (currentShoe.length < 20) {
      currentShoe = generateShoe(6);
      setShoe(currentShoe);
      setRoundsSinceShuffle(0);
    }
    const card = currentShoe.pop()!;
    setShoe(currentShoe);
    return card;
  }, [shoe]);

  const confirmBet = () => {
    const amt = parseInt(betInput || "0");
    if (!isNaN(amt) && amt > 0 && betDialogSeat !== null) {
      const h = [...hands];
      h[betDialogSeat].bet = amt;
      setHands(h);
    }
    setBetDialogOpen(false);
  };

  // Place Bets & Deal Initial Cards
  const deal = async () => {
    if (!user) return;
    const activeSeats = hands.filter((h) => h.bet > 0);
    if (activeSeats.length === 0) return;
    
    const totalBet = activeSeats.reduce((acc, h) => acc + h.bet, 0);
    if (goldCoins < totalBet) {
      setShowTopUp(true);
      return;
    }

    setProcessing(true);
    try {
      // Create backend sessions for each active hand
      const newSessionIds: Record<string, string> = {};
      for (const hand of activeSeats) {
        const { sessionId } = await placeBet(hand.bet, "gc", "blackjack");
        newSessionIds[hand.id] = sessionId;
      }
      setSessionIds(newSessionIds);

      setGameState("dealing");
      
      // Dealing loop
      let h = hands.map(hand => ({ ...hand, cards: [] }));
      let dc: Card[] = [];
      
      // 1st card players
      for (let i = 0; i < h.length; i++) {
        if (h[i].bet > 0) h[i].cards.push(drawCard());
      }
      // 1st card dealer
      dc.push(drawCard());
      // 2nd card players
      for (let i = 0; i < h.length; i++) {
        if (h[i].bet > 0) h[i].cards.push(drawCard());
      }
      // 2nd card dealer (hole card)
      dc.push(drawCard());

      setDealerCards(dc);
      
      // Evaluate initial states
      const dealerUpCard = dc[0];
      const dealerBJ = calculateHandValue(dc) === 21;

      // Update hands
      let firstActiveIndex = -1;
      h = h.map((hand, idx) => {
        if (hand.bet === 0) return hand;
        const val = calculateHandValue(hand.cards);
        let status: HandStatus = "playing";
        if (val === 21) status = "blackjack";
        
        if (status === "playing" && firstActiveIndex === -1) {
          firstActiveIndex = idx;
        }

        return {
          ...hand,
          status,
          canHit: status === "playing",
          canDouble: status === "playing",
          canSplit: status === "playing" && hand.cards[0].rank === hand.cards[1].rank,
        };
      });

      setHands(h);
      
      if (dealerBJ) {
        // Dealer has blackjack, instantly jump to resolve
        setGameState("resolving");
        resolveAllHands(h, dc);
      } else {
        if (firstActiveIndex !== -1) {
          setActiveHandIndex(firstActiveIndex);
          setGameState("playing");
        } else {
          // All active hands got blackjack
          setGameState("dealerTurn");
          playDealerHand(dc, h);
        }
      }
      
      setRoundsSinceShuffle(prev => prev + 1);
    } catch (e: any) {
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    } finally {
      setProcessing(false);
    }
  };

  const advanceHand = (currentHands: Hand[], currentDealerCards: Card[]) => {
    let nextIdx = activeHandIndex + 1;
    while (nextIdx < currentHands.length && currentHands[nextIdx].status !== "playing") {
      nextIdx++;
    }
    
    if (nextIdx < currentHands.length) {
      setActiveHandIndex(nextIdx);
      setHands(currentHands);
    } else {
      // All player hands done, dealer's turn
      setHands(currentHands);
      setGameState("dealerTurn");
      playDealerHand(currentDealerCards, currentHands);
    }
  };

  const onHit = () => {
    if (gameState !== "playing" || processing) return;
    const newHands = [...hands];
    const hand = newHands[activeHandIndex];
    
    hand.cards.push(drawCard());
    hand.canDouble = false;
    hand.canSplit = false;
    
    const val = calculateHandValue(hand.cards);
    if (val > 21) {
      hand.status = "busted";
      hand.canHit = false;
      advanceHand(newHands, dealerCards);
    } else if (val === 21) {
      hand.status = "stood";
      hand.canHit = false;
      advanceHand(newHands, dealerCards);
    } else {
      setHands(newHands);
    }
  };

  const onStand = () => {
    if (gameState !== "playing" || processing) return;
    const newHands = [...hands];
    newHands[activeHandIndex].status = "stood";
    newHands[activeHandIndex].canHit = false;
    newHands[activeHandIndex].canDouble = false;
    advanceHand(newHands, dealerCards);
  };

  const onDouble = async () => {
    if (gameState !== "playing" || processing) return;
    const hand = hands[activeHandIndex];
    if (goldCoins < hand.bet) { setShowTopUp(true); return; }
    
    setProcessing(true);
    try {
      // Need to place an additional bet
      await placeBet(hand.bet, "gc", "blackjack_double"); // Just deducting balance for now
      
      const newHands = [...hands];
      newHands[activeHandIndex].bet *= 2;
      newHands[activeHandIndex].cards.push(drawCard());
      
      const val = calculateHandValue(newHands[activeHandIndex].cards);
      newHands[activeHandIndex].status = val > 21 ? "busted" : "stood";
      newHands[activeHandIndex].canHit = false;
      newHands[activeHandIndex].canDouble = false;
      
      advanceHand(newHands, dealerCards);
    } catch (e: any) {
      if (e.message?.includes("Insufficient")) setShowTopUp(true);
    } finally {
      setProcessing(false);
    }
  };

  const playDealerHand = (dc: Card[], h: Hand[]) => {
    // Only play if at least one hand didn't bust and isn't a natural BJ
    const needsDealing = h.some(hand => hand.bet > 0 && hand.status === "stood");
    
    let currentDC = [...dc];
    if (needsDealing) {
      let dVal = calculateHandValue(currentDC);
      let isSoft17 = dVal === 17 && currentDC.some(c => c.rank === "A");
      
      // Dealer hits on soft 17 is standard in many casinos, but prompt asks for "stands on soft 17"
      // Wait, "Dealer stands on soft 17" -> So if dVal == 17, and it's soft, dealer DOES NOT hit.
      // Standard is: Hit while < 17.
      while (dVal < 17) {
        currentDC.push(drawCard());
        dVal = calculateHandValue(currentDC);
      }
    }
    
    setDealerCards(currentDC);
    setGameState("resolving");
    resolveAllHands(h, currentDC);
  };

  const resolveAllHands = async (finalHands: Hand[], finalDealerCards: Card[]) => {
    const dVal = calculateHandValue(finalDealerCards);
    const dBlackjack = dVal === 21 && finalDealerCards.length === 2;
    
    const resolvedHands = finalHands.map(hand => {
      if (hand.bet === 0) return hand;
      let newStat = hand.status;
      
      if (hand.status === "busted") {
        newStat = "lost";
      } else if (dBlackjack) {
        if (hand.status === "blackjack") newStat = "push";
        else newStat = "lost";
      } else if (hand.status === "blackjack") {
        newStat = "won"; // 3:2 payout handled below
      } else if (dVal > 21) {
        newStat = "won";
      } else {
        const pVal = calculateHandValue(hand.cards);
        if (pVal > dVal) newStat = "won";
        else if (pVal < dVal) newStat = "lost";
        else newStat = "push";
      }
      return { ...hand, status: newStat };
    });

    setHands(resolvedHands);

    // Call backend to resolve each session
    for (const hand of resolvedHands) {
      if (hand.bet > 0 && sessionIds[hand.id]) {
        let multiplier = 0;
        if (hand.status === "won") {
          multiplier = hand.cards.length === 2 && calculateHandValue(hand.cards) === 21 ? 2.5 : 2; // BJ = 1.5x profit (2.5x total payout)
        } else if (hand.status === "push") {
          multiplier = 1;
        }
        await resolveGame(sessionIds[hand.id], multiplier, hand.status !== "lost", { hand: hand.cards, dealer: finalDealerCards });
      }
    }

    if (roundsSinceShuffle >= 5) {
      setShoe(generateShoe(6));
      setRoundsSinceShuffle(0);
    }
  };

  const resetGame = () => {
    setHands([
      { id: "s0", seatIndex: 0, bet: 0, cards: [], status: "betting", canHit: false, canDouble: false, canSplit: false },
      { id: "s1", seatIndex: 1, bet: 0, cards: [], status: "betting", canHit: false, canDouble: false, canSplit: false },
      { id: "s2", seatIndex: 2, bet: 0, cards: [], status: "betting", canHit: false, canDouble: false, canSplit: false },
    ]);
    setDealerCards([]);
    setSessionIds({});
    setGameState("betting");
  };

  // UI Helpers
  const renderCard = (card: Card, index: number, hidden: boolean = false) => {
    const isRed = card.suit === "hearts" || card.suit === "diamonds";
    if (hidden) {
      return (
        <div key={index} className="w-16 h-24 md:w-20 md:h-28 bg-primary rounded-lg border-2 border-border shadow-lg flex items-center justify-center -ml-8 first:ml-0" style={{ backgroundImage: "url('/card-back.png')", backgroundSize: 'cover' }}>
          <div className="w-full h-full opacity-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(0,0,0,0.1)_5px,rgba(0,0,0,0.1)_10px)] rounded-md"></div>
        </div>
      );
    }
    
    const suitSymbol = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" }[card.suit];
    
    return (
      <motion.div
        key={`${card.rank}-${card.suit}-${index}`}
        initial={{ opacity: 0, x: 20, y: -20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className={`w-16 h-24 md:w-20 md:h-28 bg-white rounded-lg border border-gray-200 shadow-xl flex flex-col justify-between p-2 -ml-8 first:ml-0 transform hover:-translate-y-2 transition-transform`}
        style={{ color: isRed ? "#ef4444" : "#1f2937", zIndex: index }}
      >
        <div className="text-left font-bold text-sm md:text-lg leading-none">{card.rank}</div>
        <div className="text-center text-2xl md:text-3xl">{suitSymbol}</div>
        <div className="text-right font-bold text-sm md:text-lg leading-none transform rotate-180">{card.rank}</div>
      </motion.div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div className="flex flex-col h-full bg-[#0d2112] border border-border/20 rounded-3xl overflow-hidden relative shadow-2xl">
        {/* Table Felt Background */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] border-[5px] border-white/5 rounded-[100%] pointer-events-none"></div>

        {/* Header Information */}
        <div className="p-4 flex justify-between items-center z-10 glass-card mx-4 mt-4 rounded-full border-white/5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-widest pl-4">MULTI-HAND BLACKJACK</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-white/50 pr-4">
            <span>DEALER STANDS ON SOFT 17</span>
            <span>PAYS 3:2</span>
            <span>SHUFFLE IN: {5 - roundsSinceShuffle}</span>
          </div>
        </div>

        {/* Dealer Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 min-h-[250px]">
          <div className="text-white/30 text-xs font-bold uppercase tracking-[0.3em] mb-4">Dealer</div>
          <div className="flex justify-center h-28">
            {dealerCards.length > 0 ? (
              dealerCards.map((c, i) => renderCard(c, i, gameState === "playing" && i === 1))
            ) : (
              <div className="w-20 h-28 border-2 border-white/10 border-dashed rounded-xl flex items-center justify-center text-white/10 text-xs font-medium">Dealer</div>
            )}
          </div>
          {gameState === "resolving" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-black/50 px-4 py-1.5 rounded-full border border-white/10 text-white font-mono font-bold">
              {calculateHandValue(dealerCards)}
            </motion.div>
          )}
        </div>

        {/* Player Hands & Betting Areas */}
        <div className="flex-1 flex justify-center items-end gap-2 md:gap-8 p-4 md:p-8 z-10 min-h-[300px]">
          {hands.map((hand, idx) => (
            <div key={hand.id} className="flex flex-col items-center relative transition-all w-24 md:w-32">
              
              {/* Cards or Empty Seat Placeholder */}
              <div className="h-32 flex justify-center items-end mb-4 relative z-20">
                {hand.cards.length > 0 ? (
                  <div className="flex ml-8">
                    {hand.cards.map((c, i) => renderCard(c, i))}
                  </div>
                ) : (
                  <div className={`w-16 h-24 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors ${gameState === "betting" ? "border-primary/40 bg-primary/5 hover:border-primary/80 cursor-pointer" : "border-white/5 bg-transparent"}`}
                    onClick={() => {
                      if (gameState === "betting") {
                        setBetDialogSeat(idx);
                        setBetInput("100");
                        setBetDialogOpen(true);
                      }
                    }}>
                    <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider text-center px-2">
                       {hand.bet > 0 ? "Bet Placed" : "Place Bet"}
                    </span>
                  </div>
                )}

                {/* Status Float over cards */}
                <AnimatePresence>
                  {hand.status !== "betting" && hand.status !== "playing" && hand.cards.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`absolute -top-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 rounded-lg whitespace-nowrap z-50 shadow-2xl text-xs font-bold uppercase border ${
                      hand.status === 'won' || hand.status === 'blackjack' ? 'text-green-400 border-green-500/50' :
                      hand.status === 'busted' || hand.status === 'lost' ? 'text-red-400 border-red-500/50' :
                      'text-gray-300 border-gray-500/50'
                    }`}>
                      {hand.status}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hand Value */}
              {hand.cards.length > 0 && (
                <div className={`mt-2 mb-2 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${activeHandIndex === idx && gameState === "playing" ? "bg-primary text-black border-primary" : "bg-black/50 text-white border-white/10"}`}>
                  {calculateHandValue(hand.cards)}
                </div>
              )}

              {/* Betting Circle */}
              <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-black/20 shadow-inner relative z-10 transition-colors">
                 {hand.bet > 0 ? (
                   <div className="flex flex-col items-center">
                     <Coins className="w-5 h-5 text-primary mb-1 animate-pulse" />
                     <span className="text-xs font-mono font-bold text-white">{hand.bet}</span>
                   </div>
                 ) : (
                   <span className="text-white/20 text-xs">Seat {idx + 1}</span>
                 )}
              </div>
              
              {/* Active Hand Indicator Glow */}
              {activeHandIndex === idx && gameState === "playing" && (
                <motion.div layoutId="active-seat" className="absolute -inset-4 border-2 border-primary/50 rounded-3xl pointer-events-none" />
              )}
            </div>
          ))}
        </div>

        {/* Action Controls Footer */}
        <div className="w-full bg-black/40 backdrop-blur-md border-t border-white/10 p-4 md:p-6 z-20 flex justify-center">
          {gameState === "betting" && (
            <div className="flex items-center gap-4">
               <button onClick={resetGame} className="px-6 py-3 rounded-2xl bg-white/5 text-white hover:bg-white/10 font-bold transition-colors">
                  Clear Bets
               </button>
               <button 
                  onClick={user ? deal : openWalletModal} 
                  disabled={processing || (!hands.some(h => h.bet > 0) && !!user)}
                  className="px-8 py-3 rounded-2xl gold-gradient text-black font-bold text-lg hover:brightness-110 transition flex items-center gap-2 disabled:opacity-50 disabled:grayscale">
                 <Play className="w-5 h-5" fill="currentColor" /> {!user ? "Sign In to Play" : "Deal Cards"}
               </button>
            </div>
          )}

          {gameState === "playing" && (
            <div className="flex items-center gap-4">
              <button onClick={onHit} disabled={processing || !hands[activeHandIndex].canHit} className="px-6 py-3 md:px-8 md:py-4 rounded-2xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/50 font-bold text-lg transition-colors disabled:opacity-50">
                Hit
              </button>
              <button onClick={onStand} disabled={processing} className="px-6 py-3 md:px-8 md:py-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 border border-white/20 font-bold text-lg transition-colors disabled:opacity-50">
                Stand
              </button>
              <button onClick={onDouble} disabled={processing || !hands[activeHandIndex].canDouble} className="px-6 py-3 md:px-8 md:py-4 rounded-2xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/50 font-bold text-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                Double <span className="text-xs opacity-50 font-mono">(x2)</span>
              </button>
            </div>
          )}

          {gameState === "resolving" && (
             <button onClick={resetGame} className="px-8 py-3 rounded-2xl bg-white text-black font-bold text-lg hover:bg-white/90 transition flex items-center gap-2">
               <RotateCcw className="w-5 h-5" /> New Round
             </button>
          )}
        </div>
      </div>
      
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} currency="gc" />

      <Dialog open={betDialogOpen} onOpenChange={setBetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="gold-text">Place Bet - Seat {betDialogSeat !== null ? betDialogSeat + 1 : ""}</DialogTitle>
            <DialogDescription>Enter your bet amount in Gold Coins (GC).</DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 my-4">
            <input 
              type="number" 
              value={betInput}
              onChange={(e) => setBetInput(e.target.value)}
              className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmBet();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setBetDialogOpen(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium">Cancel</button>
            <button onClick={confirmBet} className="px-4 py-2 rounded-lg gold-shimmer-btn gold-glow font-bold text-black transition-colors">Confirm Bet</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlackjackGame;
