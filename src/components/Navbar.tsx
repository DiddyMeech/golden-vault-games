import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import vault0xLogo from "@/assets/vault0x-logo.png";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 backdrop-blur-2xl">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <a href="/" className="flex items-center gap-2.5">
          <img src={vault0xLogo} alt="VAULT0X" className="w-8 h-8 rounded-lg" />
          <span className="text-xl font-extrabold gold-text tracking-tight">VAULT0X</span>
        </a>

        <div className="hidden md:flex items-center gap-6">
          <a href="#games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Games</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
          <a href="#winners" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Winners</a>
          <a href="/provably-fair" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Provably Fair</a>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/lobby")} className="hidden md:block gold-shimmer-btn font-semibold text-sm px-5 py-2 rounded-full gold-glow">
            Enter the Vault
          </button>
          <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-4 p-4">
              <a href="#games" className="text-foreground py-2" onClick={() => setMobileOpen(false)}>Games</a>
              <a href="#how-it-works" className="text-foreground py-2" onClick={() => setMobileOpen(false)}>How it Works</a>
              <a href="#winners" className="text-foreground py-2" onClick={() => setMobileOpen(false)}>Winners</a>
              <a href="/provably-fair" className="text-foreground py-2" onClick={() => setMobileOpen(false)}>Provably Fair</a>
              <button onClick={() => { setMobileOpen(false); navigate("/lobby"); }} className="gold-shimmer-btn font-semibold py-3 rounded-full gold-glow">
                Enter the Vault
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
