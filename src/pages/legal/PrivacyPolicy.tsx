import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-border/50 pb-6">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold gold-text">Privacy Policy</h1>
          <p className="text-muted-foreground mt-1">Safeguarding your data.</p>
        </div>
      </div>

      <ScrollArea className="h-[70vh] rounded-xl border border-border/50 bg-card/30 p-8 glass-card">
        <div className="space-y-8 text-foreground/80 leading-relaxed max-w-none">
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">1. Information We Collect</h2>
            <p className="mb-4">VAULT0X collects information in order to provide our social gaming platform efficiently and meet legal obligations:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contact Information:</strong> Email address, name, physical address, and telephone number.</li>
              <li><strong>Identity Documents:</strong> Government-issued ID, utility bills, or bank statements for identity verification (KYC).</li>
              <li><strong>Technical Data:</strong> IP addresses, browser types, device fingerprints, and gaming history.</li>
              <li><strong>Financial Data:</strong> Web3 Wallet addresses and connected transaction histories.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>
              Your data is strictly utilized to operate and improve the VAULT0X platform. We use it to process virtual currency purchases, redeem prizes, run anti-fraud checks, provide customer support, and ensure you are legally eligible to play.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">3. Data Sharing and Third Parties</h2>
            <p>
              VAULT0X does not sell your personal data. We may share it with verified third-party vendors who require it to perform specific functions (such as payment processors, KYC verification partners, and anti-bot security analysts). We may also disclose data to law enforcement to comply with a valid subpoena or court order.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">4. Security Measures</h2>
            <p>
              We implement industry-standard cryptographic practices. Data in transit is secured via TLS 1.3, and sensitive data at rest is encrypted using AES-256. While we strive to use commercially acceptable means to protect your personal information, no method of transmission is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">5. Your Rights</h2>
            <p>
              Residents of certain jurisdictions may have specific rights regarding their data (such as GDPR or CCPA). You may request access to, correction of, or deletion of your personal data by contacting privacy@vault0x.io. Please note that data required for AML/KYC compliance or fraud prevention may be retained despite deletion requests as permitted by law.
            </p>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
};

export default PrivacyPolicy;
