import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Copy, CheckCircle, QrCode, Send, Clock, History } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedNumber } from "@/components/AnimatedNumber";

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
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTOS[0]);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [txSubmitted, setTxSubmitted] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawSubmitted, setWithdrawSubmitted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [rakebackClaimed, setRakebackClaimed] = useState(false);
  const rakebackAmount = 1250; // Mock derived from wagered amount * tier %

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

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedCrypto.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitTxHash = async () => {
    if (txHash.trim().length < 10 || !user) return;
    const { error } = await (supabase.rpc as any)("submit_deposit", {
      p_currency: selectedCrypto.symbol.toLowerCase(),
      p_tx_hash: txHash.trim(),
    });
    
    if (error) {
      console.error(error);
      return;
    }
    
    setTxSubmitted(true);
    setTxHash("");
    fetchTransactions();
  };

  const submitWithdraw = async () => {
    if (!withdrawAddress.trim() || !withdrawAmount.trim() || !user) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > sweepTokens) return;
    
    const { error } = await (supabase.rpc as any)("request_withdrawal", {
      p_amount: amount,
      p_currency: selectedCrypto.symbol.toLowerCase(),
      p_wallet_address: withdrawAddress.trim(),
    });

    if (error) {
      console.error(error);
      return;
    }

    setWithdrawSubmitted(true);
    setWithdrawAddress("");
    setWithdrawAmount("");
    fetchTransactions();
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "deposit" as const, label: "Deposit", icon: ArrowDownToLine },
          { key: "withdraw" as const, label: "Withdraw", icon: ArrowUpFromLine },
          { key: "history" as const, label: "History", icon: History },
        ]).map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setTxSubmitted(false); setWithdrawSubmitted(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              tab === t.key ? "gold-gradient text-primary-foreground gold-glow" : "glass-card text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "deposit" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Select Currency</label>
            <div className="grid grid-cols-4 gap-2">
              {CRYPTOS.map((c) => (
                <button key={c.symbol} onClick={() => setSelectedCrypto(c)}
                  className={`py-3 rounded-xl text-center font-semibold text-sm transition-all ${
                    selectedCrypto.symbol === c.symbol ? "gold-border-glow border-2 gold-glow" : "glass-card hover:bg-secondary/60"
                  }`}>
                  <div className="text-lg mb-0.5">{c.symbol === "BTC" ? "₿" : c.symbol === "ETH" ? "Ξ" : c.symbol === "SOL" ? "◎" : "$"}</div>
                  <div className="text-xs text-muted-foreground">{c.symbol}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card gold-border-glow rounded-xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Send {selectedCrypto.symbol} to this address</div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-input border border-border rounded-lg px-3 py-2.5 text-xs font-mono text-foreground break-all">{selectedCrypto.address}</div>
              <button onClick={copyAddress} className="p-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0">
                {copied ? <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--success))" }} /> : <Copy className="w-4 h-4 text-foreground" />}
              </button>
            </div>
            <div className="w-48 h-48 mx-auto bg-foreground/90 rounded-xl flex items-center justify-center mb-4">
              <div className="text-center"><QrCode className="w-12 h-12 text-background mx-auto mb-2" /><span className="text-xs text-background/60 font-mono">{selectedCrypto.symbol}</span></div>
            </div>
          </div>
          <div className="glass-card gold-border-glow rounded-xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Verify Your Deposit</div>
            {txSubmitted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--success))" }} />
                <p className="text-sm text-foreground font-medium">Submitted!</p>
                <p className="text-xs text-muted-foreground mt-1">We'll verify within 30 minutes.</p>
                <button onClick={() => setTxSubmitted(false)} className="mt-3 text-xs text-primary hover:underline">Submit another</button>
              </div>
            ) : (
              <>
                <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Paste TXID" maxLength={200}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3" />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={submitTxHash} disabled={txHash.trim().length < 10}
                  className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-40">
                  <Send className="w-4 h-4 inline mr-1" /> Submit
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {tab === "withdraw" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card gold-border-glow rounded-xl p-5 space-y-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Redeem Sweep Tokens</div>
          <p className="text-sm text-muted-foreground">Min: 10 ST. Available: <span className="text-accent font-semibold">{sweepTokens.toFixed(2)} ST</span></p>
          <div className="grid grid-cols-4 gap-2">
            {CRYPTOS.map((c) => (
              <button key={c.symbol} onClick={() => setSelectedCrypto(c)}
                className={`py-2 rounded-lg text-center text-xs font-medium transition-all ${selectedCrypto.symbol === c.symbol ? "gold-border-glow border gold-glow" : "glass-card"}`}>{c.symbol}</button>
            ))}
          </div>
          {withdrawSubmitted ? (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--success))" }} />
              <p className="text-sm text-foreground font-medium">Request submitted!</p>
              <button onClick={() => setWithdrawSubmitted(false)} className="mt-3 text-xs text-primary hover:underline">Submit another</button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Your {selectedCrypto.symbol} Address</label>
                <input type="text" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} placeholder={`${selectedCrypto.symbol} address`} maxLength={200}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount (ST)</label>
                <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="10.00" min={10} max={sweepTokens}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={submitWithdraw} disabled={!withdrawAddress.trim() || !withdrawAmount.trim()}
                className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow disabled:opacity-40">Request Withdrawal</motion.button>
            </>
          )}
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
    </div>
  );
};

export default WalletPage;
