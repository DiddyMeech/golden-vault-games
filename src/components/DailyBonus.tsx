import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gift, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { toast } from "sonner";

const STORAGE_KEY = "goldvault_last_claim";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const REWARD_AMOUNT = 1000;

function getTimeLeft(): number {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return 0;
  const diff = parseInt(last) + COOLDOWN_MS - Date.now();
  return Math.max(0, diff);
}

function formatTime(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const DailyBonus = () => {
  const { user } = useAuthBalance();
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [showCoins, setShowCoins] = useState(false);

  // Check on mount if bonus is available and show popup (only if signed in)
  useEffect(() => {
    if (user && getTimeLeft() === 0) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Countdown ticker
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      const left = getTimeLeft();
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(interval);
        setClaimed(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleClaim = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("claim-faucet");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // On true success:
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setShowCoins(true);
      setTimeout(() => {
        setClaimed(true);
        setTimeLeft(COOLDOWN_MS);
      }, 1200);
    } catch (err: any) {
      console.error("Failed to claim daily bonus", err);
      toast.error(err.message || "Failed to claim bonus"); // Added toast error
      // If the backend says cooldown active, reset local timer to match backend
      if (err.message && err.message.includes("cooldown")) {
        // Optimistically set to 24h for now if we don't have exact time
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        setClaimed(true);
        setTimeLeft(COOLDOWN_MS);
      }
    } finally {
      if (typeof (window as any).exoconnect === 'function') {
        (window as any).exoconnect();
      }
    }
  };

  const canClaim = timeLeft === 0 && !claimed;

  if (!user) return null;

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring" }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gold-shimmer-btn gold-glow-strong flex items-center justify-center"
      >
        <Gift className="w-6 h-6" />
        {canClaim && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(0, 84%, 60%)" }}>
            <span className="text-[10px] font-bold" style={{ color: "hsl(0, 0%, 100%)" }}>!</span>
          </span>
        )}
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative glass-card gold-border-glow rounded-2xl p-8 max-w-sm w-full text-center overflow-hidden"
            >
              {/* Close */}
              <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 gold-gradient rounded-full opacity-20 animate-glow-pulse" />
                <div className="relative w-full h-full rounded-full gold-gradient flex items-center justify-center gold-glow-strong">
                  <Gift className="w-9 h-9 text-primary-foreground" />
                </div>
              </div>

              <h3 className="text-2xl font-bold gold-text mb-2">Daily Bonus!</h3>
              <p className="text-muted-foreground text-sm mb-6">
                {canClaim
                  ? "Your daily reward is ready to claim!"
                  : "Come back tomorrow for more coins!"}
              </p>

              {/* Reward display */}
              <div className="glass-card gold-border-glow rounded-xl p-4 mb-6 relative overflow-hidden">
                <AnimatePresence>
                  {showCoins && (
                    <>
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 0, x: 0, opacity: 1 }}
                          animate={{
                            y: [0, -60 - Math.random() * 40],
                            x: [(Math.random() - 0.5) * 80],
                            opacity: [1, 0],
                          }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="absolute left-1/2 top-1/2"
                        >
                          <Coins className="w-5 h-5 text-primary" />
                        </motion.div>
                      ))}
                    </>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-6 h-6 text-primary" />
                  <span className="text-3xl font-extrabold gold-text">
                    {REWARD_AMOUNT.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground font-medium">FC</span>
                </div>
              </div>

              {canClaim ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClaim}
                  className="w-full gold-shimmer-btn font-bold text-lg py-3.5 rounded-xl gold-glow-strong"
                >
                  Claim Reward
                </motion.button>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Next bonus in
                  </div>
                  <div className="font-mono text-2xl font-bold gold-text tracking-widest">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DailyBonus;
