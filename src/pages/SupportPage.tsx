import { HelpCircle, Mail, MessageSquare } from "lucide-react";

const SupportPage = () => (
  <div className="max-w-2xl mx-auto">
    <div className="flex items-center gap-2 mb-6">
      <HelpCircle className="w-6 h-6 text-primary" />
      <h1 className="text-2xl font-bold gold-text">Support</h1>
    </div>
    <div className="space-y-4">
      <div className="glass-card gold-border-glow rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Email Support</h3>
        </div>
        <p className="text-sm text-muted-foreground">Reach us at <span className="text-primary">support@vaultgames.com</span> — typical response within 24 hours.</p>
      </div>
      <div className="glass-card gold-border-glow rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Live Chat</h3>
        </div>
        <p className="text-sm text-muted-foreground">Live chat available 24/7 for VIP members. Standard members: 9 AM – 9 PM UTC.</p>
      </div>
    </div>
  </div>
);

export default SupportPage;
