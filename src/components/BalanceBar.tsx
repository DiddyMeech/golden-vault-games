import { Coins, CircleDollarSign, LogOut } from "lucide-react";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { AnimatedNumber } from "./AnimatedNumber";

export const BalanceBar = () => {
  const { goldCoins, sweepTokens, signOut, user } = useAuthBalance();

  if (!user) return null;

  return (
    <div className="flex items-center gap-4 py-2 px-4 rounded-full border border-border/50 bg-card/30 backdrop-blur-xl shadow-lg">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2" title="Gold Coins">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground"><AnimatedNumber value={goldCoins} /></span>
        </div>
        <div className="w-px h-6 bg-border/50 rounded-full" />
        <div className="flex items-center gap-2" title="Sweep Tokens">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CircleDollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-foreground"><AnimatedNumber value={sweepTokens} format={(v) => v.toFixed(2)} /></span>
        </div>
      </div>
      <div className="w-px h-6 bg-border/50 rounded-full ml-2" />
      <button onClick={async () => { await signOut(); window.location.href = '/'; }} className="p-1.5 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};
