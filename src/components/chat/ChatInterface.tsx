import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, User, ArrowLeft, Plus, Headset, ShoppingCart, XCircle, Package, FileText, HelpCircle, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const quickReplyTemplates = [
  { icon: ShoppingCart, label: "Order Inquiry", message: "I would like to inquire about my recent order. Can you please provide an update?" },
  { icon: XCircle, label: "Cancel Order", message: "I would like to request cancellation of my order. Please guide me through the process." },
  { icon: Package, label: "Track Shipment", message: "Could you please provide tracking information for my shipment?" },
  { icon: FileText, label: "Invoice Request", message: "I need a copy of the invoice for my recent purchase. Can you please send it?" },
  { icon: HelpCircle, label: "General Query", message: "I have a query regarding your products/services. Can you please help?" },
];

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  buyer_id: string;
  admin_id: string | null;
  subject: string | null;
  last_message_at: string;
}

export function ChatInterface() {
  const { user, profile, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Conversations list with realtime live updates
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      let query = supabase
        .from("chat_conversations")
        .select("id, buyer_id, admin_id, subject, last_message_at")
        .order("last_message_at", { ascending: false });
      if (!isAdmin) query = query.eq("buyer_id", user.id);
      const { data, error } = await query;
      if (!error) setConversations(data || []);
    };
    fetchConversations();

    const channel = supabase
      .channel(`conv-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
        fetchConversations();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin]);

  // Active conversation: messages + typing
  useEffect(() => {
    if (!activeConversation || !user) return;
    setOtherTyping(false);

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConversation)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      // Mark inbound as read
      (data || [])
        .filter((m) => m.sender_id !== user.id && !m.is_read)
        .forEach((m) => { supabase.rpc("mark_message_read", { _message_id: m.id }); });
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversation}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase.rpc("mark_message_read", { _message_id: msg.id });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversation}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    // Typing broadcast channel (separate so we don't conflict with postgres_changes)
    const typingCh = supabase
      .channel(`typing-${activeConversation}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== user.id) {
          setOtherTyping(true);
          if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current);
          otherTypingTimerRef.current = setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe();
    typingChannelRef.current = typingCh;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingCh);
      typingChannelRef.current = null;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current);
    };
  }, [activeConversation, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const broadcastTyping = () => {
    if (!typingChannelRef.current || !user) return;
    typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: user.id } });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    broadcastTyping();
    typingTimerRef.current = setTimeout(() => {}, 1500);
  };

  const createConversation = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ buyer_id: user.id, subject: "New inquiry" })
      .select()
      .single();
    if (!error && data) {
      setConversations((prev) => [data, ...prev]);
      setActiveConversation(data.id);
    }
  };

  const sendMessage = async (e: React.FormEvent, override?: string) => {
    e.preventDefault();
    const text = (override ?? newMessage).trim();
    if (!text || !activeConversation || !user) return;
    setIsLoading(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: activeConversation,
      sender_id: user.id,
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");

    const { data, error } = await supabase.from("chat_messages").insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      message: text,
    }).select().single();
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
      supabase.from("chat_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", activeConversation);
    }
    setIsLoading(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-muted-foreground">Please login to use chat.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)] min-h-[450px] bg-card rounded-xl border border-border overflow-hidden">
      {/* Conversations List */}
      <div className={cn(
        "w-full sm:w-80 border-r border-border flex flex-col",
        activeConversation && "hidden sm:flex"
      )}>
        <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            Messages
          </h3>
          {!isAdmin && (
            <Button size="sm" variant="outline" onClick={createConversation}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No conversations yet</p>
              {!isAdmin && (
                <Button variant="link" className="mt-2" onClick={createConversation}>
                  Start a conversation
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={cn(
                    "w-full p-3 sm:p-4 text-left hover:bg-secondary/50 transition-colors",
                    activeConversation === conv.id && "bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{conv.subject || "Conversation"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conv.last_message_at), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !activeConversation && "hidden sm:flex"
      )}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-border flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden flex-shrink-0"
                onClick={() => setActiveConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Headset className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {isAdmin ? "Customer Support" : "Support Team"}
                </p>
                <p className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  {otherTyping ? "typing…" : "Online"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3 sm:p-4">
              <div className="space-y-3 sm:space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}
                      >
                        {!isOwn && (
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Headset className="h-3.5 w-3.5" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] sm:max-w-[65%] rounded-2xl px-3 py-2 sm:px-4",
                            isOwn
                              ? "bg-shop text-shop-foreground rounded-br-md"
                              : "bg-secondary text-foreground rounded-bl-md"
                          )}
                        >
                          <p className="text-sm break-words">{msg.message}</p>
                          <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                            <p className={cn("text-[10px] sm:text-xs", isOwn ? "text-shop-foreground/70" : "text-muted-foreground")}>
                              {format(new Date(msg.created_at), "HH:mm")}
                            </p>
                            {isOwn && (
                              msg.is_read ? (
                                <CheckCheck className="h-3 w-3 text-blue-300" />
                              ) : (
                                <Check className="h-3 w-3 text-shop-foreground/70" />
                              )
                            )}
                          </div>
                        </div>
                        {isOwn && (
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || "You"} />}
                            <AvatarFallback className="bg-shop/20 text-foreground text-xs">
                              {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {otherTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-end gap-2 justify-start"
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Headset className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Replies */}
            <div className="px-3 sm:px-4 py-2 border-t border-border bg-secondary/30">
              <p className="text-[11px] text-muted-foreground mb-1.5">Quick Replies:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickReplyTemplates.map((tpl, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 px-2"
                    onClick={() => setNewMessage(tpl.message)}
                  >
                    <tpl.icon className="h-3 w-3 mr-1" />
                    {tpl.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-gradient-accent flex-shrink-0"
                  disabled={!newMessage.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
