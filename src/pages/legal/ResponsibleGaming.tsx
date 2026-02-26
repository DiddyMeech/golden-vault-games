import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeartPulse, CheckCircle } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const ResponsibleGaming = () => {
  const { user } = useAuthBalance();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [gcLimit, setGcLimit] = useState("");
  const [stLimit, setStLimit] = useState("");
  const [excludeDays, setExcludeDays] = useState("1");

  useEffect(() => {
    if (user) {
      (supabase.from("profiles").select("daily_bet_limit_gc, daily_bet_limit_st").eq("id", user.id).single() as any)
        .then(({ data }: any) => {
          if (data) {
            setGcLimit(data.daily_bet_limit_gc?.toString() || "");
            setStLimit(data.daily_bet_limit_st?.toString() || "");
          }
        });
    }
  }, [user]);

  const saveLimits = async () => {
    if (!user) return;
    setLoading(true);
    setSuccess("");
    const gc = parseFloat(gcLimit);
    const st = parseFloat(stLimit);
    
    await (supabase.from("profiles").update({
      daily_bet_limit_gc: isNaN(gc) || gc <= 0 ? null : gc,
      daily_bet_limit_st: isNaN(st) || st <= 0 ? null : st,
    } as any).eq("id", user.id) as any);
    
    setSuccess("Limits updated successfully.");
    setLoading(false);
  };

  const applySelfExclusion = async () => {
    if (!user) return;
    const days = parseInt(excludeDays);
    if (isNaN(days) || days < 1) return;
    
    if (window.confirm(`Are you sure you want to lock your account for ${days} days? You will NOT be able to play. This cannot be undone.`)) {
      setLoading(true);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      await (supabase.from("profiles").update({
        self_excluded_until: targetDate.toISOString(),
      } as any).eq("id", user.id) as any);
      
      setSuccess(`Account locked until ${targetDate.toLocaleDateString()}`);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-border/50 pb-6">
        <HeartPulse className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold gold-text">Responsible Gaming</h1>
          <p className="text-muted-foreground mt-1">Play for fun. Play responsibly.</p>
        </div>
      </div>

      <ScrollArea className="h-[70vh] rounded-xl border border-border/50 bg-card/30 p-8 glass-card">
        <div className="space-y-8 text-foreground/80 leading-relaxed max-w-none">
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">1. Our Commitment</h2>
            <p>
              VAULT0X is dedicated to providing a safe, secure, and entertaining social sweepstakes environment. We want our players to enjoy our games responsibly. Gaming should always be a form of entertainment, not a way to make money or escape problems.
            </p>
          </section>

          {user && (
            <section className="bg-background/50 border border-primary/20 p-6 rounded-2xl space-y-6">
              <h2 className="text-xl font-bold gold-text flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-primary" /> Active Player Controls
              </h2>
              
              {success && (
                <div className="bg-success/10 text-success px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {success}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Daily Bet Limits</h3>
                  <p className="text-xs text-muted-foreground">Once you wager this amount in a single day, you will be blocked from additional bets until the timeline resets.</p>
                  <div>
                    <label htmlFor="gc-lim" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Gold Coin Limit</label>
                    <input id="gc-lim" type="number" placeholder="No limit" value={gcLimit} onChange={e => setGcLimit(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label htmlFor="st-lim" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Sweep Token Limit</label>
                    <input id="st-lim" type="number" placeholder="No limit" value={stLimit} onChange={e => setStLimit(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={saveLimits} disabled={loading} className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary font-bold rounded-xl transition-colors text-sm">
                    Save Limits
                  </motion.button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-destructive">Take a Break (Self-Exclusion)</h3>
                  <p className="text-xs text-muted-foreground">Temporarily lock your account. You will not be able to play any games until the requested timeframe expires.</p>
                  <div>
                    <label htmlFor="ex-days" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Days to Exclude</label>
                    <div className="flex gap-2">
                      <input id="ex-days" type="number" min="1" max="365" value={excludeDays} onChange={e => setExcludeDays(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive" />
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={applySelfExclusion} disabled={loading} className="px-4 bg-destructive text-destructive-foreground font-bold rounded-xl transition-colors text-sm whitespace-nowrap">
                        Lock Account
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">3. Underage Gaming Prevention</h2>
            <p>
              The Platform is strictly prohibited for anyone under eighteen (18) years of age. We employ robust identity verification to ensure minors cannot access or redeem prizes on the Platform. If you share your device with a minor, we recommend utilizing parental control software to filter and block restricted content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">4. Seeking External Help</h2>
            <p className="mb-4">
              If you or someone you know has a gaming problem, professional help is available. We recommend reaching out to:
            </p>
            <ul className="list-none space-y-2">
              <li className="font-semibold text-primary">National Council on Problem Gambling</li>
              <li>Call: 1-800-522-4700</li>
              <li>Text: 1-800-522-4700</li>
              <li>Chat: ncpgambling.org/chat</li>
            </ul>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
};

export default ResponsibleGaming;
