import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClerkSupabaseClient, supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: Database['public']['Tables']['users']['Row'];
};
export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  buyer?: Database['public']['Tables']['users']['Row'];
  seller?: Database['public']['Tables']['users']['Row'];
  product?: Database['public']['Tables']['products']['Row'] & { images: string[]; metadata?: any };
  trade?: Database['public']['Tables']['trades']['Row'];
  last_message_content?: any;
  last_message_at?: string;
  last_message_sender_id?: string;
  unread_count?: number;
};

type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string }
  | { type: 'location'; latitude: number; longitude: number; label?: string }
  | { type: 'voice'; url: string; duration?: number };

interface UseChatProps {
  productId?: string | null;
  sellerId?: string | null;
  conversationId?: string | null;
  tradeId?: string | null;
}

// ─── useConversations ─────────────────────────────────────────────────────────

export function useConversations(type: "regular" | "trade", productId?: string | null) {
  const { userId, getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const fetchRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const fetchConversations = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (!userId) { setError("User not authenticated."); setLoading(false); return; }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken({});
      if (!token) throw new Error("Could not get auth token.");
      const authSupabase = createClerkSupabaseClient(token);

      let convQuery = authSupabase
        .from("conversations")
        .select(`*, buyer:users!conversations_buyer_id_fkey(*), seller:users!conversations_seller_id_fkey(*), product:products(id, title, images), trade:trades(*)`)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

      if (productId) convQuery = convQuery.eq("product_id", productId);
      if (type === "regular") {
        convQuery = convQuery.not("product_id", "is", null);
      } else {
        convQuery = convQuery.not("trade_id", "is", null);
      }

      const { data: convs, error: convError } = await convQuery.order("updated_at", { ascending: false });
      if (convError) throw convError;
      const filteredConversations = (convs || []).filter(
        (conv) => conv.buyer_id !== conv.seller_id,
      );
      if (filteredConversations.length === 0) { setConversations([]); return; }

      const conversationIds = filteredConversations.map(c => c.id);

      const { data: lastMessages, error: lastError } = await authSupabase
        .from('messages').select('conversations_id, content, created_at, sender_id')
        .in('conversations_id', conversationIds).order('created_at', { ascending: false });
      if (lastError) throw lastError;

      const { data: unreadData, error: unreadError } = await authSupabase
        .from('messages').select('conversations_id')
        .in('conversations_id', conversationIds).eq('is_read', false).neq('sender_id', userId);
      if (unreadError) throw unreadError;

      setConversations(filteredConversations.map((conv: any) => {
        const lastMsg = (lastMessages || []).find(m => m.conversations_id === conv.id);
        return {
          ...conv,
          last_message_content: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
          last_message_sender_id: lastMsg?.sender_id,
          unread_count: (unreadData || []).filter(m => m.conversations_id === conv.id).length,
        };
      }));
    } catch (err: any) {
      console.error("Error fetching conversations:", err);
      setError(err.message || "Failed to load conversations.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, type, productId]);

  useEffect(() => { fetchRef.current = fetchConversations; });

  useEffect(() => {
    fetchConversations();
  }, [userId, type, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user_conversations:${userId}:${type}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` }, () => { fetchRef.current?.(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` }, () => { fetchRef.current?.(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { fetchRef.current?.(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, type]);

  return { conversations, loading, error, refresh: fetchConversations };
}

// ─── useChat ──────────────────────────────────────────────────────────────────

export function useChat({ productId, sellerId, tradeId, conversationId: initialConversationId }: UseChatProps) {
  const { userId, getToken } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const isFetchingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  const fetchConversationAndMessages = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (!userId) { setError("User not authenticated."); setLoading(false); return; }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken({});
      if (!token) throw new Error("Could not get auth token.");
      const authSupabase = createClerkSupabaseClient(token);
      let currentConversation: Conversation | null = null;

      if (!initialConversationId && sellerId && sellerId === userId) {
        setConversation(null);
        setMessages([]);
        setError("You cannot start a chat with yourself.");
        return;
      }

      if (initialConversationId) {
        const { data, error: convError } = await authSupabase
          .from('conversations')
          .select('*, buyer:users!conversations_buyer_id_fkey(*), seller:users!conversations_seller_id_fkey(*), product:products(id, title, images, metadata), trade:trades(*)')
          .eq('id', initialConversationId).single();
        if (convError) throw convError;
        currentConversation = data as Conversation;
        if (
          currentConversation?.buyer_id &&
          currentConversation.buyer_id === currentConversation.seller_id
        ) {
          setConversation(null);
          setMessages([]);
          setError("Invalid conversation.");
          return;
        }

      } else if (productId && sellerId) {
        if (sellerId === userId) {
          setConversation(null);
          setMessages([]);
          setError("You cannot start a chat with yourself.");
          return;
        }

        const { data, error: findError } = await authSupabase
          .from('conversations')
          .select('*, buyer:users!conversations_buyer_id_fkey(*), seller:users!conversations_seller_id_fkey(*), product:products(id, title, images, metadata), trade:trades(*)')
          .eq('product_id', productId).eq('seller_id', sellerId).eq('buyer_id', userId).single();
        if (findError && findError.code !== 'PGRST116') throw findError;

        if (data) {
          currentConversation = data as Conversation;
        } else {
          const { data: newConvData, error: createError } = await authSupabase
            .from('conversations')
            .insert({ product_id: productId, seller_id: sellerId, buyer_id: userId })
            .select('*, buyer:users!conversations_buyer_id_fkey(*), seller:users!conversations_seller_id_fkey(*), product:products(id, title, images, metadata), trade:trades(*)')
            .single();
          if (createError) throw createError;
          currentConversation = newConvData as Conversation;
        }

      } else if (tradeId && sellerId) {
        if (sellerId === userId) {
          setConversation(null);
          setMessages([]);
          setError("You cannot start a chat with yourself.");
          return;
        }

        const { data, error: findError } = await authSupabase
          .from('conversations')
          .select('*, buyer:users!conversations_buyer_id_fkey(*), seller:users!conversations_seller_id_fkey(*), product:products(id, title, images, metadata), trade:trades(*)')
          .eq('trade_id', tradeId).eq('seller_id', sellerId).eq('buyer_id', userId).single();
        if (findError && findError.code !== 'PGRST116') throw findError;

        if (data) {
          currentConversation = data as Conversation;
        } else {
          const { data: newConvData, error: createError } = await authSupabase
            .from('conversations')
            .insert({ trade_id: tradeId, seller_id: sellerId, buyer_id: userId })
            .select('*, buyer:users!conversations_buyer_id_fkey(*), seller:users!conversations_seller_id_fkey(*), product:products(id, title, images, metadata), trade:trades(*)')
            .single();
          if (createError) throw createError;
          currentConversation = newConvData as Conversation;
        }
      }

      setConversation(currentConversation);

      if (currentConversation) {
        const { data: fetchedMessages, error: msgError } = await authSupabase
          .from('messages')
          .select('*, sender:users!messages_sender_id_fkey(*)')
          .eq('conversations_id', currentConversation.id)
          .order('created_at', { ascending: true });
        if (msgError) throw msgError;
        setMessages(fetchedMessages || []);
      }
    } catch (err: any) {
      console.error("Error fetching chat data:", err);
      setError(err.message || "Failed to load chat data.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, initialConversationId, productId, sellerId, tradeId]);

  useEffect(() => {
    fetchConversationAndMessages();
  }, [userId, initialConversationId, productId, sellerId, tradeId]);

  // ── Realtime: new messages ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation?.id) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase.channel(`messages:${conversation.id}`, {
      config: { 
        broadcast: { self: true },
      },
    });

    channel
      .on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversations_id=eq.${conversation.id}`,
        },
        (payload) => {
          console.log('✅ Message INSERT received:', payload.new);
          const newMsg = payload.new as Message;
          
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on<Message>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversations_id=eq.${conversation.id}`,
        },
        (payload) => {
          console.log('✅ Message DELETE received:', payload.old);
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        }
      )
      .on<Message>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversations_id=eq.${conversation.id}`,
        },
        (payload) => {
          console.log('✅ Message UPDATE received:', payload.new);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === (payload.new as Message).id ? { ...m, ...(payload.new as Message) } : m
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('📡 Channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error occurred');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [conversation?.id]);

  // ── Realtime: presence (active/online status) ─────────────────────────────
  useEffect(() => {
    if (!conversation?.id || !userId) return;
    const otherUserId = userId === conversation.buyer_id ? conversation.seller_id : conversation.buyer_id;

    const presenceChannel = supabase.channel(`presence:${conversation.id}`, {
      config: { presence: { key: userId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineKeys = Object.keys(state);
        setOtherUserOnline(onlineKeys.includes(otherUserId || ''));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key === otherUserId) setOtherUserOnline(true);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === otherUserId) setOtherUserOnline(false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [conversation?.id, userId, conversation?.buyer_id, conversation?.seller_id]);

  // ── sendMessage: optimistic ───────────────────────────────────────────────
  const sendMessage = async (content: MessageContent) => {
    if (!userId || !conversation?.id) throw new Error("Not authenticated or no conversation.");

    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: tempId,
      conversations_id: conversation.id,
      sender_id: userId,
      content: content as any,
      created_at: now,
      is_read: false,
      sender: undefined,
    } as any;
    setMessages((prev) => [...prev, optimistic]);

    try {
      const token = await getToken({});
      const authSupabase = createClerkSupabaseClient(token);
      const { data, error: sendError } = await authSupabase
        .from('messages')
        .insert({
          conversations_id: conversation.id,
          sender_id: userId,
          content: content as any,
        })
        .select('*, sender:users!messages_sender_id_fkey(*)')
        .single();

      if (sendError) throw sendError;
      
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data as Message) : m))
      );
    } catch (err: any) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      throw err;
    }
  };

  // ── deleteMessage: only own messages ─────────────────────────────────────
  const deleteMessage = async (messageId: string) => {
    if (!userId) throw new Error("Not authenticated.");
    // Optimistically remove from UI
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      const token = await getToken({});
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId); // security: can only delete own messages
      if (error) throw error;
    } catch (err: any) {
      // Refetch to restore if delete failed
      fetchConversationAndMessages();
      throw err;
    }
  };

  // ── uploadFile ────────────────────────────────────────────────────────────
  const uploadFile = async (uri: string, path: string, contentType: string): Promise<string> => {
    const token = await getToken({});
    const authSupabase = createClerkSupabaseClient(token);
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const bucket = "chat-media";
    const { data, error } = await authSupabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (error || !data) {
      throw error || new Error("Could not upload file to 'chat-media'.");
    }

    const { data: urlData } = authSupabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  // ── markMessagesAsRead ────────────────────────────────────────────────────
  const markMessagesAsRead = async () => {
    if (!userId || !conversation?.id) return;
    try {
      const token = await getToken({});
      const authSupabase = createClerkSupabaseClient(token);
      await authSupabase.from('messages').update({ is_read: true })
        .eq('conversations_id', conversation.id).neq('sender_id', userId);
      
      // Update local state immediately - mark all messages from other user as read
      setMessages(prev => prev.map(m => m.sender_id !== userId ? { ...m, is_read: true } : m));
    } catch (err: any) {
      console.error("Error marking messages as read:", err);
    }
  };

  // ── toggleMuteConversation ────────────────────────────────────────────────
  const toggleMuteConversation = async () => {
    if (!userId || !conversation?.id) return;
    try {
      const token = await getToken({});
      const authSupabase = createClerkSupabaseClient(token);
      const isBuyer = userId === conversation.buyer_id;
      const currentMuteStatus = isBuyer ? conversation.buyer_muted : conversation.seller_muted;
      const newMuted = !currentMuteStatus;

      const { data, error } = await authSupabase.functions.invoke(`chat-controls/mute/${conversation.id}`, {
        method: 'PATCH',
        body: { muted: newMuted },
      });

      if (error) throw error;
      if (data?.conversation) setConversation(data.conversation as Conversation);
    } catch (err: any) {
      console.error("Error toggling mute:", err);
    }
  };

  // ── blockUser ─────────────────────────────────────────────────────────────
  const blockUser = async (userToBlockId: string) => {
    if (!userId) throw new Error("Not authenticated.");
    if (userId === userToBlockId) throw new Error("Cannot block yourself.");
    const token = await getToken({});
    const authSupabase = createClerkSupabaseClient(token);

    const { data, error } = await authSupabase.functions.invoke('chat-controls/block', {
      method: 'POST',
      body: { blocked_id: userToBlockId },
    });

    if (error) throw error;
    return data;
  };

  return {
    conversation,
    messages,
    loading,
    error,
    otherUserOnline,
    sendMessage,
    deleteMessage,
    uploadFile,
    markMessagesAsRead,
    toggleMuteConversation,
    blockUser,
  };
}

