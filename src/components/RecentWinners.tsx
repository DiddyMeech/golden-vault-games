import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";

const winners = [
  { user: "GoldKing_99", amount: "250.00", game: "Gold Rush Slots", time: "2m ago" },
  { user: "LuckyDiamond", amount: "50.00", game: "Plinko Royale", time: "5m ago" },
  { user: "VaultRunner", amount: "1,200.00", game: "Diamond Mines", time: "8m ago" },
  { user: "SweepsQueen", amount: "75.00", game: "Lucky Sevens", time: "12m ago" },
  { user: "CoinMaster42", amount: "320.00", game: "Vault Breaker", time: "15m ago" },
  { user: "RoyalFlush", amount: "180.00", game: "Treasure Hunt", time: "18m ago" },
  { user: "GoldStrike", amount: "500.00", game: "Gold Rush Slots", time: "22m ago" },
  { user: "DiamondHands", amount: "95.00", game: "Plinko Royale", time: "25m ago" },
];

const RecentWinners = () => {
  return (
    <section id="winners" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gold-text">Recent Winners</span>
          </h2>
          <p className="text-muted-foreground text-lg">Real players, real wins — updated live</p>
        </motion.div>

        {/* Ticker */}
        <div className="overflow-hidden mb-10">
          <div className="flex animate-ticker gap-4">
            {[...winners, ...winners].map((w, i) => (
              <div
                key={i}
                className="flex-shrink-0 glass-card gold-border-glow rounded-full px-5 py-2.5 flex items-center gap-3"
              >
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {w.user}
                </span>
                <span className="text-sm font-bold gold-text whitespace-nowrap">
                  {w.amount} SC
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card gold-border-glow rounded-xl overflow-hidden max-w-3xl mx-auto"
        >
          <div className="grid grid-cols-4 gap-4 p-4 border-b border-border/50 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <div>Player</div>
            <div>Game</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Time</div>
          </div>
          {winners.slice(0, 6).map((w, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-4 gap-4 p-4 border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {w.user[0]}
                </div>
                <span className="text-sm font-medium text-foreground truncate">{w.user}</span>
              </div>
              <div className="text-sm text-muted-foreground flex items-center">{w.game}</div>
              <div className="text-right flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3" style={{ color: "hsl(142, 71%, 45%)" }} />
                <span className="text-sm font-semibold gold-text">{w.amount} SC</span>
              </div>
              <div className="text-sm text-muted-foreground text-right flex items-center justify-end">{w.time}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default RecentWinners;
