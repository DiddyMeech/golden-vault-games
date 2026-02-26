import { motion } from "framer-motion";
import { Users, Copy, CheckCircle, TrendingUp, Gift, Link2, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { supabase } from "@/integrations/supabase/client";

const AffiliatePage = () => {
  const { user } = useAuthBalance();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ referrals: 0, earned: 0 });
  
  const referralCode = user ? user.id : "CONNECT";
  const referralLink = `https://vault0x.io/?ref=${referralCode}`;

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Fetch total referrals
      const { count } = await supabase
        .from("affiliates")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      // Fetch lifetime earned via transactions
      const { data: txs } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "affiliate_commission");

      const earned = txs?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

      setStats({
        referrals: count || 0,
        earned: earned
      });
    };

    fetchStats();
  }, [user]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold gold-text">Affiliate Empire</h1>
      </div>
      <p className="text-muted-foreground mb-8">Earn crypto for every player you refer to VAULT0X. Share your unique link and earn 5% of our house edge on every sweep token bet they make — forever.</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Referrals", value: stats.referrals.toString(), icon: Users },
          { label: "Lifetime Earned", value: `${stats.earned.toFixed(4)} ST`, icon: TrendingUp },
          { label: "Referral Rate", value: "0.15% Wager Rate", icon: Gift },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card gold-border-glow rounded-xl p-5 text-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <stat.icon className="w-6 h-6 text-primary mx-auto mb-2 relative z-10" />
            <div className="text-2xl font-bold gold-text relative z-10">{stat.value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1 relative z-10">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Referral link */}
      <div className="glass-card gold-border-glow rounded-xl p-6 mb-8 relative overflow-hidden">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 relative z-10">
          <Link2 className="w-5 h-5 text-primary" /> Your Referral Link
        </h2>
        <div className="flex gap-2 relative z-10">
          <div className="flex-1 bg-input border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground break-all flex items-center">
            {referralLink}
          </div>
          <button onClick={copyLink} disabled={!user} className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 flex-shrink-0 transition-colors disabled:opacity-50 text-foreground gold-shimmer-btn">
            {copied ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        {!user && <p className="text-xs text-muted-foreground mt-3 relative z-10">Sign in to activate your unique tracking code.</p>}
      </div>

      {/* How it works */}
      <div className="glass-card gold-border-glow rounded-xl p-6 relative overflow-hidden">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Active Commission System
        </h2>
        <div className="space-y-6">
          {[
            { step: "1", title: "Automated Tracking", desc: "When someone visits your link, their session is permanently bound to your ID upon signing up." },
            { step: "2", title: "Smart-Contract Escrow", desc: "All bets processed on VAULT0X distribute the house edge instantaneously. Our RPC ensures precision payouts." },
            { step: "3", title: "Permanent Rakeback", desc: "You receive 5% of the total house edge (0.15% flat on all wagers) in ST credited instantly with every spin." },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start relative z-10">
              <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                {item.step}
              </div>
              <div className="pt-1">
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AffiliatePage;
