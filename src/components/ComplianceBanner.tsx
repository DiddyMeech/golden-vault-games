import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ComplianceBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenBanner = localStorage.getItem("vault0x_compliance_banner_accepted");
    if (!hasSeenBanner) {
      // Small delay so it slides in after initial paint
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("vault0x_compliance_banner_accepted", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 md:px-8 md:pb-8 pointer-events-none flex justify-center"
        >
          <div className="bg-background/80 backdrop-blur-md border border-border gold-border-glow shadow-2xl p-4 md:p-6 rounded-2xl w-full max-w-5xl pointer-events-auto flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
            <div className="flex-shrink-0 bg-primary/20 p-3 rounded-full">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-foreground text-sm md:text-base">Important Compliance Notice</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                VAULT0X operates as a Sweepstakes platform. <strong>NO PURCHASE IS NECESSARY TO PLAY OR WIN.</strong> A purchase will not increase your chances of winning. Void where prohibited by law. By continuing, you agree to our <Link to="/legal/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/legal/sweepstakes" className="text-primary hover:underline">Sweepstakes Rules</Link>.
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={accept}
                className="w-full md:w-auto gold-shimmer-btn px-6 py-2.5 rounded-xl font-bold whitespace-nowrap"
              >
                I Understand
              </button>
              <button 
                onClick={() => setIsVisible(false)}
                className="p-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComplianceBanner;
