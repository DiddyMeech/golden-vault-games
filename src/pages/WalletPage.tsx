import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, History, LogOut, Clock } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import WalletLogin from "@/components/WalletLogin";
import Web3 from "web3";

const CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
  { symbol: "ETH", name: "Ethereum", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
  { symbol: "SOL", name: "Solana", address: "DRpbCBMxVnDK7maPMoGQfFiB2AQpaKNgbPYJF5gLmmao" },
  { symbol: "USDT", name: "Tether", address: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(51, 100%, 50%)",
  processing: "hsl(220, 80%, 55%)",
  confirmed: "hsl(142, 71%, 45%)",
  failed: "hsl(0, 84%, 60%)",
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  tx_hash: string | null;
}

const WalletPage = () => {
  const { goldCoins, sweepTokens, user } = useAuthBalance();
  const [tab, setTab] = useState<"deposit" | "withdraw" | "history">("deposit");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [rakebackClaimed, setRakebackClaimed] = useState(false);
  const rakebackAmount = 1250; // Mock derived from wagered amount * tier %
  const { signOut } = useAuthBalance();

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoadingTx(true);
    const { data } = await supabase
      .from("transactions")
      .select("id, type, amount, currency, status, created_at, tx_hash")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setTransactions(data as Transaction[]);
    setLoadingTx(false);
  }, [user]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleDeposit = async () => {
    if (!window.ethereum || !user || !depositAmount) return;
    try {
      setLoadingTx(true);
      const web3 = new Web3(window.ethereum as any);
      const accounts = await web3.eth.getAccounts();
      const amountWei = web3.utils.toWei(depositAmount, 'ether');
      
      // Fixed deposit address for the casino
      const casinoAddress = '0x0000000000000000000000000000000000000000'; // Replace with actual casino vault address
      
      const tx = await web3.eth.sendTransaction({
        from: accounts[0],
        to: casinoAddress,
        value: amountWei
      });

      if (tx.transactionHash) {
        // Record deposit in DB (Mocked updating balances directly for demo purposes)
        const { data: balanceData } = await supabase.from("balances").select("gold_coins").eq("user_id", user.id).single();
        if (balanceData) {
           await supabase.from("balances").update({ gold_coins: Number(balanceData.gold_coins) + (Number(depositAmount) * 1000) }).eq("user_id", user.id);
        }
        setDepositAmount("");
        fetchTransactions();
      }
    } catch (error) {
      console.error("Deposit failed:", error);
    } finally {
      setLoadingTx(false);
    }
  };

  const submitWithdraw = async () => {
    if (!withdrawAmount.trim() || !user) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > sweepTokens) return;
    
    try {
      setLoadingTx(true);
      // In a real dApp, the backend smart contract would process the payout to the user's connected wallet.
      // We simulate the transaction DB record here.
      const { error } = await (supabase.rpc as any)("request_withdrawal", {
        p_amount: amount,
        p_currency: 'eth',
        p_wallet_address: user.user_metadata?.address || '',
      });

      if (error) {
        console.error("Withdrawal error:", error);
        return;
      }
      
      setWithdrawAmount("");
      fetchTransactions();
    } catch (error) {
      console.error("Withdrawal failed:", error);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleClaimRakeback = async () => {
    if (!user || rakebackClaimed) return;
    
    // Optimistic UI update
    setRakebackClaimed(true);
    
    // Update balance
    const { data: balanceData } = await supabase.from("balances").select("gold_coins").eq("user_id", user.id).single();
    if (balanceData) {
       await supabase.from("balances").update({ gold_coins: Number(balanceData.gold_coins) + rakebackAmount }).eq("user_id", user.id);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold gold-text">Crypto Wallet</h1>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card gold-border-glow rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gold Coins</div>
          <div className="text-2xl font-bold gold-text"><AnimatedNumber value={goldCoins} /></div>
        </div>
        <div className="glass-card rounded-xl p-4 text-center border-accent/30">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sweep Tokens</div>
          <div className="text-2xl font-bold text-accent"><AnimatedNumber value={sweepTokens} format={(v) => v.toFixed(2)} /></div>
        </div>
        <div className="glass-card rounded-xl p-4 text-center border-purple-500/30 bg-purple-500/5 relative overflow-hidden group flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="text-xs text-purple-400 uppercase tracking-wider mb-1 relative z-10">Available Rakeback</div>
          <div className="text-2xl font-bold text-purple-300 mb-2 relative z-10">{rakebackClaimed ? "0" : rakebackAmount.toLocaleString()} GC</div>
          <button 
             onClick={handleClaimRakeback} 
             disabled={rakebackClaimed}
             className="w-full relative z-10 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-[0_0_10px_rgba(168,85,247,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
             {rakebackClaimed ? "Claimed" : "Claim Reward"}
          </button>
        </div>
      </div>

      {!user ? (
         <div className="glass-card gold-border-glow rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Connect to play</h2>
            <p className="text-muted-foreground mb-6">No signup needed. Just connect your wallet, deposit & play instantly.</p>
            <WalletLogin />
         </div>
      ) : (
      <>
      
      {/* Connected Account Quick Controls */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between mb-6 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {user.user_metadata?.username?.[0]?.toUpperCase() || 'P'}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {user.user_metadata?.username || user.user_metadata?.name || 'Player'}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {user.user_metadata?.address ? `${user.user_metadata.address.slice(0, 6)}...${user.user_metadata.address.slice(-4)}` : 'Connected'}
            </div>
          </div>
        </div>
        <button 
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" /> Disconnect
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "deposit" as const, label: "Deposit", icon: ArrowDownToLine },
          { key: "withdraw" as const, label: "Withdraw", icon: ArrowUpFromLine },
          { key: "history" as const, label: "History", icon: History },
        ]).map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              tab === t.key ? "gold-gradient text-primary-foreground gold-glow" : "glass-card text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "deposit" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="glass-card gold-border-glow rounded-xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Web3 Express Deposit</div>
            <p className="text-sm text-foreground/80 mb-6">Enter to deposit funds instantly using your connected wallet.</p>
            
            <div className="mb-4">
               <label className="text-xs text-muted-foreground mb-1 block">Deposit Amount (ETH)</label>
               <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.1" step="0.01" min="0"
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3" />
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDeposit} disabled={loadingTx || !depositAmount}
               className="w-full gold-shimmer-btn font-bold py-3.5 rounded-xl gold-glow disabled:opacity-40 flex items-center justify-center gap-2">
               <Wallet className="w-5 h-5" /> 
               {loadingTx ? "Processing Transaction..." : "Deposit via Web3"}
            </motion.button>
          </div>
        </motion.div>
      )}

      {tab === "withdraw" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card gold-border-glow rounded-xl p-5 space-y-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Withraw Web3 Sweep Tokens</div>
          <p className="text-sm text-muted-foreground">Min: 10 ST. Available: <span className="text-accent font-semibold">{sweepTokens.toFixed(2)} ST</span></p>
          <div className="p-4 bg-muted/20 border border-border rounded-lg mb-4">
             <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Sending payout directly to:</div>
             <div className="font-mono text-sm text-primary break-all">{user.user_metadata?.address || "Connected Wallet"}</div>
          </div>
          <div>
             <label className="text-xs text-muted-foreground mb-1 block">Withdraw Amount (ST)</label>
             <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="10.00" min={10} max={sweepTokens}
               className="w-full bg-input border border-border rounded-lg px-3 py-3 text-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={submitWithdraw} disabled={loadingTx || !withdrawAmount.trim()}
             className="w-full gold-shimmer-btn font-bold py-3.5 rounded-xl gold-glow disabled:opacity-40 flex justify-center items-center gap-2">
               <ArrowUpFromLine className="w-5 h-5"/>
               {loadingTx ? "Processing Payout..." : "Withdraw to Connected Wallet"}
          </motion.button>
        </motion.div>
      )}

      {tab === "history" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card gold-border-glow rounded-xl overflow-hidden">
            {/* Desktop table header */}
            <div className="hidden sm:grid grid-cols-5 gap-2 p-4 border-b border-border/50 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <div>Type</div><div>Amount</div><div>Currency</div><div>Status</div><div className="text-right">Date</div>
            </div>
            {loadingTx ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id}>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-5 gap-2 p-4 border-b border-border/20 last:border-0 text-sm hover:bg-muted/10 transition-colors">
                    <div className="capitalize text-foreground font-medium">{tx.type}</div>
                    <div className={`font-mono ${tx.amount >= 0 ? "gold-text" : "text-destructive"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground uppercase">{tx.currency}</div>
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ color: STATUS_COLORS[tx.status] || STATUS_COLORS.pending, backgroundColor: `${STATUS_COLORS[tx.status] || STATUS_COLORS.pending}20` }}>
                        <Clock className="w-3 h-3" />
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-right text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString()}</div>
                  </div>
                  {/* Mobile card */}
                  <div className="sm:hidden flex items-center justify-between p-4 border-b border-border/20 last:border-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-foreground font-medium text-sm">{tx.type}</span>
                        <span className="text-muted-foreground uppercase text-xs">{tx.currency}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ color: STATUS_COLORS[tx.status] || STATUS_COLORS.pending, backgroundColor: `${STATUS_COLORS[tx.status] || STATUS_COLORS.pending}20` }}>
                          <Clock className="w-3 h-3" />
                          {tx.status}
                        </span>
                        <span className="text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`font-mono text-sm font-bold ${tx.amount >= 0 ? "gold-text" : "text-destructive"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
      </>
      )}
    </div>
  );
};

export default WalletPage;
