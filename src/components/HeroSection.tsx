import { motion } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-coins.jpg";
import GoldParticles from "@/components/GoldParticles";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Gold coins" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>
      <GoldParticles />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 glass-card gold-border-glow px-4 py-2 rounded-full mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">100% Provably Fair · Crypto Only</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            <span className="text-foreground">Welcome to</span>
            <br />
            <span className="gold-text">VAULT0X</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10">
            High-stakes crypto sweepstakes. Instant BTC, ETH, SOL & USDT redemptions. Every game is provably fair.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/lobby")}
              className="gold-shimmer-btn font-bold text-lg px-8 py-4 rounded-full gold-glow-strong flex items-center justify-center gap-2"
            >
              Enter the Vault
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/provably-fair")}
              className="glass-card gold-border-glow text-foreground font-semibold text-lg px-8 py-4 rounded-full hover:bg-muted/30 transition-colors"
            >
              Provably Fair
            </motion.button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "hsl(var(--success))" }} />
              <span>2,847 online now</span>
            </div>
            <div>$1.2M+ redeemed</div>
            <div className="hidden sm:block">Crypto only</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
