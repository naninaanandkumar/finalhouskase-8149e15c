import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  User,
  Search,
  ArrowLeft,
  Clock,
  Check,
  CheckCheck,
  ShoppingCart,
  FileText,
  Package,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  is_active: boolean | null;
  buyer_profile?: {
    full_name: string | null;
    company_name: string | null;
    email: string;
  };
  unread_count?: number;
}

// Predefined quick reply templates (IndiaMART style)
const quickReplyTemplates = [
  { 
    icon: ShoppingCart, 
    label: "Order Inquiry", 
    message: "I would like to inquire about my recent order. Can you please provide an update?" 
  },
  { 
    icon: XCircle, 
    label: "Cancel Order", 
    message: "I would like to request cancellation of my order. Please guide me through the process." 
  },
  { 
    icon: Package, 
    label: "Track Shipment", 
    message: "Could you please provide tracking information for my shipment?" 
  },
  { 
    icon: FileText, 
    label: "Invoice Request", 
    message: "I need a copy of the invoice for my recent purchase. Can you please send it?" 
  },
  { 
    icon: HelpCircle, 
    label: "General Query", 
    message: "I have a query regarding your products/services. Can you please help?" 
  },
];

export default function AdminChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations with buyer info
  const fetchConversations = async () => {
    try {
      const { data: convData, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Fetch buyer profiles
      if (convData && convData.length > 0) {
        const buyerIds = [...new Set(convData.map(c => c.buyer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, company_name, email")
          .in("user_id", buyerIds);

        const conversationsWithProfiles = convData.map(conv => ({
          ...conv,
          buyer_profile: profiles?.find(p => p.user_id === conv.buyer_id),
        }));

        setConversations(conversationsWithProfiles);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to new conversations
    const channel = supabase
      .channel("admin-conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConversation.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
        
        // Mark messages as read
        if (data && data.length > 0) {
          const unreadIds = data
            .filter(m => !m.is_read && m.sender_id !== user?.id)
            .map(m => m.id);
          
          if (unreadIds.length > 0) {
            await Promise.all(
              unreadIds.map(id => supabase.rpc("mark_message_read", { _message_id: id }))
            );
          }
        }
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`admin-messages:${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !activeConversation || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        message: messageText.trim(),
      });

      if (error) throw error;
      
      setNewMessage("");

      // Update last_message_at
      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString(), admin_id: user.id })
        .eq("id", activeConversation.id);

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
    setIsSending(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(newMessage);
  };

  const handleQuickReply = (template: typeof quickReplyTemplates[0]) => {
    setNewMessage(template.message);
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.buyer_profile?.full_name || conv.buyer_profile?.company_name || "";
    const email = conv.buyer_profile?.email || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-5rem)]">
      <div className="flex h-full bg-card rounded-xl border border-border overflow-hidden">
        {/* Conversations List */}
        <div className={cn(
          "w-80 border-r border-border flex flex-col bg-background/50",
          activeConversation && "hidden lg:flex"
        )}>
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              Customer Chats
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-secondary/50 transition-colors",
                      activeConversation?.id === conv.id && "bg-secondary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {(conv.buyer_profile?.full_name || conv.buyer_profile?.email || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {conv.buyer_profile?.full_name || conv.buyer_profile?.company_name || "Customer"}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(conv.last_message_at || new Date()), "MMM d")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.buyer_profile?.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {conv.subject || "New conversation"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col",
          !activeConversation && "hidden lg:flex"
        )}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center gap-3 bg-background/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setActiveConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {(activeConversation.buyer_profile?.full_name || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {activeConversation.buyer_profile?.full_name || activeConversation.buyer_profile?.company_name || "Customer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.buyer_profile?.email}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(activeConversation.last_message_at || ""), "HH:mm")}
                </Badge>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                      const isAdmin = msg.sender_id === user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2",
                              isAdmin
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary text-foreground rounded-bl-md"
                            )}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              isAdmin ? "justify-end" : "justify-start"
                            )}>
                              <span className={cn(
                                "text-xs",
                                isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {format(new Date(msg.created_at), "HH:mm")}
                              </span>
                              {isAdmin && (
                                msg.is_read ? (
                                  <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                                ) : (
                                  <Check className="h-3 w-3 text-primary-foreground/70" />
                                )
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-background/50">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-gradient-accent"
                    disabled={!newMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-4 bg-secondary/20">
              <div>
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Customer Support Chat</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Select a conversation from the list to start chatting with customers.
                  Quick reply templates are available for common inquiries.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
