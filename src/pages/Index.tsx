import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GameLobby from "@/components/GameLobby";
import HowItWorks from "@/components/HowItWorks";
import RecentWinners from "@/components/RecentWinners";
import Footer from "@/components/Footer";
import DailyBonus from "@/components/DailyBonus";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <GameLobby />
      <HowItWorks />
      <RecentWinners />
      <Footer />
      <DailyBonus />
    </div>
  );
};

export default Index;
