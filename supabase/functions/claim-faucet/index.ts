import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check last claim
    const { data: lastClaim, error: claimError } = await supabaseAdmin
      .from("transactions")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("type", "faucet")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claimError) throw claimError;

    if (lastClaim) {
      const lastClaimTime = new Date(lastClaim.created_at).getTime();
      const now = Date.now();
      const cooldown = 24 * 60 * 60 * 1000;
      if (now - lastClaimTime < cooldown) {
        return new Response(JSON.stringify({ error: "Faucet cooldown active", timeLeft: cooldown - (now - lastClaimTime) }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert transaction to securely lock claim
    const { error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "faucet",
        currency: "GC",
        amount: 1000,
        status: "completed"
      });

    if (txError) throw txError;
    
    // Read and Write Balance
    const { data: balances, error: balError } = await supabaseAdmin
      .from("balances")
      .select("gold_coins, sweep_tokens")
      .eq("user_id", user.id)
      .single();
      
    if (balError) throw balError;
    
    const { error: updateError } = await supabaseAdmin
      .from("balances")
      .update({
        gold_coins: Number(balances.gold_coins) + 1000,
        sweep_tokens: Number(balances.sweep_tokens) + 0.50
      })
      .eq("user_id", user.id);
      
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, reward: { gold_coins: 1000, sweep_tokens: 0.50 } }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
