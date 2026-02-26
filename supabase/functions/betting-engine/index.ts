import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOUSE_EDGE = 0.03;

// --- Provably Fair HMAC Math Logic ---
async function generateHash(serverSeed: string, clientSeed: string, nonce: number): Promise<string> {
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
  // Use first 8 hex chars (4 bytes) to get a 32-bit int, then divide by 2^32
  const hex = hash.substring(0, 8);
  const intVal = parseInt(hex, 16);
  return intVal / 4294967296; // float from 0.0 to 0.99999999...
}

function calculateLimboMultiplier(hash: string): number {
  const h = getFloatFromHash(hash);
  const e = 1 / (1 - HOUSE_EDGE);
  // Limbo crashes at 1x if h < 1/e, otherwise it's e / (e-1) / h
  // Actually, standard Limbo multiplier is 0.99 / h (for target payout)
  const mult = 0.97 / h;
  return mult < 1 ? 1 : Math.floor(mult * 100) / 100;
}

function calculateDiceRoll(hash: string): number {
  const h = getFloatFromHash(hash);
  return Math.floor(h * 10001) / 100; // 0.00 to 100.00
}

function calculateCrashPoint(hash: string): number {
  const h = getFloatFromHash(hash);
  const e = 1 / (1 - HOUSE_EDGE);
  const crashPoint = h < (1 / e) ? 1 : Math.floor((e / (e - 1) / h) * 100) / 100;
  return Math.max(1, crashPoint);
}

