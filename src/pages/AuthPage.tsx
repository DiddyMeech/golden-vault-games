import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Wallet, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const WALLETS = [
  { id: "metamask", name: "MetaMask", icon: "🦊", color: "bg-[#F6851B]/10 border-[#F6851B]/30 hover:border-[#F6851B]" },
  { id: "phantom", name: "Phantom", icon: "👻", color: "bg-[#AB9FF2]/10 border-[#AB9FF2]/30 hover:border-[#AB9FF2]" },
  { id: "walletconnect", name: "WalletConnect", icon: "🔗", color: "bg-[#3B99FC]/10 border-[#3B99FC]/30 hover:border-[#3B99FC]" },
  { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", color: "bg-[#0052FF]/10 border-[#0052FF]/30 hover:border-[#0052FF]" },
];

const AuthPage = () => {
  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleWalletConnect = async (walletId: string) => {
    setLoadingWallet(walletId);
    
    // Simulate Web3 wallet connection delay
    setTimeout(async () => {
      try {
        // Mock a wallet connection by generating a deterministic-looking proxy account
        // This ensures the user isn't locked out of the app while Web3 auth is pending integration
        const fakeAddress = "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, '0');
        const proxyEmail = `${fakeAddress}@web3.vault0x.com`;
        const proxyPassword = 'web3-placeholder-pass-123!';
        
        // Attempt to sign up the proxy user
        const { error: signUpError } = await supabase.auth.signUp({
          email: proxyEmail,
          password: proxyPassword,
          options: {
             data: { 
                 username: `User ${fakeAddress.substring(0, 6)}`,
                 wallet_address: fakeAddress
             }
          }
        });
        
        // We might get an error if it already exists, so we just log in anyway
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: proxyEmail,
          password: proxyPassword
        });

        if (signInError) throw signInError;
        
        toast.success("Wallet Connected Successfully!");
        navigate("/lobby");
      } catch (err: any) {
        toast.error(err.message || "Failed to connect wallet.");
        setLoadingWallet(null);
      }
    }, 1500);
  };

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
          
          <div className="text-center mb-6">
             <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Wallet className="w-5 h-5 text-primary" /> Connect Wallet
             </h2>
             <p className="text-xs text-muted-foreground">
                Sign in securely using your Web3 wallet. No password required.
             </p>
          </div>

          <div className="space-y-3">
             {WALLETS.map((wallet) => (
               <motion.button
                 key={wallet.id}
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => handleWalletConnect(wallet.id)}
                 disabled={loadingWallet !== null}
                 className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${wallet.color} ${loadingWallet === wallet.id ? 'opacity-100 ring-2 ring-primary ring-offset-2 ring-offset-background' : loadingWallet !== null ? 'opacity-40 grayscale' : 'opacity-100'}`}
               >
                 <div className="flex items-center gap-3">
                    <span className="text-2xl">{wallet.icon}</span>
                    <span className="font-semibold text-foreground">{wallet.name}</span>
                 </div>
                 {loadingWallet === wallet.id ? (
                   <Loader2 className="w-5 h-5 text-primary animate-spin" />
                 ) : (
                   <ArrowRight className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                 )}
               </motion.button>
             ))}
          </div>

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
