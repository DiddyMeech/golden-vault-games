import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="flex-1 container mx-auto p-4 md:p-8 space-y-8 animate-fade-in relative z-10 pt-24">
      <div className="flex items-center gap-4 mb-4">
        <Copy className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase font-display leading-tight drop-shadow-md">Terms of Service</h1>
        </div>
      </div>

      <ScrollArea className="h-[70vh] rounded-xl border border-border/50 bg-card/30 p-8 glass-card">
        <div className="space-y-8 text-foreground/80 leading-relaxed max-w-none">
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using VAULT0X (the "Platform"), you agree to abide by these Terms of Service. If you do not agree, you must immediately cease all use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">2. Eligibility</h2>
            <p>
              The Platform is intended for individuals aged eighteen (18) or older. Users must reside in a jurisdiction where participation in promotional sweepstakes is lawful. You represent and warrant that all information provided during registration is accurate and truthful.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">3. Virtual Currency and Purchases</h2>
            <p>
              VAULT0X offers a dual-currency system: Gold Coins (GC) for social play and Sweep Tokens (ST) for promotional play. Purchases of Gold Coins are final and non-refundable. Sweep Tokens are always provided free of charge, either as a bonus with the purchase of Gold Coins or via an Alternative Method of Entry (AMOE).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">4. Prohibited Conduct</h2>
            <p className="mb-4">Users are strictly prohibited from engaging in the following behaviors:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Using automated bots, scripts, or exploiting bugs to gain an unfair advantage (all gameplay is cryptographically verified).</li>
              <li>Operating multiple accounts to bypass promotional limits or abuse the Affiliate Empire system.</li>
              <li>Engaging in fraudulent chargebacks or payment disputes.</li>
              <li>Using the Platform for any money laundering or illicit financial activities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">5. Account Termination</h2>
            <p>
              VAULT0X reserves the right to suspend or terminate any account involved in violating these Terms. In the event of termination, any pending Sweep Tokens or virtual balances may be forfeited at the sole discretion of the Sponsor.
            </p>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
};

export default TermsOfService;
