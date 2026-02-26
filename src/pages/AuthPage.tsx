import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import React from "react";
import WalletLogin from "@/components/WalletLogin";
import { motion } from "framer-motion";
import { Coins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthBalance();

  useEffect(() => {
    if (user) {
      navigate("/lobby");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full gold-gradient flex items-center justify-center mb-6 gold-glow-strong shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            <Coins className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black gold-text mb-2 tracking-tight">Vault Games</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Web3 Native Casino
          </p>
        </div>

        <div className="glass-card gold-border-glow rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
          
          {/* Supabase Auth (Email/Password or Social) could go here if needed */}
          {/* For now, we'll just show the WalletLogin */}

          <div className="relative my-6 max-w-sm mx-auto w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-accent/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0f1c] px-2 text-muted-foreground font-bold tracking-widest">
                Or continue with
              </span>
            </div>
          </div>
          
          {/* Adding the Web3 Wallet component below Supabase Auth */}
          <WalletLogin />

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
             <p className="text-[10px] text-muted-foreground leading-relaxed">
               By connecting a wallet, you agree to Vault0x's Terms of Service and Privacy Policy.
               <br />This is a <span className="text-primary font-bold">placeholder demo</span>; connections to real wallets are pending Web3 library integration.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
