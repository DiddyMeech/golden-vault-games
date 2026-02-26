import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bomb, TowerControl, Dice1, CircleDot, Rocket, ArrowRight, Zap, Dice5, CircleDashed, Spade } from "lucide-react";
import LiveWinsFeed from "@/components/LiveWinsFeed";
import slotsImg from "@/assets/game-slots.jpg";
import plinkoImg from "@/assets/game-plinko.jpg";
import minesImg from "@/assets/game-mines.jpg";

const games = [
  { name: "Roulette", desc: "European 3D physics spins. 2.70% edge.", path: "/games/roulette", icon: CircleDashed, image: minesImg, tag: "Exclusive" },
  { name: "Blackjack", desc: "Multi-hand blackjack. Dealer stands on soft 17. 3:2 payout.", path: "/games/blackjack", icon: Spade, image: plinkoImg, tag: "New" },
  { name: "Mines", desc: "5×5 grid. Avoid bombs, cash out anytime. 3% house edge.", path: "/games/mines", icon: Bomb, image: minesImg, tag: "Popular" },
  { name: "Tower", desc: "Climb floors by picking safe tiles. Higher = bigger wins.", path: "/games/tower", icon: TowerControl, image: plinkoImg, tag: "Hot" },
  { name: "Crash", desc: "Watch the multiplier rise. Cash out before it crashes!", path: "/games/crash", icon: Rocket, image: minesImg, tag: "🔥 Hot" },
  { name: "Limbo", desc: "Instant multiplier. Set your target, roll and win. 1% edge.", path: "/games/limbo", icon: Zap, image: slotsImg, tag: "New" },
  { name: "Dice", desc: "Roll over or under. You set the odds. Crypto-verified.", path: "/games/dice", icon: Dice5, image: plinkoImg, tag: "Classic" },
  { name: "Wheel", desc: "Spin the wheel. Low, medium or high risk segments.", path: "/games/wheel", icon: CircleDashed, image: slotsImg, tag: "Featured" },
  { name: "Slots", desc: "Classic 3-reel crypto slots. Match symbols to multiply.", path: "/games/slots", icon: Dice1, image: slotsImg, tag: "Classic" },
  { name: "Plinko", desc: "Drop the ball through pegs. Low, medium or high risk.", path: "/games/plinko", icon: CircleDot, image: plinkoImg, tag: "New" },
];

const Lobby = () => {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold mb-1">
          <span className="gold-text">Game Lobby</span>
        </motion.h1>
        <p className="text-muted-foreground mb-6">Choose your game and start winning crypto</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game, i) => (
            <motion.div key={game.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }} onClick={() => navigate(game.path)}
              className="group glass-card gold-border-glow rounded-xl overflow-hidden cursor-pointer hover:gold-glow transition-shadow duration-300">
              <div className="relative h-40 overflow-hidden">
                <img src={game.image} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute top-3 left-3"><span className="gold-gradient text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">{game.tag}</span></div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1"><game.icon className="w-4 h-4 text-primary" /><h3 className="font-semibold text-foreground">{game.name}</h3></div>
                <p className="text-xs text-muted-foreground mb-3">{game.desc}</p>
                <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Play Now <ArrowRight className="w-3 h-3" /></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="hidden xl:block"><LiveWinsFeed /></div>
    </div>
  );
};
export default Lobby;
