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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch last_rain config
    const { data: configData, error: configError } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", "last_rain")
      .single();

    if (configError && configError.code !== 'PGRST116') throw configError;

    const lastRainMs = configData?.value?.timestamp || 0;
    const now = Date.now();
    const cooldown = 60 * 60 * 1000; // 60 minutes

    if (now - lastRainMs < cooldown) {
      return new Response(JSON.stringify({ error: "Rain cooldown active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch active chat users in last 15 minutes
    const fifteenMinsAgo = new Date(now - 15 * 60 * 1000).toISOString();
    
    // We get all messages in last 15 mins to find distinct users
    const { data: msgs, error: msgError } = await supabaseAdmin
      .from("chat_messages")
      .select("user_id")
      .gte("created_at", fifteenMinsAgo);

    if (msgError) throw msgError;

    if (!msgs || msgs.length === 0) {
      // Still update config to prevent immediate retry if chat is dead
      await supabaseAdmin.from("system_config").upsert({ key: "last_rain", value: { timestamp: now } });
      return new Response(JSON.stringify({ success: true, message: "No active users found for rain." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract unique user IDs
    const uniqueUsers = Array.from(new Set(msgs.map(m => m.user_id)));
    
    // Shuffle and pick up to 10 winners
    const shuffled = uniqueUsers.sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, 10);

    const totalDropST = 1.0;
    const splitAmount = parseFloat((totalDropST / winners.length).toFixed(4));

    // 3. Process rewards for winners
    for (const uid of winners) {
      // 3a. Record transaction
      await supabaseAdmin.from("transactions").insert({
        user_id: uid,
        type: "rain",
        currency: "ST",
        amount: splitAmount,
        status: "completed"
      });

      // 3b. Update balance (Read then Write)
      const { data: bal } = await supabaseAdmin.from("balances").select("sweep_tokens").eq("user_id", uid).single();
      if (bal) {
        await supabaseAdmin.from("balances").update({
          sweep_tokens: Number(bal.sweep_tokens) + splitAmount
        }).eq("user_id", uid);
      }
    }

    // 4. Update last_rain
    await supabaseAdmin.from("system_config").upsert({ key: "last_rain", value: { timestamp: now } });

    // 5. Broadcast generic system message to channel (Optional, handled better directly via UI listening to transactions)
    // The UI can just listen to transactions with type=rain, or we send a precise realtime broadcast.
    await supabaseAdmin.channel('live_chat').send({
      type: 'broadcast',
      event: 'system_rain',
      payload: { amount: totalDropST, winners: winners.length, splitAmount }
    });

    return new Response(
      JSON.stringify({ success: true, dropped: totalDropST, winners: winners.length, splitAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
