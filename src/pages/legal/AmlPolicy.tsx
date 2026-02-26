import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchCheck } from "lucide-react";

const AmlPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-border/50 pb-6">
        <SearchCheck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold gold-text">AML/KYC Policy</h1>
          <p className="text-muted-foreground mt-1">Anti-Money Laundering & Know Your Customer</p>
        </div>
      </div>

      <ScrollArea className="h-[70vh] rounded-xl border border-border/50 bg-card/30 p-8 glass-card">
        <div className="space-y-8 text-foreground/80 leading-relaxed max-w-none">
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">1. Commitment to Compliance</h2>
            <p className="mb-4">
              VAULT0X strictly prohibits the use of its platform for money laundering, terrorist financing, or any other illegal activities. We adhere to stringent Anti-Money Laundering (AML) standards equivalent to those required by financial institutions globally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">2. Know Your Customer (KYC) Verification</h2>
            <p className="mb-4">To ensure the integrity of our Sweepstakes redemptions, we mandate a multi-tier KYC process before releasing any digital assets. We may require the following documentation:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Level 1 (Basic Verification):</strong> Name, Date of Birth, Email Verification, and Physical Address.</li>
              <li><strong>Level 2 (Identity Verification):</strong> A government-issued photo ID (Passport, Driver’s License).</li>
              <li><strong>Level 3 (Address Verification):</strong> A recent utility bill or bank statement (issued within the last 90 days).</li>
              <li><strong>Level 4 (Source of Funds):</strong> For high-volume users, proof of income or crypto origin statements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">3. Playthrough Requirements</h2>
            <p>
              To eliminate structural money laundering vectors, all purchased Gold Coins must be played on the platform. Any free Sweep Tokens attached to purchases must be played through at a minimum of 1x (one time) before being eligible for prize redemption. We reserve the right to increase this requirement to 3x if irregular activity is detected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">4. Cryptocurrency Compliance</h2>
            <p>
              We actively monitor all incoming blockchain transactions utilizing chain-analysis tools. Deposits originating from sanctioned entities, mixers (e.g., Tornado Cash), or darknet markets will be frozen immediately and reported to relevant authorities (such as FinCEN or OFAC). We only support deposits/withdrawals from non-custodial wallets belonging directly to the verified user.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">5. Suspicious Activity Reporting (SAR)</h2>
            <p>
              Our automated systems flag unusual deposit/withdrawal velocities, erratic game play patterns, or linked accounts attempting to bypass limits. VAULT0X reserves the right to freeze accounts and file Suspicious Activity Reports (SARs) with financial intelligence units without notifying the account holder.
            </p>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
};

export default AmlPolicy;
