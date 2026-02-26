import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LiveSupportBubble = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="glass-card gold-border-glow rounded-2xl p-5 mb-3 w-72 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground text-sm">VAULT0X Support</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: "hsl(var(--success))" }} />
                <p className="text-sm text-muted-foreground">We're online and ready to help. Average response time: &lt;2 minutes.</p>
              </div>
              <a href="/support" className="block w-full gold-shimmer-btn font-semibold text-sm py-2.5 rounded-xl text-center gold-glow">
                Open Live Chat
              </a>
              <a href="mailto:support@vault0x.io" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                or email support@vault0x.io
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full gold-gradient gold-glow-strong flex items-center justify-center shadow-xl"
      >
        {open ? <X className="w-6 h-6 text-primary-foreground" /> : <MessageCircle className="w-6 h-6 text-primary-foreground" />}
      </motion.button>
    </div>
  );
};

export default LiveSupportBubble;
