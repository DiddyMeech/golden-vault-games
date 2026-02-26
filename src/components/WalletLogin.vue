<template>
  <div class="wallet-login">
    <h2>Web3 Wallet Login</h2>
    <div v-if="account" class="connected-account">
      <p>Connected Account:</p>
      <div class="account-address">{{ account }}</div>
      <button @click="disconnect" class="disconnect-btn">Disconnect</button>
    </div>
    <div v-else class="connect-prompt">
      <p>Connect your MetaMask wallet to access Golden Vault Games.</p>
      <button
        @click="connectWallet"
        :disabled="isConnecting"
        class="connect-btn"
      >
        {{ isConnecting ? "Connecting..." : "Connect MetaMask" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Web3 from "web3";
import { supabase } from "../utils/supabaseClient";

const account = ref(null);
const isConnecting = ref(false);

const checkConnection = async () => {
  if (window.ethereum) {
    const web3 = new Web3(window.ethereum);
    try {
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        account.value = accounts[0];
        await handleUserLogin(accounts[0]);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  }
};

const connectWallet = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      isConnecting.value = true;
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      account.value = accounts[0];
      await handleUserLogin(accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      isConnecting.value = false;
    }
  } else {
    alert("Please install MetaMask!");
  }
};

const handleUserLogin = async (walletAddress) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user data:", error);
      return;
    }

    if (!data) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          wallet_address: walletAddress,
          name: `User_${walletAddress.substring(0, 6)}`,
          balance: 100,
        },
      ]);

      if (insertError) {
        console.error("Error creating new user:", insertError);
      }
    }
  } catch (err) {
    console.error("Login error:", err);
  }
};

const disconnect = () => {
  account.value = null;
};

onMounted(() => {
  checkConnection();
});
</script>

<style scoped>
.wallet-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: #1a1a1a;
  border-radius: 12px;
  border: 2px solid rgba(255, 204, 0, 0.2);
  color: white;
  max-width: 400px;
  margin: 0 auto;
}

h2 {
  color: #ffcc00;
  margin-bottom: 16px;
}

.account-address {
  background-color: #0d0d0d;
  padding: 8px 12px;
  border-radius: 8px;
  font-family: monospace;
  margin-bottom: 16px;
  word-break: break-all;
  color: #4ade80;
}

.connect-btn {
  width: 100%;
  padding: 12px;
  background-color: #f6851b;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
  transition: background-color 0.2s;
}

.connect-btn:hover {
  background-color: #e2761b;
}

.connect-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disconnect-btn {
  width: 100%;
  padding: 12px;
  background-color: transparent;
  color: white;
  border: 1px solid white;
  border-radius: 8px;
  cursor: pointer;
}
</style>
