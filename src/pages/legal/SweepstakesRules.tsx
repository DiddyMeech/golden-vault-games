import { ScrollArea } from "@/components/ui/scroll-area";
import { Scale } from "lucide-react";

const SweepstakesRules = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-border/50 pb-6">
        <Scale className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold gold-text">Official Sweepstakes Rules</h1>
          <p className="text-muted-foreground mt-1">NO PURCHASE OR PAYMENT NECESSARY TO ENTER OR WIN.</p>
        </div>
      </div>

      <ScrollArea className="h-[70vh] rounded-xl border border-border/50 bg-card/30 p-8 glass-card">
        <div className="space-y-8 text-foreground/80 leading-relaxed max-w-none">
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">1. General Rules</h2>
            <p>
              VAULT0X ("Sponsor") operates the website vault0x.io. These Sweepstakes Rules govern the promotional gameplay offering Sweep Tokens (ST) which can be redeemed for prizes. A PURCHASE OR PAYMENT OF ANY KIND WILL NOT INCREASE YOUR CHANCES OF WINNING. VOID WHERE PROHIBITED BY LAW.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">2. Eligibility</h2>
            <p className="mb-4">
              The Sweepstakes is strictly open to legal residents of permitted jurisdictions who are at least eighteen (18) years old or the age of majority in their jurisdiction at the time of entry. 
            </p>
            <p>
              Employees, officers, or directors of Sponsor, its affiliates, and immediate family members are not eligible to participate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">3. Virtual Currencies</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Gold Coins (GC):</strong> Gold Coins are social virtual currency intended solely for entertainment. They cannot be redeemed for real money, cryptocurrency, or prizes.</li>
              <li><strong>Sweep Tokens (ST):</strong> Sweep Tokens are sweepstakes entries. They have no inherent value, but eligible ST won through gameplay may be redeemed for digital assets (e.g., cryptocurrency).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">4. How To Enter & AMOE (Alternative Method of Entry)</h2>
            <p className="mb-4">Participants can obtain Sweep Tokens (ST) in the following ways:</p>
            <ul className="list-decimal pl-6 space-y-4">
              <li><strong>Free Daily Faucet:</strong> Logging into your account every 24 hours to claim your daily allocation.</li>
              <li><strong>Social Promotions:</strong> Participating in sponsor-approved social media giveaways or Discord events.</li>
              <li><strong>As a Free Bonus:</strong> Participating in optional Gold Coin purchases may yield complimentary ST as a free bonus.</li>
              <li>
                <strong className="text-primary">Alternative Method of Entry (Mail-in Request):</strong>
                <p className="mt-2 pl-4 border-l-2 border-primary/50 text-sm">
                  To receive Sweep Tokens without making any purchase, a Participant must send a blank, unlined 4"x6" postcard inside a stamped #10 envelope containing their fully handwritten (not typed or photocopied) details in block lettering:
                  <br/><br/>
                  1. Full Name<br/>
                  2. VAULT0X Username or Wallet Address<br/>
                  3. Email Address<br/>
                  4. The statement: "I wish to receive Sweep Tokens to participate in the VAULT0X promotions. I agree to be bound by the Official Rules."<br/>
                  <br/>
                  Mail to:<br/>
                  VAULT0X Sweepstakes AMOE<br/>
                  123 Crypto Boulevard, Suite 500<br/>
                  Decentralized City, DC 00000
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Each valid AMOE request receives 5 Sweep Tokens. One request per outer envelope.</p>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">5. Redemption of Sweep Tokens</h2>
            <p>
              Sweep Tokens must be played through games on the platform at least once (1x playthrough requirement) before they are eligible for redemption. Minimum redemption thresholds apply. All redemptions are subject to strict AML/KYC verification.
            </p>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
};

export default SweepstakesRules;
