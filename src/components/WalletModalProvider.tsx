import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import WalletLogin from "@/components/WalletLogin";

const WalletModalProvider = ({ children }: { children: React.ReactNode }) => {
  const { isWalletModalOpen, closeWalletModal } = useAuthBalance();

  return (
    <>
      {children}
      <Dialog open={isWalletModalOpen} onOpenChange={(open) => !open && closeWalletModal()}>
        <DialogContent className="sm:max-w-md bg-transparent border-none p-0">
          <DialogTitle className="sr-only">Connect Wallet</DialogTitle>
          <WalletLogin />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletModalProvider;
