import { useState, useEffect } from "react";
import { Crown, Shield, Star, Zap, Gem, ChevronRight, Gift } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { supabase } from "@/integrations/supabase/client";

const VIP_TIERS = [
  { name: "Bronze", target: 0, icon: Shield, color: "text-amber-700", bg: "bg-amber-700/20", border: "border-amber-700/50", perk: "5% Rakeback" },
  { name: "Silver", target: 10000, icon: Star, color: "text-slate-400", bg: "bg-slate-400/20", border: "border-slate-400/50", perk: "10% Rakeback + Weekly Bonus" },
  { name: "Gold", target: 50000, icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/20", border: "border-yellow-500/50", perk: "15% Rakeback + VIP Host" },
  { name: "Platinum", target: 250000, icon: Zap, color: "text-cyan-400", bg: "bg-cyan-400/20", border: "border-cyan-400/50", perk: "20% Rakeback + Daily Reload" },
  { name: "Obsidian", target: 1000000, icon: Gem, color: "text-purple-500", bg: "bg-purple-900/40", border: "border-purple-500/50", perk: "25% Rakeback + Bespoke Rewards" }
];

const VipPage = () => {
  const { user } = useAuthBalance();
  const [wagered, setWagered] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      // Sum all GC bets to calculate XP
      const { data, error } = await supabase
        .from("game_sessions")
        .select("bet_amount")
        .eq("user_id", user.id)
        .eq("currency", "gc");
        
      if (data && !error) {
         const total = data.reduce((sum, s) => sum + Number(s.bet_amount), 0);
         setWagered(total);
      }
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  const currentTierIndex = VIP_TIERS.reduce((latest, tier, idx) => wagered >= tier.target ? idx : latest, 0);
  const currentTier = VIP_TIERS[currentTierIndex];
  const nextTier = currentTierIndex < VIP_TIERS.length - 1 ? VIP_TIERS[currentTierIndex + 1] : null;
  const progress = nextTier ? Math.min(100, (wagered / nextTier.target) * 100) : 100;
  
  const CurrentIcon = currentTier.icon;
  
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <Crown className="w-16 h-16 text-primary/50 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-2">VIP Club</h1>
        <p className="text-muted-foreground mb-8">Sign in to view your VIP progress and exclusive rewards.</p>
        <div className="p-10 rounded-2xl glass-card border border-white/5 opacity-50">Content protected.</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Header Profile Card */}
      <div className="w-full rounded-3xl overflow-hidden relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#1a1a1a] to-[#0a0a0a] z-0"></div>
        <div className={`absolute right-0 top-0 w-1/2 h-full ${currentTier.bg} blur-[120px] opacity-40 rounded-full z-0`}></div>
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 border border-white/5 rounded-3xl">
           <div className={`w-32 h-32 rounded-full flex items-center justify-center shrink-0 border-4 ${currentTier.border} bg-black/50 shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
              <CurrentIcon className={`w-16 h-16 ${currentTier.color} drop-shadow-[0_0_15px_currentColor]`} />
           </div>
           
           <div className="flex-1 w-full text-center md:text-left">
              <h1 className="text-3xl font-black text-white mb-1">VIP {currentTier.name}</h1>
              <p className="text-muted-foreground text-sm font-medium tracking-wide flex items-center justify-center md:justify-start gap-2">
                 Current Perk: <span className={`${currentTier.color}`}>{currentTier.perk}</span>
              </p>
              
              <div className="mt-8">
                 <div className="flex justify-between text-sm mb-2 font-bold font-mono">
                    <span className="text-muted-foreground">{wagered.toLocaleString()} GC Wagered</span>
                    <span className="text-white">{progress.toFixed(2)}%</span>
                 </div>
                 <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div className={`h-full ${nextTier ? nextTier.bg.replace('/20', '') : currentTier.bg.replace('/20', '')} transition-all duration-1000 ease-out`} style={{width: `${progress}%`, backgroundColor: 'currentColor'}}></div>
                 </div>
                 {nextTier && (
                    <div className="flex justify-between mt-2 text-xs">
                       <span className="text-muted-foreground">Level {currentTierIndex + 1}</span>
                       <span className="text-muted-foreground">Target: {nextTier.target.toLocaleString()} GC</span>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
      
      {/* Tiers List */}
      <h2 className="text-xl font-bold text-white mb-6 px-2 flex items-center gap-2">
         <Crown className="w-5 h-5 text-primary" /> Tier Benefits
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
         {VIP_TIERS.map((tier, idx) => {
            const Icon = tier.icon;
            const isCurrent = idx === currentTierIndex;
            const isPast = idx < currentTierIndex;
            
            return (
               <div key={tier.name} className={`relative p-6 rounded-2xl border transition-all duration-300 ${isCurrent ? `${tier.border} bg-[#151515] scale-105 z-10 shadow-[0_10_40px_rgba(0,0,0,0.5)]` : 'border-white/5 bg-[#0a0a0a] hover:bg-[#111]'}`}>
                  {isCurrent && <div className={`absolute top-0 right-0 py-1 px-3 text-[10px] uppercase tracking-widest font-black rounded-bl-lg rounded-tr-xl ${tier.bg} ${tier.color}`}>Current</div>}
                  {isPast && <div className="absolute top-3 right-3"><div className="w-4 h-4 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-[10px]">✓</div></div>}
                  
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center border ${tier.bg} ${tier.border}`}>
                     <Icon className={`w-6 h-6 ${tier.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                  <div className="text-xs text-muted-foreground mb-4 font-mono">{tier.target === 0 ? "Default" : `${tier.target.toLocaleString()} GC`}</div>
                  
                  <div className="h-px w-full bg-white/5 mb-4"></div>
                  
                  <ul className="space-y-2">
                     <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Gift className={`w-4 h-4 mt-0.5 shrink-0 ${tier.color}`} /> 
                        <span>{tier.perk}</span>
                     </li>
                  </ul>
               </div>
            )
         })}
      </div>
    </div>
  );
};

export default VipPage;
