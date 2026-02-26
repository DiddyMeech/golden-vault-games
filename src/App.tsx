import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthBalanceProvider } from "@/contexts/AuthBalanceContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import DashboardLayout from "@/components/DashboardLayout";
import Lobby from "@/pages/Lobby";
import WalletModalProvider from "@/components/WalletModalProvider";
import MinesGame from "@/pages/games/MinesGame";
import TowerGame from "@/pages/games/TowerGame";
import SlotsGame from "@/pages/games/SlotsGame";
import PlinkoGame from "@/pages/games/PlinkoGame";
import CrashGame from "@/pages/games/CrashGame";
import LimboGame from "@/pages/games/LimboGame";
import DiceGame from "@/pages/games/DiceGame";
import WheelGame from "@/pages/games/WheelGame";
import WalletPage from "@/pages/WalletPage";
import VipPage from "@/pages/VipPage";
import SupportPage from "@/pages/SupportPage";
import ProvablyFairPage from "@/pages/ProvablyFairPage";
import AffiliatePage from "@/pages/AffiliatePage";
import LiveSupportBubble from "@/components/LiveSupportBubble";
import TermsOfService from "@/pages/legal/TermsOfService";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import SweepstakesRules from "@/pages/legal/SweepstakesRules";
import ResponsibleGaming from "@/pages/legal/ResponsibleGaming";
import AmlPolicy from "@/pages/legal/AmlPolicy";
import AdminPage from "@/pages/AdminPage";
import BlackjackGame from "@/pages/games/BlackjackGame";
import EuropeanRoulette from "@/pages/games/EuropeanRoulette";
import SlotMachine from "@/components/SlotMachine";

import ComplianceBanner from "@/components/ComplianceBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthBalanceProvider>
          <WalletModalProvider>
            <Toaster />
            <Sonner />
          <ComplianceBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<DashboardLayout />}>
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/games/mines" element={<MinesGame />} />
              <Route path="/games/tower" element={<TowerGame />} />
              <Route path="/games/slots" element={<SlotsGame />} />
              <Route path="/games/plinko" element={<PlinkoGame />} />
              <Route path="/games/crash" element={<CrashGame />} />
              <Route path="/games/limbo" element={<LimboGame />} />
              <Route path="/games/dice" element={<DiceGame />} />
              <Route path="/games/wheel" element={<WheelGame />} />
              <Route path="/games/blackjack" element={<BlackjackGame />} />
              <Route path="/games/roulette" element={<EuropeanRoulette />} />
              <Route path="/games/simple-slots" element={<SlotMachine />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/vip" element={<VipPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/provably-fair" element={<ProvablyFairPage />} />
              <Route path="/affiliate" element={<AffiliatePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/legal/terms" element={<TermsOfService />} />
              <Route path="/legal/privacy" element={<PrivacyPolicy />} />
              <Route path="/legal/sweepstakes" element={<SweepstakesRules />} />
              <Route path="/legal/responsible-gaming" element={<ResponsibleGaming />} />
              <Route path="/legal/aml-kyc" element={<AmlPolicy />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <LiveSupportBubble />
          </WalletModalProvider>
        </AuthBalanceProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
