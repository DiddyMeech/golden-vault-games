import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { supabase } from '../utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Wallet } from 'lucide-react';

const WalletLogin: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleUserLogin = useCallback(async (walletAddress: string) => {
    try {
      // Check if user exists in Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'Row not found'
        console.error("Error fetching user data:", error);
        return;
      }

      if (!data) {
        // User does not exist, create a new record
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            { 
               wallet_address: walletAddress,
               name: `User_${walletAddress.substring(0,6)}`,
               balance: 100 // Starting balance as per your spec
            }
          ]);
          
        if (insertError) {
          console.error("Error creating new user:", insertError);
        }
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      try {
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await handleUserLogin(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    }
  }, [handleUserLogin]);

  useEffect(() => {
    // Check if wallet is already connected
    checkConnection();
  }, [checkConnection]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsConnecting(true);
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];
        
        setAccount(walletAddress);
        await handleUserLogin(walletAddress);
        
        toast({
          title: "Wallet Connected",
          description: `Successfully connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`,
        });
      } catch (error: unknown) {
        console.error("Error connecting wallet:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not connect to wallet. Please try again.";
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: errorMessage,
        });
      } finally {
        setIsConnecting(false);
      }
    } else {
      toast({
        variant: "destructive",
        title: "MetaMask Not Found",
        description: "Please install MetaMask to use this feature.",
      });
      console.log('Please install MetaMask!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-xl border-accent/20 border-2 shadow-xl shrink-0 w-full max-w-sm mx-auto">
      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8 text-accent" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Web3 Wallet Login</h2>
      
      {account ? (
        <div className="text-center w-full">
          <p className="text-sm text-muted-foreground mb-4">Connected Account:</p>
          <div className="bg-background px-4 py-3 rounded-lg border text-sm truncate font-mono mb-4 text-emerald-400">
             {account}
          </div>
          <Button 
            variant="outline" 
            className="w-full text-white hover:text-white"
            onClick={() => {
              setAccount(null);
            }}
          >
            Disconnect locally
          </Button>
        </div>
      ) : (
        <div className="text-center w-full">
          <p className="text-sm text-muted-foreground mb-6">
            Connect your MetaMask wallet to access Golden Vault Games.
          </p>
          <Button 
            onClick={connectWallet} 
            disabled={isConnecting}
            className="w-full bg-[#f6851b] hover:bg-[#e2761b] text-white font-bold h-12 text-lg transition-all"
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WalletLogin;
