import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";
import slotsImg from "@/assets/game-slots.jpg";
import plinkoImg from "@/assets/game-plinko.jpg";
import minesImg from "@/assets/game-mines.jpg";

const games = [
  { name: "Gold Rush Slots", image: slotsImg, tag: "Popular", rtp: "96.5%" },
  { name: "Plinko Royale", image: plinkoImg, tag: "Hot", rtp: "97.0%" },
  { name: "Diamond Mines", image: minesImg, tag: "New", rtp: "95.8%" },
  { name: "Vault Breaker", image: slotsImg, tag: "Exclusive", rtp: "96.2%" },
  { name: "Lucky Sevens", image: plinkoImg, tag: "Classic", rtp: "97.5%" },
  { name: "Treasure Hunt", image: minesImg, tag: "Featured", rtp: "96.0%" },
];

const GameLobby = () => {
  return (
    <section id="games" className="py-20 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gold-text">The Game Lobby</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Premium sweepstakes games with provably fair results
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group glass-card gold-border-glow rounded-xl overflow-hidden cursor-pointer hover:gold-glow transition-shadow duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="gold-gradient text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    {game.tag}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 glass-card px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 text-primary fill-primary" />
                  <span className="text-xs text-foreground">{game.rtp}</span>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{game.name}</h3>
                <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4 fill-primary" />
                  <span className="text-sm font-medium">Play</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GameLobby;
