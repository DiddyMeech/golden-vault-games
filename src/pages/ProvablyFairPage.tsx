import { motion } from "framer-motion";
import { Shield, Lock, Hash, CheckCircle, Copy, RefreshCw, Calculator, FileCheck } from "lucide-react";
import { useState } from "react";

// Web Crypto API hash helpers
async function getHashOfSeed(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(seed));
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateHMAC(serverSeed: string, clientSeed: string, nonce: number): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(serverSeed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${clientSeed}:${nonce}`)
  );
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getFloatFromHash(hash: string): number {
  const hex = hash.substring(0, 8);
  const intVal = parseInt(hex, 16);
  return intVal / 4294967296; 
}

interface VerificationResults {
  serverSeedHash: string;
  gameHash: string;
  floatVal: string;
  crash: string;
  limbo: string;
  dice: string;
  slots: string;
}

const ProvablyFairPage = () => {
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState(1);
  const [results, setResults] = useState<VerificationResults | null>(null);

  const verifyOutcome = async () => {
    if (!serverSeed || !clientSeed) return;
    
    const serverSeedHash = await getHashOfSeed(serverSeed);
    const gameHash = await generateHMAC(serverSeed, clientSeed, nonce);
    const floatVal = getFloatFromHash(gameHash);
    
    const HOUSE_EDGE = 0.03;
    const e = 1 / (1 - HOUSE_EDGE);
    
    const crash = Math.max(1, floatVal < (1 / e) ? 1 : Math.floor((e / (e - 1) / floatVal) * 100) / 100);
    const limbo = 0.97 / floatVal < 1 ? 1 : Math.floor((0.97 / floatVal) * 100) / 100;
    const dice = Math.floor(floatVal * 10001) / 100;

    const TOTAL_WEIGHT = 49;
    const slotsNum = Math.floor(floatVal * Math.pow(TOTAL_WEIGHT, 3));
    const r1 = slotsNum % TOTAL_WEIGHT;
    const r2 = Math.floor(slotsNum / TOTAL_WEIGHT) % TOTAL_WEIGHT;
    const r3 = Math.floor(slotsNum / (TOTAL_WEIGHT * TOTAL_WEIGHT)) % TOTAL_WEIGHT;

    const SYMBOL_TABLE = [
      { symbol: "💎", weight: 1 },
      { symbol: "7️⃣", weight: 3 },
      { symbol: "🔔", weight: 5 },
      { symbol: "🍒", weight: 8 },
      { symbol: "⭐", weight: 12 },
      { symbol: "🪙", weight: 20 },
    ];
    
    const getSymbolByRoll = (roll: number) => {
      for (const entry of SYMBOL_TABLE) {
        roll -= entry.weight;
        if (roll < 0) return entry.symbol;
      }
      return SYMBOL_TABLE[SYMBOL_TABLE.length - 1].symbol;
    };
    const slotsResult = [getSymbolByRoll(r1), getSymbolByRoll(r2), getSymbolByRoll(r3)].join(" ");

    setResults({
      serverSeedHash,
      gameHash,
      floatVal: floatVal.toFixed(8),
      crash: crash.toFixed(2) + "x",
      limbo: limbo.toFixed(2) + "x",
      dice: dice.toFixed(2),
      slots: slotsResult
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold gold-text tracking-tight animate-shimmer">Provably Fair</h1>
        </div>
        <p className="text-muted-foreground">Every game on VAULT0X is cryptographically verifiable via HMAC-SHA256 signature logic. You can independently prove that no outcome was manipulated.</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Lock, title: "Server Seed", desc: "Before each game, we generate a secret server seed and show you its SHA-256 hash to prove it was generated fairly." },
          { icon: Hash, title: "Client Seed", desc: "You provide your own random seed (or use ours). This ensures we cannot predict your outcome from our backend alone." },
          { icon: CheckCircle, title: "Verification", desc: "After each game, we reveal the Unhashed Server Seed. Combine both seeds with the nonce into HMAC-SHA256 to verify." },
        ].map((step, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card gold-border-glow rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
                <step.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2 text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Verification Form */}
        <div className="glass-card gold-border-glow rounded-xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" /> HMAC-SHA256 Verifier
          </h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="pf-server-seed" className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Unhashed Server Seed</label>
              <input id="pf-server-seed" type="text" placeholder="Provided to you after the game session..." value={serverSeed} onChange={(e) => setServerSeed(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30" />
            </div>
            <div>
              <label htmlFor="pf-client-seed" className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Client Seed</label>
              <input id="pf-client-seed" type="text" placeholder="Your Client Seed..." value={clientSeed} onChange={(e) => setClientSeed(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30" />
            </div>
            <div>
              <label htmlFor="pf-nonce" className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Nonce</label>
              <input id="pf-nonce" type="number" min="1" value={nonce} onChange={(e) => setNonce(parseInt(e.target.value) || 1)}
                className="w-full md:w-1/3 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={verifyOutcome}
              className="w-full mt-4 gold-shimmer-btn font-bold py-3.5 px-6 rounded-xl gold-glow shadow-lg flex items-center justify-center gap-2">
              <Calculator className="w-5 h-5" /> Calculate Provably Fair Matrix
            </motion.button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="glass-card gold-border-glow rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-black/40 xl:bg-transparent -z-10" />
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2 relative z-10">
                <FileCheck className="w-5 h-5 text-primary" /> Cryptographic Matrix Output
            </h2>
            
            {!results ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-6 relative z-10">
                    <Hash className="w-12 h-12 mb-4 text-primary opacity-50" />
                    <p className="text-sm">Input the seeds and click Calculate to view mathematical outcomes.</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 relative z-10">
                    <div className="p-3.5 rounded-xl bg-background border border-border/50">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Pre-Game SHA-256 Server Seed Hash</div>
                        <div className="font-mono text-xs break-all text-primary">{results.serverSeedHash}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-background border border-border/50">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Final HMAC-SHA256 Game Hash</div>
                        <div className="font-mono text-xs break-all text-foreground">{results.gameHash}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3.5 rounded-xl bg-background border border-border/50 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Derived Hex Float</span>
                            <span className="font-mono text-sm text-primary font-bold">{results.floatVal}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-background border border-border/50 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Crash / Limbo Multiplier</span>
                            <span className="font-mono text-sm text-foreground font-bold">{results.crash} ({results.limbo})</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-background border border-border/50 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Dice Roll (0-100)</span>
                            <span className="font-mono text-sm text-foreground font-bold">{results.dice}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-background border border-border/50 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Slots Match Payload</span>
                            <span className="font-medium text-lg text-foreground tracking-widest">{results.slots}</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProvablyFairPage;