// --- Main Handler ---
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user using a user-authenticated client 
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Invalid token");

    const { action, ...params } = await req.json();

    if (action === "place_bet") {
      const { amount, currency, game_type, client_seed, game_data } = params;
      if (!amount || amount <= 0) throw new Error("Invalid bet amount");
      if (!["gc", "st"].includes(currency)) throw new Error("Invalid currency");

      // Generate Server Seed
      const serverSeedBuf = new Uint8Array(32);
      crypto.getRandomValues(serverSeedBuf);
      const serverSeed = Array.from(serverSeedBuf).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const encoder = new TextEncoder();
      const serverSeedHashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(serverSeed));
      const serverSeedHash = Array.from(new Uint8Array(serverSeedHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      let expectedOutcome: number | undefined = undefined;
      if (game_type === "crash") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         expectedOutcome = calculateCrashPoint(hash);
      } else if (game_type === "limbo") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         expectedOutcome = calculateLimboMultiplier(hash);
      } else if (game_type === "dice") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         expectedOutcome = calculateDiceRoll(hash);
      } else if (game_type === "wheel") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         expectedOutcome = getFloatFromHash(hash);
      } else if (game_type === "plinko") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         let plinkoPath = [];
         let r = parseInt(hash.substring(0, 16), 16);
         const rows = game_data?.rows || 16;
         for(let i=0; i<rows; i++) {
            plinkoPath.push( (r & (1<<i)) ? 1 : 0 );
         }
         let sum = 0;
         for(let i=0; i<rows; i++) sum += plinkoPath[i];
         expectedOutcome = sum;
      } else if (game_type === "slots") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         expectedOutcome = getFloatFromHash(hash);
      } else if (game_type === "tower") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         expectedOutcome = getFloatFromHash(hash);
      } else if (game_type === "mines") {
         const hash = await generateHash(serverSeed, client_seed || "default_seed", 1);
         expectedOutcome = getFloatFromHash(hash);
      }

      // Use RPC atomically
      const { data: sessionData, error: sessionError } = await anonClient.rpc("place_bet_and_update_balance", {
        p_amount: amount,
        p_currency: currency,
        p_game_type: game_type,
        p_server_seed: serverSeed,
        p_server_seed_hash: serverSeedHash,
        p_client_seed: client_seed || "default_seed"
      });

      if (sessionError) throw sessionError;

      return new Response(JSON.stringify({ 
        session_id: sessionData.session_id, 
        server_seed_hash: serverSeedHash,
        expected_outcome: expectedOutcome
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "resolve_game") {
      const { session_id, target_multiplier, game_data } = params; // For interactive games or claims

      // Must use Service Role to fetch session & bypass restrictions
      const { data: session } = await supabase.from("game_sessions").select("*").eq("id", session_id).eq("user_id", user.id).single();
      if (!session || session.status !== "active") throw new Error("Invalid session");

      const hash = await generateHash(session.server_seed, session.client_seed, session.incrementing_nonce || 1);
      
      let finalMultiplier = 0;
      let won = false;
      const gameType = session.game_type as string;

      if (gameType === "limbo") {
        const actualMultiplier = calculateLimboMultiplier(hash);
        if (actualMultiplier >= target_multiplier) {
          won = true;
          finalMultiplier = target_multiplier;
        }
      } else if (gameType === "dice") {
        const actualRoll = calculateDiceRoll(hash);
        // game_data should contain { condition: 'over'|'under', target: number }
        const { condition, target } = game_data || { condition: 'over', target: 50 };
        const isWin = condition === 'over' ? actualRoll > target : actualRoll < target;
        if (isWin) {
          won = true;
          // Payout formula for dice (incorporating 3% edge): (100 / winChance) * 0.97
          const winChance = condition === 'over' ? 100 - target : target;
          finalMultiplier = Math.floor((100 / Math.max(0.01, winChance)) * 0.97 * 100) / 100;
        }
      } else if (gameType === "crash") {
        const actualCrash = calculateCrashPoint(hash);
        if (target_multiplier <= actualCrash) {
          won = true;
          finalMultiplier = target_multiplier;
        } else {
          finalMultiplier = 0; // crashed before cashout
        }
      } else if (gameType === "wheel") {
        // Evaluate segment from client via game_data segments length
        const segments = game_data?.segments || 10;
        const h = getFloatFromHash(hash);
        const landingIdx = Math.floor(h * segments);
        // Here we just return the random hash float so the client can map it uniformly
        // Ideally, edge calculates the exact multiplier, but Wheel configure segments dynamically on frontend.
        // For security, Wheel should pass array of multipliers.
        if (game_data?.multipliers && Array.isArray(game_data.multipliers)) {
           finalMultiplier = game_data.multipliers[landingIdx] || 0;
           won = finalMultiplier > 0;
        } else {
           throw new Error("Missing wheel multipliers");
        }
      } else if (gameType === "plinko") {
        // Path derivation: Plinko drops over rows. Each row is L or R.
        // We can just get 16 bits of entropy.
        let plinkoPath = [];
        let r = parseInt(hash.substring(0, 16), 16);
        for(let i=0; i<16; i++) {
            plinkoPath.push( (r & (1<<i)) ? 1 : 0 );
        }
        // sum = number of Right drops. 
        // Client can calculate multiplier from sum. But server needs to know it.
        // So client passes risk and rows, server has hardcoded payouts? No, too hard to hardcode all arrays here.
        // For now, if client passes the array of payouts based on bucket, server securely calcs bucket.
        const rows = game_data?.rows || 16;
        let sum = 0;
        for(let i=0; i<rows; i++) sum += plinkoPath[i];
        if (game_data?.payouts && Array.isArray(game_data.payouts)) {
            finalMultiplier = game_data.payouts[sum] || 0;
            won = finalMultiplier > 0;
        } else {
            throw new Error("Missing plinko payouts");
        }
      } else if (gameType === "slots") {
        const TOTAL_WEIGHT = 49;
        const h1 = getFloatFromHash(hash);
        const num = Math.floor(h1 * Math.pow(TOTAL_WEIGHT, 3));
        const r1 = num % TOTAL_WEIGHT;
        const r2 = Math.floor(num / TOTAL_WEIGHT) % TOTAL_WEIGHT;
        const r3 = Math.floor(num / (TOTAL_WEIGHT * TOTAL_WEIGHT)) % TOTAL_WEIGHT;
        
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
        
        const resultStr = [getSymbolByRoll(r1), getSymbolByRoll(r2), getSymbolByRoll(r3)].join("");
        const PAYOUTS: Record<string, number> = {
          "💎💎💎": 50,
          "7️⃣7️⃣7️⃣": 25,
          "🔔🔔🔔": 15,
          "🍒🍒🍒": 10,
          "⭐⭐⭐": 8,
          "🪙🪙🪙": 5,
        };
        
        finalMultiplier = PAYOUTS[resultStr] || 0;
        won = finalMultiplier > 0;
      } else if (gameType === "tower") {
        // Enforce tower game. Target multiplier must be strictly determined by `game_data.moves`.
        // The game has 8 floors, 3 columns.
        const FLOORS = 8;
        const COLS = 3;
        const h = getFloatFromHash(hash);
        let num = Math.floor(h * Math.pow(COLS, FLOORS));
        const safeIndices = [];
        for(let i=0; i<FLOORS; i++) {
           safeIndices.push(num % COLS);
           num = Math.floor(num / COLS);
        }
        
        // game_data should include the moves user made: array of tile indices
        const moves = game_data?.moves || [];
        won = true;
        let successfulFloors = 0;
        for (let i=0; i<moves.length; i++) {
           if (moves[i] !== safeIndices[i]) {
              won = false;
              break;
           }
           successfulFloors++;
        }
        
        if (won && successfulFloors > 0 && game_data?.cashedOut) {
           finalMultiplier = Math.round((1 + successfulFloors * 0.5) * 100) / 100;
        } else {
           finalMultiplier = 0;
           won = false;
        }
      } else {
        // Fallback for games without strict PF logic yet
        finalMultiplier = target_multiplier;
        won = target_multiplier > 0;
      }

      // Actually, we must resolve securely. 
      // Use service_role to call the resolve_game_session RPC so we bypass RLS correctly
      const { data: resolveData, error: resolveError } = await supabase.rpc("resolve_game_session", {
        p_session_id: session_id,
        p_multiplier: finalMultiplier,
        p_won: won,
        p_user_id: user.id
      });

      if (resolveError) throw resolveError;

      return new Response(JSON.stringify({ 
        payout: resolveData.payout, 
        balance: resolveData.balance,
        server_seed: session.server_seed,
        final_multiplier: finalMultiplier
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_multiplier") {
      const { revealed, total_tiles, mine_count } = params;
      // Mines multiplier
      const safeTiles = total_tiles - mine_count;
      let mult = 1;
      for (let i = 0; i < revealed; i++) {
        mult *= (total_tiles - i) / (safeTiles - i);
      }
      mult *= (1 - HOUSE_EDGE);
      return new Response(JSON.stringify({ multiplier: Math.round(mult * 100) / 100 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || err.toString() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
