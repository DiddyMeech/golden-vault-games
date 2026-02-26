import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TopUpModalProps { open: boolean; onClose: () => void; currency: "gc" | "st"; }

const TopUpModal = ({ open, onClose, currency }: TopUpModalProps) => {
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="relative glass-card gold-border-glow rounded-2xl p-8 max-w-sm w-full text-center">
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4"><AlertTriangle className="w-8 h-8 text-destructive" /></div>
            <h3 className="text-xl font-bold text-foreground mb-2">Insufficient Balance</h3>
            <p className="text-muted-foreground text-sm mb-6">You don't have enough {currency === "gc" ? "Gold Coins" : "Sweep Tokens"}. Top up to continue.</p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { onClose(); navigate("/wallet"); }} className="w-full gold-shimmer-btn font-bold py-3 rounded-xl gold-glow">Go to Wallet</motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default TopUpModal;
