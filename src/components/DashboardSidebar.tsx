import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid, Bomb, TowerControl, Dice1, CircleDot, Rocket,
  Wallet, Crown, HelpCircle, Gift, Shield, Users, Gem, Menu, X,
  Zap, Dice5, CircleDashed,
} from "lucide-react";
import vault0xLogo from "@/assets/vault0x-logo.png";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { supabase } from "@/integrations/supabase/client";

const navSections = [
  {
    label: "Main",
    items: [
      { label: "Lobby", to: "/lobby", icon: LayoutGrid },
      { label: "Wallet", to: "/wallet", icon: Wallet },
    ],
  },
  {
    label: "Originals",
    items: [
      { label: "Mines", to: "/games/mines", icon: Bomb },
      { label: "Tower", to: "/games/tower", icon: TowerControl },
      { label: "Crash", to: "/games/crash", icon: Rocket },
      { label: "Plinko", to: "/games/plinko", icon: CircleDot },
      { label: "Limbo", to: "/games/limbo", icon: Zap },
      { label: "Dice", to: "/games/dice", icon: Dice5 },
      { label: "Wheel", to: "/games/wheel", icon: CircleDashed },
    ],
  },
  {
    label: "Slots",
    items: [
      { label: "Classic Slots", to: "/games/slots", icon: Dice1 },
    ],
  },
  {
    label: "More",
    items: [
      { label: "Promotions", to: "/vip", icon: Gift },
      { label: "VIP Club", to: "/vip", icon: Crown },
      { label: "Provably Fair", to: "/provably-fair", icon: Shield },
      { label: "Affiliate", to: "/affiliate", icon: Users },
      { label: "Support", to: "/support", icon: HelpCircle },
    ],
  },
];

const allItems = navSections.flatMap((s) => s.items);
const mobileItems = [
  allItems.find((i) => i.label === "Lobby")!,
  allItems.find((i) => i.label === "Mines")!,
  allItems.find((i) => i.label === "Crash")!,
  allItems.find((i) => i.label === "Wallet")!,
];

const VipSidebarProgress = () => {
  const { user } = useAuthBalance();
  const [wagered, setWagered] = useState(0);

  // We could use an effect to listen to game_sessions inserts for real-time, but fetch on mount is okay for now
  useState(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase.from("game_sessions").select("bet_amount").eq("user_id", user.id).eq("currency", "gc");
      if (data) setWagered(data.reduce((sum, s) => sum + Number(s.bet_amount), 0));
    };
    fetchStats();
  });

  if (!user) return null;

  const VIP_TIERS = [
    { name: "Bronze", target: 0, color: "text-amber-700", bg: "bg-amber-700" },
    { name: "Silver", target: 10000, color: "text-slate-400", bg: "bg-slate-400" },
    { name: "Gold", target: 50000, color: "text-yellow-500", bg: "bg-yellow-500" },
    { name: "Platinum", target: 250000, color: "text-cyan-400", bg: "bg-cyan-400" },
    { name: "Obsidian", target: 1000000, color: "text-purple-500", bg: "bg-purple-500" }
  ];

  const currentTierIndex = VIP_TIERS.reduce((latest, tier, idx) => wagered >= tier.target ? idx : latest, 0);
  const currentTier = VIP_TIERS[currentTierIndex];
  const nextTier = currentTierIndex < VIP_TIERS.length - 1 ? VIP_TIERS[currentTierIndex + 1] : null;
  const progress = nextTier ? Math.min(100, (wagered / nextTier.target) * 100) : 100;

  return (
    <div className="px-4 py-5 mt-auto mb-2 border-t border-white/5 bg-black/20 mx-2 rounded-xl">
       <div className="flex items-center justify-between mb-2">
         <span className={`text-[11px] uppercase tracking-widest font-black ${currentTier.color}`}>{currentTier.name} VIP</span>
         <span className="text-[10px] text-muted-foreground font-mono font-bold">{progress.toFixed(1)}%</span>
       </div>
       <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div className={`h-full ${nextTier ? nextTier.bg : currentTier.bg} transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]`} style={{width: `${progress}%`}}></div>
       </div>
       {nextTier && <div className="text-[9px] text-muted-foreground mt-2 text-right font-mono">{(wagered/1000).toFixed(1)}k / {(nextTier.target/1000).toFixed(0)}k Wagered</div>}
    </div>
  );
};

const DashboardSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const linkClasses = (path: string) => {
    const active = location.pathname === path;
    return `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-primary/10 text-primary gold-border-glow border"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
    }`;
  };

  const sidebar = (
    <nav className="flex flex-col gap-1 p-4 h-full overflow-y-auto">
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2.5 px-3 py-3 mb-2">
        <img src={vault0xLogo} alt="VAULT0X" className="w-8 h-8 rounded-lg" />
        <span className="text-lg font-extrabold gold-text tracking-tight">VAULT0X</span>
      </NavLink>

      {navSections.map((section) => (
        <div key={section.label} className="mb-2">
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
            {section.label}
          </div>
          {section.items.map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              className={linkClasses(item.to)}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
      <VipSidebarProgress />
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 overflow-y-auto">
        {sidebar}
      </aside>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-border">
        <div className="flex items-center justify-around py-2">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${
                location.pathname === item.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardSidebar;
