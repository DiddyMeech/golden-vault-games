import { Mail, Shield, Scale } from "lucide-react";
import vault0xLogo from "@/assets/vault0x-logo.png";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={vault0xLogo} alt="VAULT0X" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-extrabold gold-text">VAULT0X</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The premier crypto sweepstakes platform. Deposit and withdraw in BTC, ETH, SOL & USDT. 100% provably fair.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/lobby" className="hover:text-foreground transition-colors">Game Lobby</Link></li>
              <li><Link to="/wallet" className="hover:text-foreground transition-colors">Crypto Wallet</Link></li>
              <li><Link to="/vip" className="hover:text-foreground transition-colors">VIP Program</Link></li>
              <li><Link to="/affiliate" className="hover:text-foreground transition-colors">Affiliate</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/provably-fair" className="hover:text-foreground transition-colors">Provably Fair</Link></li>
              <li><Link to="/legal/sweepstakes" className="hover:text-foreground transition-colors">Sweepstakes Rules</Link></li>
              <li><Link to="/legal/responsible-gaming" className="hover:text-foreground transition-colors">Responsible Gaming</Link></li>
              <li><Link to="/legal/aml-kyc" className="hover:text-foreground transition-colors">AML/KYC Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/support" className="hover:text-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/support" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <a href="mailto:support@vault0x.io" className="hover:text-foreground transition-colors">support@vault0x.io</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="mt-12 pt-8 border-t border-border/30 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /><span>SSL Encrypted</span></div>
              <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-primary" /><span>Provably Fair</span></div>
              <span>18+ Only</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">© 2026 VAULT0X. All rights reserved.</p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed max-w-4xl mx-auto">
            VAULT0X operates as a social sweepstakes platform. No purchase is necessary to play or win. Gold Coins (GC) are virtual currency with no monetary value. Sweep Tokens (ST) may be redeemed for cryptocurrency prizes where permitted by law. Void where prohibited. Players must be 18 years of age or older. VAULT0X does not provide gambling services. All games are provably fair using cryptographic verification. Please play responsibly. If you or someone you know has a gaming problem, call 1-800-522-4700.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
