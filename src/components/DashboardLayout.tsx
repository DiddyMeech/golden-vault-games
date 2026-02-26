import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import LiveChatSidebar from "@/components/LiveChatSidebar";
import { BalanceBar } from "@/components/BalanceBar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen w-full relative">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <h2 className="text-sm font-medium text-muted-foreground hidden lg:block">VAULT0X</h2>
            <div className="ml-auto">
              <BalanceBar />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>
      {/* Global Live Chat Sidebar (hidden on very small screens, responsive) */}
      <div className="hidden xl:block">
        <LiveChatSidebar />
      </div>
    </div>
  );
};

export default DashboardLayout;
