import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthBalance } from "@/contexts/AuthBalanceContext";
import { Send, Users, CloudRain, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  is_vip: boolean;
  message: string;
  created_at: string;
  type?: "system_rain" | "normal";
}

const LiveChatSidebar = () => {
  const { user } = useAuthBalance();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(1);
  const [rainTimer, setRainTimer] = useState("60:00");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial messages
  useEffect(() => {
    const fetchChat = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (data) {
        setMessages(data.reverse());
      }
    };
    fetchChat();
  }, []);

  // 2. Subscribe to realtime chat
  useEffect(() => {
    const chatChannel = supabase.channel("live_chat");

    chatChannel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
        // Scroll to bottom
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      })
      .on("broadcast", { event: "system_rain" }, (payload) => {
        const p = payload.payload;
        setMessages((prev) => [
          ...prev, 
          { 
            id: `rain-${Date.now()}`, 
            user_id: "system", 
            username: "Vault Bot", 
            is_vip: false,
            message: `🌧️ Rain dropped ${p.amount} ST to ${p.winners} active users! (${p.splitAmount} ST each)`,
            created_at: new Date().toISOString(),
            type: "system_rain"
          }
        ]);
        setTimeout(() => listRef.current?.scrollToItem(messages.length + 1), 100);
      });

    // 3. Presence for online count
    chatChannel
      .on("presence", { event: "sync" }, () => {
        const state = chatChannel.presenceState();
        setOnlineCount(Math.max(1, Object.keys(state).length * 8 + Math.floor(Math.random() * 20))); // Pseudo multiplier for global feel
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await chatChannel.track({ user: user?.id || "guest", online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [user]);

  // Rain Timer
  useEffect(() => {
    const fetchRain = async () => {
      const { data } = await supabase.from("system_config").select("value").eq("key", "last_rain").maybeSingle();
      if (data && data.value) {
        let last = data.value.timestamp;
        const interval = setInterval(() => {
          const diff = last + 60 * 60 * 1000 - Date.now();
          if (diff <= 0) {
            setRainTimer("00:00");
            // Auto invoke rain edge function when timer hits 0
            if (user) supabase.functions.invoke("trigger-rain");
            last = Date.now(); // Reset optimistic
          } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setRainTimer(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    };
    fetchRain();
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    const msg = input.trim();
    setInput("");

    // Grab profile username
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
    const uname = profile?.username || `User...${user.id.substring(user.id.length - 4)}`;

    // Handle /tip command
    if (msg.startsWith("/tip ")) {
      const parts = msg.split(" ");
      if (parts.length >= 3) {
        const targetUsername = parts[1].replace("@", "");
        const amount = parseInt(parts[2].replace(/,/g, ""));
        
        if (!isNaN(amount) && amount > 0) {
          try {
            // Find target user
            const { data: targetProfile, error: profileErr } = await supabase.from("profiles").select("id").eq("username", targetUsername).single();
            if (targetProfile && !profileErr && targetProfile.id !== user.id) {
               // Get sender balance
               const { data: senderBal } = await supabase.from("balances").select("gold_coins").eq("user_id", user.id).single();
               
               if (senderBal && Number(senderBal.gold_coins) >= amount) {
                   // Calculate new balances
                   const newSenderBal = Number(senderBal.gold_coins) - amount;
                   // Deduct from sender
                   await supabase.from("balances").update({ gold_coins: newSenderBal }).eq("user_id", user.id);
                   
                   // Get and update receiver balance
                   const { data: recvBal } = await supabase.from("balances").select("gold_coins").eq("user_id", targetProfile.id).single();
                   if (recvBal) {
                      const newRecvBal = Number(recvBal.gold_coins) + amount;
                      await supabase.from("balances").update({ gold_coins: newRecvBal }).eq("user_id", targetProfile.id);
                      
                      // Broadcast system tip message
                      await supabase.from("chat_messages").insert({
                         user_id: "system",
                         username: "Vault Bot",
                         message: `💸 ${uname} tipped @${targetUsername} ${amount.toLocaleString()} GC!`,
                         is_vip: false,
                         type: "system_rain"
                      });
                      return; // Don't send the original slash command text
                   }
               } else {
                  // Not enough balance, mock a local ephemeral error message to the sender only
                  setMessages(prev => [...prev, { id: Date.now().toString(), user_id: 'system', username: 'System', is_vip: false, message: 'Insufficient balance for tip.', created_at: new Date().toISOString(), type: 'system_rain' }]);
                  return;
               }
            } else {
               setMessages(prev => [...prev, { id: Date.now().toString(), user_id: 'system', username: 'System', is_vip: false, message: 'User not found or invalid target.', created_at: new Date().toISOString(), type: 'system_rain' }]);
               return;
            }
          } catch (e) {
             console.error("Tip processing error", e);
             return;
          }
        }
      }
    }

    // Normal message handling
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      username: uname,
      message: msg,
      is_vip: false // To be tied to VIP logic
    });
  };

  return (
    <div className="w-80 border-l border-border bg-background/95 backdrop-blur-xl flex flex-col h-full right-0 top-0 sticky z-30 shadow-2xl">
      {/* Header */}
      <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/30">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground">Global Chat</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {onlineCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md border border-primary/20" title="Next Rain Drop">
          <CloudRain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono font-bold gold-text">{rainTimer}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 bg-background/50 relative">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No messages yet. Say hi!
          </div>
        ) : (
          <div 
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto chat-scrollbar flex flex-col px-2 py-3"
          >
            {messages.map((msg, idx) => {
              const isSystem = msg.type === "system_rain" || msg.user_id === "system";
              return (
                <div key={msg.id || idx} className="py-1 text-sm">
                  <div className={`rounded-lg p-2 ${isSystem ? "bg-primary/20 border border-primary/30" : "bg-card/50"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isSystem && <CloudRain className="w-3 h-3 text-primary" />}
                      {msg.is_vip && <ShieldCheck className="w-3 h-3 text-accent" />}
                      <span className={`font-bold text-xs ${isSystem ? "gold-text" : "text-muted-foreground"}`}>
                        {msg.username}
                      </span>
                      <span className="text-[9px] text-muted-foreground/50 ml-auto">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[13px] leading-snug break-words ${isSystem ? "text-primary-foreground font-medium" : "text-foreground"}`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-card border-t border-border/50">
        {!user ? (
          <div className="text-center p-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground border border-border/50">
            Login to chat and catch ST rain
          </div>
        ) : (
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say something..."
              className="w-full bg-background border border-border/50 rounded-xl pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-1.5 top-1.5 p-1.5 rounded-lg text-primary hover:bg-primary/20 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LiveChatSidebar;
