import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { showIncomingChatNotification } from '../lib/notifications';
import { createClerkSupabaseClient, supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { parseContent } from '../utils/chatUtils';

const notifiedMessageIds = new Set<string>();

const buildNotificationBody = (rawContent: any): string => {
  const content = parseContent(rawContent);
  switch (content.type) {
    case 'image':
      return 'Sent a photo';
    case 'voice':
      return 'Sent a voice message';
    case 'location':
      return 'Shared a location';
    default:
      return content.text || content.message || 'New message';
  }
};

const formatErrorMessage = (err: any): string => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;

  const parts = [err.message, err.details, err.hint, err.code]
    .filter(Boolean)
    .map(String);

  if (parts.length > 0) return parts.join(' | ');

  try {
    return JSON.stringify(err);
  } catch {
    return 'Unexpected error object';
  }
};

export type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: Database['public']['Tables']['users']['Row'];
};
export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  buyer?: Database['public']['Tables']['users']['Row'];
  seller?: Database['public']['Tables']['users']['Row'];
  product?: Database['public']['Tables']['products']['Row'] & { images: string[]; metadata?: any };
  trade?: Database['public']['Tables']['trades']['Row'];
  last_message_id?: string;
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
  const fetchRef = useRef<((showLoading?: boolean) => Promise<void>) | undefined>(undefined);
  const hasInitialLoadRef = useRef(false);

  const fetchConversations = useCallback(async (showLoading = true) => {
    if (isFetchingRef.current) return;
    if (!userId) {
      setError("User not authenticated.");
      if (showLoading) setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    if (showLoading) setLoading(true);
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
        .from('messages').select('id, conversations_id, content, created_at, sender_id')
        .in('conversations_id', conversationIds).order('created_at', { ascending: false });
      if (lastError) throw lastError;

      const { data: unreadData, error: unreadError } = await authSupabase
        .from('messages').select('conversations_id')
        .in('conversations_id', conversationIds).eq('is_read', false).neq('sender_id', userId);
      if (unreadError) throw unreadError;

      const nextConversations = filteredConversations.map((conv: any) => {
        const lastMsg = (lastMessages || []).find(m => m.conversations_id === conv.id);
        return {
          ...conv,
          last_message_id: lastMsg?.id,
          last_message_content: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
          last_message_sender_id: lastMsg?.sender_id,
          unread_count: (unreadData || []).filter(m => m.conversations_id === conv.id).length,
        };
      });

      setConversations((prev) => {
        if (hasInitialLoadRef.current) {
          const prevByConversationId = new Map(prev.map((c) => [c.id, c]));

          nextConversations.forEach((conv: any) => {
            try {
              if (!conv.last_message_id) return;
              if (conv.last_message_sender_id === userId) return;

              const prevConv = prevByConversationId.get(conv.id);
              if (prevConv?.last_message_id === conv.last_message_id) return;
              if (notifiedMessageIds.has(conv.last_message_id)) return;

              notifiedMessageIds.add(conv.last_message_id);

              const senderUser =
                (conv.buyer_id === conv.last_message_sender_id ? conv.buyer : conv.seller) ||
                null;
              const senderName =
                `${senderUser?.first_name || ''} ${senderUser?.last_name || ''}`.trim() ||
                'New message';

              showIncomingChatNotification({
                title: senderName,
                body: buildNotificationBody(conv.last_message_content),
                conversationId: conv.id,
              }).catch((notifyErr) =>
                console.error('Failed to show fallback chat notification', notifyErr)
              );
            } catch (notifyFlowErr) {
              console.error('Fallback notification flow failed for conversation', conv?.id, notifyFlowErr);
            }
          });
        }

        hasInitialLoadRef.current = true;
        return nextConversations;
      });
    } catch (err: any) {
      const message = formatErrorMessage(err);
      console.error("Error fetching conversations:", err);
      console.error("Error fetching conversations details:", message);
      setError(message || "Failed to load conversations.");
    } finally {
      if (showLoading) setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, type, productId]);

  useEffect(() => { fetchRef.current = fetchConversations; });

  useEffect(() => {
    fetchConversations();
  }, [userId, type, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const applyMessageInsertToConversations = (newMessage: any) => {
      console.log('[Chat] Processing message insert:', {
        messageId: newMessage.id,
        conversationId: newMessage.conversations_id,
        senderId: newMessage.sender_id,
        currentUserId: userId,
        isFromOtherUser: newMessage.sender_id !== userId,
      });

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === newMessage.conversations_id);
        console.log('[Chat] Conversation found in list:', idx !== -1, 'at index:', idx);
        
        if (idx === -1) {
          console.log('[Chat] ⚠️ Conversation NOT in current list - skipping');
          return prev;
        }

        const target = prev[idx];
        const nextUnread =
          newMessage.sender_id !== userId && !newMessage.is_read
            ? (target.unread_count || 0) + 1
            : (target.unread_count || 0);

        const updated: Conversation = {
          ...target,
          last_message_id: newMessage.id,
          last_message_content: newMessage.content,
          last_message_at: newMessage.created_at,
          last_message_sender_id: newMessage.sender_id,
          unread_count: nextUnread,
        };

        // Move active conversation to top like common chat apps.
        const next = [...prev];
        next.splice(idx, 1);
        next.unshift(updated);
        console.log('[Chat] ✅ Conversation moved to top');

        if (newMessage.sender_id !== userId && !notifiedMessageIds.has(newMessage.id)) {
          console.log('[Chat] 🔔 Sending notification for message:', newMessage.id);
          notifiedMessageIds.add(newMessage.id);
          const senderUser =
            (updated.buyer_id === newMessage.sender_id ? updated.buyer : updated.seller) ||
            null;
          const senderName =
            `${senderUser?.first_name || ''} ${senderUser?.last_name || ''}`.trim() ||
            'New message';

          console.log('[Chat] Notification sender:', senderName);
          showIncomingChatNotification({
            title: senderName,
            body: buildNotificationBody(newMessage.content),
            conversationId: updated.id,
          }).catch((err) => console.error('Failed to show chat notification', err));
        } else if (notifiedMessageIds.has(newMessage.id)) {
          console.log('[Chat] ⚠️ Notification already sent for this message:', newMessage.id);
        }

        return next;
      });
    };

    const setupConversationsRealtime = async () => {
      try {
        console.log('[Chat] Starting realtime setup for userId:', userId);
        const token = await getToken({});
        console.log('[Chat] Token obtained:', token ? 'YES (length: ' + token.length + ')' : 'NO - THIS IS THE PROBLEM!');
        
        if (!token || isCancelled) {
          console.error('[Chat] Cannot setup realtime: token missing or cancelled');
          return;
        }

        // Ensure auth is set before creating/subscribing to channels
        supabase.realtime.setAuth(token);
        console.log('[Chat] Realtime auth set successfully');

        // Clean up previous channel if exists
        if (channel) {
          console.log('[Chat] Removing previous channel');
          supabase.removeChannel(channel);
          channel = null;
        }

        console.log('[Chat] Creating message listener channel...');
        channel = supabase
          .channel(`user_conversations:${userId}:${type}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'conversations',
              filter: `buyer_id=eq.${userId}`,
            },
            () => {
              console.log('[Chat] ✅ Conversation listener triggered (buyer)', userId);
              fetchRef.current?.(false);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'conversations',
              filter: `seller_id=eq.${userId}`,
            },
            () => {
              console.log('[Chat] ✅ Conversation listener triggered (seller)', userId);
              fetchRef.current?.(false);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            (payload) => {
              console.log('[Chat] ✅ Message INSERT received:', {
                messageId: payload.new?.id,
                conversationId: payload.new?.conversations_id,
                senderId: payload.new?.sender_id,
                content: typeof payload.new?.content,
              });
              applyMessageInsertToConversations(payload.new as any);
              // Always refetch to handle cases where the conversation isn't in local state yet.
              fetchRef.current?.(false);
            }
          )
          .on('system', { event: '*' }, (payload) => {
            console.log('[Chat] 📡 Realtime system event:', payload);
          })
          .subscribe((status, err) => {
            console.log('[Chat] 📡 Conversations realtime subscription status:', status);
            if (err) {
              console.error('[Chat] ❌ Realtime subscription error:', err);
            }
            if (status === 'CHANNEL_ERROR') {
              console.error('[Chat] ❌ CHANNEL_ERROR: Realtime connection failed');
            }
            if (status === 'CLOSED') {
              console.warn('[Chat] ⚠️ Channel CLOSED - will try to reconnect in 5s');
              // Try to reconnect after 5 seconds
              if (!isCancelled) {
                setTimeout(() => {
                  if (!isCancelled) {
                    setupConversationsRealtime();
                  }
                }, 5000);
              }
            }
          });
        console.log('[Chat] ✅ Realtime channel created and subscribed');
      } catch (err: any) {
        console.error('[Chat] ❌ Conversations realtime setup ERROR:', err?.message || err);
      }
    };

    setupConversationsRealtime();

    return () => {
      isCancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, type]);

  // Fallback sync when realtime is interrupted: keep list fresh without manual pull-to-refresh.
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchRef.current?.(false);
    }, 6000);

    return () => clearInterval(interval);
  }, [userId, type, productId]);

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
  const fetchChatRef = useRef<((showLoading?: boolean) => Promise<void>) | undefined>(undefined);

  const fetchConversationAndMessages = useCallback(async (showLoading = true) => {
    if (isFetchingRef.current) return;
    if (!userId) {
      setError("User not authenticated.");
      if (showLoading) setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, initialConversationId, productId, sellerId, tradeId]);

  useEffect(() => { fetchChatRef.current = fetchConversationAndMessages; });

  useEffect(() => {
    fetchConversationAndMessages();
  }, [userId, initialConversationId, productId, sellerId, tradeId]);

  // Fallback sync for message thread when realtime drops.
  useEffect(() => {
    if (!conversation?.id || !userId) return;
    const interval = setInterval(() => {
      fetchChatRef.current?.(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [conversation?.id, userId]);

  // ── Realtime: new messages ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation?.id || !userId) return;

    let isCancelled = false;

    const setupRealtime = async () => {
      try {
        // Realtime must use the same auth context as table queries.
        const token = await getToken({});
        if (!token || isCancelled) {
          console.error('[Chat Detail] Cannot setup realtime: token missing or cancelled');
          return;
        }
        
        // Ensure auth is set before creating/subscribing to channels
        supabase.realtime.setAuth(token);
        console.log('[Chat Detail] Realtime auth set successfully');

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
              console.log('[Chat Detail] Message INSERT received', payload.new);
              const newMsg = payload.new as Message;

              if (newMsg.sender_id !== userId && !notifiedMessageIds.has(newMsg.id)) {
                notifiedMessageIds.add(newMsg.id);
                const senderUser =
                  conversation.buyer_id === newMsg.sender_id
                    ? conversation.buyer
                    : conversation.seller;
                const senderName =
                  `${senderUser?.first_name || ''} ${senderUser?.last_name || ''}`.trim() ||
                  'New message';
                showIncomingChatNotification({
                  title: senderName,
                  body: buildNotificationBody(newMsg.content),
                  conversationId: conversation.id,
                }).catch((err) => console.error('Failed to show chat notification', err));
              }

              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
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
              console.log('[Chat Detail] Message DELETE received', payload.old);
              setMessages((prev) =>
                prev.filter((m) => m.id !== (payload.old as any).id)
              );
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
              console.log('[Chat Detail] Message UPDATE received', payload.new);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === (payload.new as Message).id
                    ? { ...m, ...(payload.new as Message) }
                    : m
                )
              );
            }
          )
          .on('system', { event: '*' }, (payload) => {
            console.log('[Chat Detail] 📡 Realtime system event:', payload);
          })
          .subscribe((status, err) => {
            console.log('[Chat Detail] Messages realtime subscription status:', status);
            if (err) {
              console.error('[Chat Detail] ❌ Realtime error:', err);
            }
            if (status === 'CLOSED') {
              console.warn('[Chat Detail] ⚠️ Channel CLOSED - will try to reconnect in 5s');
              if (!isCancelled) {
                setTimeout(() => {
                  if (!isCancelled) {
                    setupRealtime();
                  }
                }, 5000);
              }
            }
          });

        subscriptionRef.current = channel;
        console.log('[Chat Detail] ✅ Messages realtime channel subscribed');
      } catch (err: any) {
        console.error('[Chat Detail] Realtime setup error:', err);
      }
    };

    setupRealtime();

    return () => {
      isCancelled = true;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [conversation?.id, userId]);

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
      
      // Replace optimistic message and avoid duplicates if realtime arrives first.
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === (data as Message).id)) {
          return withoutTemp;
        }
        return [...withoutTemp, data as Message];
      });
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

