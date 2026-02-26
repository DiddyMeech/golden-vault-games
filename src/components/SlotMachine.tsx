import React, { useState, useEffect } from 'react';
import { getUserData, storeGameResult } from '../utils/supabaseFunctions';
import { supabase } from '../utils/supabaseClient';

const userId = '1'; // Example user ID
const gameId = '1'; // Example game ID
const reelSymbols = ['cherry', 'lemon', 'orange', 'plum', 'grape', 'bar'];
const betAmount = 1; // Bet amount per spin

interface UserData {
  id?: string;
  name?: string;
  balance?: number;
}

const SlotMachine: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [balance, setBalance] = useState<number>(100);
  const [reels, setReels] = useState<string[]>(['cherry', 'lemon', 'orange']);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      const userData = await getUserData(userId);
      if (userData) {
        setUser(userData);
        setBalance(userData.balance || 100);
      }
    }
    fetchData();
  }, []);

  const getSymbolImage = (symbol: string) => {
    return `/images/${symbol}.png`;
  };

  const calculateWin = (symbols: string[]) => {
    const uniqueSymbols = new Set(symbols);
    if (uniqueSymbols.size === 1) {
      // All symbols are the same
      return betAmount * 10;
    } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
      // Two symbols are the same
      return betAmount * 3;
    }
    return 0;
  };

  const spin = async () => {
    if (isSpinning || balance <= 0) return;
    
    setIsSpinning(true);
    setResult('');

    const randomSymbols = reelSymbols.map(() => reelSymbols[Math.floor(Math.random() * reelSymbols.length)]);
    setReels(randomSymbols);

    // Simulate house edge
    const winAmount = calculateWin(randomSymbols);
    const newBalance = balance + winAmount - betAmount;
    setBalance(newBalance);

    // Update user balance in Supabase
    await supabase.from('users').update({ balance: newBalance }).eq('id', userId);

    // Store game result
    await storeGameResult(userId, gameId, winAmount > 0 ? 'win' : 'loss', betAmount, winAmount);

    if (winAmount > 0) {
      setResult(`You won $${winAmount.toFixed(2)}!`);
    } else {
      setResult('Better luck next time!');
    }

    setIsSpinning(false);
  };

  return (
    <div className="text-center pt-12 bg-[#1a1a1a] min-h-screen p-5">
      <h1 className="text-[#ffcc00] text-4xl font-bold mb-6">Welcome to the Casino!</h1>
      
      {user ? (
        <p className="text-xl text-white mb-2">User: {user.name || 'Player 1'}</p>
      ) : (
        <p className="text-xl text-white mb-2">Loading user data...</p>
      )}
      
      <p className="text-xl text-white mb-6">Balance: ${balance.toFixed(2)}</p>
      
      <button 
        onClick={spin} 
        disabled={isSpinning || balance <= 0}
        className="px-6 py-3 text-lg bg-[#ffcc00] text-black border-none rounded-lg cursor-pointer mt-5 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-yellow-400"
      >
        Spin
      </button>

      <div className="flex justify-center mt-8 gap-5">
        {reels.map((symbol, index) => (
          <div key={index}>
            {/* Fallback to text if image fails to load, matching user's request */}
            <div className="w-[100px] h-[100px] bg-[#333] flex items-center justify-center rounded-xl text-2xl text-white shadow-inner">
               <img 
                 src={getSymbolImage(symbol)} 
                 alt={symbol} 
                 className="w-[100px] h-[100px] object-contain p-2"
                 onError={(e) => {
                    // Fallback if images missing
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.append(document.createTextNode(symbol));
                 }}
               />
            </div>
          </div>
        ))}
      </div>
      
      {result && <p className="text-2xl text-white mt-8 font-bold animate-pulse">{result}</p>}
    </div>
  );
};

export default SlotMachine;
