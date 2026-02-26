import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { ShieldCheck, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { motion } from "framer-motion";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  wallet_address?: string;
  tx_hash?: string;
  created_at: string;
  profiles?: {
    username: string;
    email: string;
  };
}

const AdminPage = () => {
  const { user, loading } = useAuthBalance();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "processing" | "confirmed" | "failed">("pending");

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        if (!loading) navigate("/");
        return;
      }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (data?.role === "admin") {
        setIsAdmin(true);
      } else {
        navigate("/");
      }
    };
    if (!loading) checkAdminStatus();
  }, [user, loading, navigate]);

  const fetchTransactions = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    
    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .select("*, profiles(username, email)")
      .eq("status", filter)
      .in("type", ["withdrawal", "deposit"])
      .order("created_at", { ascending: false });

    if (!txError && txData) {
      setTransactions(txData as any);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTransactions();
    }
  }, [isAdmin, filter]);

  const updateStatus = async (id: string, newStatus: string, finalAmount?: number) => {
    // Determine if deposit and confirming -- ask for amount
    let p_final_amount = null;
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.type === "deposit" && newStatus === "confirmed") {
      const amountStr = prompt(`Enter final verified amount for ${tx.currency.toUpperCase()}:`);
      if (!amountStr) return; // cancelled
      p_final_amount = parseFloat(amountStr);
      if (isNaN(p_final_amount) || p_final_amount <= 0) {
        alert("Invalid amount.");
        return;
      }
    }

    const { error } = await (supabase.rpc as any)("admin_update_transaction_status", {
      p_tx_id: id,
      p_status: newStatus,
      p_final_amount: p_final_amount || null
    });

    if (error) {
      console.error(error);
      alert("Error updating status: " + error.message);
    } else {
      fetchTransactions();
    }
  };

  if (isAdmin === null) return <div className="p-8 text-center text-muted-foreground">Verifying access...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold gold-text">Compliance & Finance Engine</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {["pending", "processing", "confirmed", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
              filter === f ? "gold-gradient text-primary-foreground gold-glow" : "glass-card hover:bg-white/5"
            }`}
          >
            {f} Queue
          </button>
        ))}
      </div>

      <div className="glass-card gold-border-glow rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-secondary/30 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Currency</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading queue...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No {filter} transactions found in queue.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    key={tx.id} 
                    className="border-b border-border/20 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{tx.profiles?.username || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{tx.profiles?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize font-medium">{tx.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">{Math.abs(tx.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap uppercase">{tx.currency}</td>
                    <td className="px-6 py-4 max-w-xs truncate font-mono text-xs text-muted-foreground" title={tx.wallet_address || tx.tx_hash}>
                      {tx.wallet_address ? `Wal: ${tx.wallet_address}` : tx.tx_hash ? `TX: ${tx.tx_hash}` : 'None'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {filter === "pending" && (
                        <>
                          {tx.type === "withdrawal" && (
                            <button onClick={() => updateStatus(tx.id, "processing")} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-medium">
                              Approve
                            </button>
                          )}
                          <button onClick={() => updateStatus(tx.id, "rejected")} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium">
                            Reject
                          </button>
                        </>
                      )}
                      
                      {(filter === "pending" && tx.type === "deposit") || filter === "processing" ? (
                        <>
                          <button onClick={() => updateStatus(tx.id, "confirmed")} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 font-medium">
                            <CheckCircle className="w-3 h-3 inline mr-1" /> Confirm
                          </button>
                          <button onClick={() => updateStatus(tx.id, "failed")} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium ml-2">
                            <XCircle className="w-3 h-3 inline mr-1" /> Fail
                          </button>
                        </>
                      ) : null}

                      {(filter === "confirmed" || filter === "failed") && (
                        <span className="text-xs text-muted-foreground italic flex justify-end items-center gap-1">
                          {tx.status === "confirmed" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          Finalized
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
