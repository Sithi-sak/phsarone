import { useAuth } from "@clerk/clerk-expo";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ImageIcon,
  MapPinIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  XIcon,
} from "phosphor-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Bubble from "@src/components/chat_components/Bubble";
import ChatHeader from "@src/components/chat_components/ChatHeader";
import ChatInputBar from "@src/components/chat_components/ChatInputBar";
import ChatOptionsSheet from "@src/components/chat_components/ChatOptionsSheet";
import ProductCard from "@src/components/chat_components/ProductCard";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Colors } from "@src/constants/Colors";
import { Message, useChat } from "@src/hooks/useChat";
import useThemeColor from "@src/hooks/useThemeColor";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function parseContent(raw: any): { type: string; [k: string]: any } {
  if (!raw) return { type: "text", text: "" };
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object") return p;
    } catch {}
    return { type: "text", text: raw };
  }
  return typeof raw === "object" ? raw : { type: "text", text: String(raw) };
}

// ─── Voice Player ─────────────────────────────────────────────────────────────

function VoicePlayer({
  url,
  duration,
  isMe,
}: {
  url: string;
  duration?: number;
  isMe: boolean;
}) {
  const player = useAudioPlayer({ uri: url }, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const progress =
    status.duration > 0 ? status.currentTime / status.duration : 0;

  const toggle = async () => {
    try {
      if (playing) {
        player.pause();
        return;
      }
      if (status.didJustFinish) await player.seekTo(0);
      player.play();
    } catch (e) {
      console.error("Voice error:", e);
    }
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      style={styles.voiceRow}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.voiceBtn,
          {
            backgroundColor: isMe ? "rgba(255,255,255,0.25)" : Colors.reds[500],
          },
        ]}
      >
        {playing ? (
          <StopIcon size={13} color="#fff" weight="fill" />
        ) : (
          <MicrophoneIcon size={13} color="#fff" weight="fill" />
        )}
      </View>
      <View
        style={[
          styles.voiceTrack,
          { backgroundColor: isMe ? "rgba(255,255,255,0.3)" : "#E5E7EB" },
        ]}
      >
        <View
          style={[
            styles.voiceFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: isMe ? "#fff" : Colors.reds[500],
            },
          ]}
        />
      </View>
      <ThemedText
        style={{ color: isMe ? "#fff" : "#6B7280", fontSize: 12, minWidth: 34 }}
      >
        {formatDuration(duration || Math.round(status.duration || 0))}
      </ThemedText>
    </TouchableOpacity>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function Bubble({
  item,
  isMe,
  themeColors,
  isOptimistic,
  isLastFromMe,
  isRead,
  onLongPress,
}: {
  item: Message;
  isMe: boolean;
  themeColors: any;
  isOptimistic: boolean;
  isLastFromMe: boolean;
  isRead: boolean;
  onLongPress: () => void;
}) {
  const content = parseContent(item.content);
  const bubbleBg = isMe ? Colors.reds[500] : themeColors.card;
  const textColor = isMe ? "#fff" : themeColors.text;
  const { t } = useTranslation();
  const inner = () => {
    switch (content.type) {
      case "image":
        return (
          <Image
            source={{ uri: content.url }}
            style={styles.imgMsg}
            resizeMode="cover"
          />
        );

      case "location":
        return (
          <TouchableOpacity
            style={styles.locRow}
            onPress={() => {
              const u = Platform.select({
                ios: `maps:?q=${content.label || "Location"}&ll=${content.latitude},${content.longitude}`,
                android: `geo:${content.latitude},${content.longitude}?q=${content.label || "Location"}`,
              });
              if (u) Linking.openURL(u);
            }}
          >
            <MapPinIcon
              size={18}
              color={isMe ? "#fff" : Colors.reds[500]}
              weight="fill"
            />
            <ThemedText
              style={{ color: textColor, fontSize: 14, marginLeft: 6, flex: 1 }}
              numberOfLines={2}
            >
              {content.label ||
                `${Number(content.latitude).toFixed(4)}, ${Number(content.longitude).toFixed(4)}`}
            </ThemedText>
          </TouchableOpacity>
        );

      case "voice":
        return (
          <VoicePlayer
            url={content.url}
            duration={content.duration}
            isMe={isMe}
          />
        );

      default: {
        const text =
          content.text ||
          content.message ||
          (typeof item.content === "string" ? item.content : "");
        return (
          <ThemedText
            style={{ color: textColor, fontSize: 15, lineHeight: 22 }}
          >
            {text}
          </ThemedText>
        );
      }
    }
  };

  return (
    <View
      style={[
        styles.msgWrap,
        isMe ? styles.myWrap : styles.otherWrap,
        isOptimistic && { opacity: 0.6 },
      ]}
    >
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={[
          styles.bubble,
          isMe ? styles.myBubble : styles.otherBubble,
          { backgroundColor: bubbleBg },
          content.type === "image" && styles.imgBubble,
        ]}
      >
        {inner()}
      </Pressable>

      {/* Time + seen status */}
      <View style={styles.metaRow}>
        <ThemedText
          style={[styles.msgTime, { color: themeColors.text + "55" }]}
        >
          {isOptimistic
            ? t("chat.sending")
            : new Date(item.created_at || "").toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
        </ThemedText>
        {isMe && isLastFromMe && (
          <View style={{ marginLeft: 4 }}>
            {isRead ? (
              <ChecksIcon size={14} color={Colors.reds[500]} weight="bold" />
            ) : (
              <CheckIcon
                size={14}
                color={themeColors.text + "55"}
                weight="bold"
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Product Banner ───────────────────────────────────────────────────────────

function ProductBanner({
  title,
  thumbnail,
  price,
  currency,
  themeColors,
  onPress,
}: {
  title?: string;
  thumbnail?: string;
  price?: string;
  currency?: string;
  themeColors: any;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  if (!title) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.productBanner,
        {
          backgroundColor: themeColors.card,
          borderBottomColor: themeColors.border + "30",
        },
      ]}
    >
      <View
        style={[
          styles.productBannerIcon,
          { backgroundColor: Colors.reds[500] + "18" },
        ]}
      >
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.productThumb} />
        ) : (
          <ShoppingBagIcon size={20} color={Colors.reds[500]} weight="fill" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText
          style={[styles.productBannerTitle, { color: themeColors.text }]}
          numberOfLines={1}
        >
          {title}
        </ThemedText>
        {price ? (
          <ThemedText style={styles.productBannerPrice}>
            {currency || "USD"} {price}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText
        style={{ color: Colors.reds[500], fontSize: 12, fontWeight: "600" }}
      >
        {t("common.viewAll")}
      </ThemedText>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TradeProductChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { userId } = useAuth();
  const { t } = useTranslation();

  const {
    id,
    sellerId,
    sellerName,
    sellerAvatar,
    conversationId: initialConversationId,
    productTitle,
    productThumbnail,
    productPrice,
    productCurrency,
  } = params;

  const {
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
  } = useChat({
    tradeId: initialConversationId ? undefined : (id as string),
    sellerId: sellerId as string,
    conversationId: initialConversationId as string,
  });

  const flatListRef = useRef<FlatList<Message>>(null);
  const [inputText, setInputText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const isRecording = recorderState.isRecording;
  const recordingDuration = Math.floor(
    (recorderState.durationMillis || 0) / 1000,
  );
  const recordingDuration = Math.floor(
    (recorderState.durationMillis || 0) / 1000,
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isMuted =
    userId === conversation?.buyer_id
      ? conversation?.buyer_muted
      : conversation?.seller_muted;
  const otherUser =
    userId === conversation?.buyer_id
      ? conversation?.seller
      : conversation?.buyer;

  // Last message sent by me — for seen indicator
  const myMessages = messages.filter(
    (m) => m.sender_id === userId && !m.id.startsWith("temp_"),
  );
  const lastMyMsg = myMessages[myMessages.length - 1];

  useEffect(() => {
    if (conversation?.id && messages.length > 0) markMessagesAsRead();
  }, [conversation?.id, messages.length]);

  // Helper to scroll to last message
  const scrollToLatest = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: messages.length - 1,
          animated: false,
          viewPosition: 1,
        });
      }, 50);
    }
  }, [messages.length]);

  // Handle scroll to index failures by falling back to scrolling to end
  const handleScrollIndexFailed = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [messages.length, scrollToLatest]);

  // Scroll to bottom on initial load and conversation change
  useEffect(() => {
    if (conversation?.id && messages.length > 0 && !loading) {
      scrollToLatest();
    }
  }, [conversation?.id, loading, scrollToLatest]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // ── Message long press (delete own) ──────────────────────────────────────
  const handleMessageLongPress = (msg: Message) => {
    if (msg.sender_id !== userId || msg.id.startsWith("temp_")) return;

    const content = parseContent(msg.content);
    let deleteLabel = t("chat.delete_text");
    if (content.type === "image") deleteLabel = t("chat.delete_image");
    else if (content.type === "voice") deleteLabel = t("chat.delete_voice");
    else if (content.type === "location")
      deleteLabel = t("chat.delete_location");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("common.cancel"), deleteLabel],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        async (idx) => {
          if (idx === 1) {
            try {
              await deleteMessage(msg.id);
            } catch (e: any) {
              Alert.alert(t("error"), e.message);
            }
          }
        },
      );
    } else {
      Alert.alert(deleteLabel, t("chat.delete_message_confirmation"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMessage(msg.id);
            } catch (e: any) {
              Alert.alert(t("error"), e.message);
            }
          },
        },
      ]);
    }
  };

  // ── Send text ──────────────────────────────────────────────────────────────
  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText("");
    setIsSending(true);
    try {
      await sendMessage({ type: "text", text });
    } catch (e: any) {
      Alert.alert(t("error"), e.message || t("chat.failed_to_send_message"));
    } finally {
      setIsSending(false);
    }
  };

  // ── Pick image ─────────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("error"), "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsSending(true);
    try {
      const ext = (asset.uri.split(".").pop() || "jpg").toLowerCase();
      const path = `chat/${conversation?.id || "unknown"}/${Date.now()}.${ext}`;
      const url = await uploadFile(asset.uri, path, `image/${ext}`);
      await sendMessage({ type: "image", url });
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "Could not upload image.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Send location ──────────────────────────────────────────────────────────
  const handleSendLocation = async () => {
    setShowAttachMenu(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("error"), "Please allow location access.");
      return;
    }
    setIsSending(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const label = geo
        ? [geo.street, geo.city, geo.country].filter(Boolean).join(", ")
        : undefined;
      await sendMessage({
        type: "location",
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        label,
      });
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "Failed to get location.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Voice ──────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (recorderState.isRecording) return;
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("error"), "Please allow microphone access.");
      return;
    }
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "Failed to start recording.");
    }
  };

  const stopAndSend = async () => {
    if (!recorderState.isRecording) return;
    setIsSending(true);
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = recorder.uri || status.url;
      const dur = Math.floor((status.durationMillis || 0) / 1000);
      if (!uri) throw new Error("No recording URI.");
      const path = `chat/${conversation?.id || "unknown"}/${Date.now()}.m4a`;
      const url = await uploadFile(uri, path, "audio/m4a");
      await sendMessage({ type: "voice", url, duration: dur });
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "Could not send voice message.");
    } finally {
      setIsSending(false);
    }
  };

  const cancelRecording = async () => {
    if (!recorderState.isRecording) return;
    try {
      await recorder.stop();
    } catch {}
  };

  // ── Options actions ────────────────────────────────────────────────────────
  const handleToggleMute = async () => {
    await toggleMuteConversation();
  };

  const handleBlock = () => {
    Alert.alert(
      t("chat.block_user_title"),
      t("chat.block_user_confirmation", {
        userName: otherUser?.first_name || "this user",
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.block"),
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(otherUser?.id || "");
              Alert.alert(t("chat.block"), t("chat.user_blocked_successfully"));
              router.back();
            } catch (e: any) {
              Alert.alert(t("error"), e.message);
            }
          },
        },
      ],
    );
  };

  const handleCall = () => {
    if (otherUser?.phone) {
      Linking.openURL(`tel:${otherUser.phone}`);
    } else {
      Alert.alert(t("error"), t("chat.phone_not_available"));
    }
  };

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading && !conversation) {
    return (
      <View
        style={[styles.centered, { backgroundColor: themeColors.background }]}
      >
        <ActivityIndicator size="small" color={Colors.reds[500]} />
      </View>
    );
  }
  if (error) {
    return (
      <View
        style={[styles.centered, { backgroundColor: themeColors.background }]}
      >
        <ThemedText style={{ color: "#EF4444", marginBottom: 16 }}>
          {error}
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={{ color: themeColors.tint }}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header (shared) ── */}
      <ChatHeader
        name={sellerName as string}
        isOnline={!!otherUserOnline}
        themeColors={themeColors}
        onOptionsPress={() => setShowOptionsMenu(true)}
      />

      {/* ── Product card (shared) ── */}
      <ProductCard
        title={(productTitle as string) || conversation?.product?.title || ""}
        thumbnail={
          (productThumbnail as string) ||
          (conversation?.product?.images?.[0] as string) ||
          ""
        }
        price={
          (productPrice as string) ||
          String(conversation?.product?.metadata?.price || "")
        }
        currency={
          (productCurrency as string) ||
          conversation?.product?.metadata?.currency ||
          "USD"
        }
        themeColors={themeColors}
        onPress={() =>
          router.push(`/product/${id || conversation?.product?.id}` as any)
        }
      />

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          getItemLayout={(_, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
          onScrollToIndexFailed={handleScrollIndexFailed}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.dateSep}>
              <View
                style={[
                  styles.dateLine,
                  { backgroundColor: themeColors.border + "40" },
                ]}
              />
              <ThemedText
                style={[styles.dateLabel, { color: themeColors.text + "50" }]}
              >
                {t("chat.today")}
              </ThemedText>
              <View
                style={[
                  styles.dateLine,
                  { backgroundColor: themeColors.border + "40" },
                ]}
              />
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === userId;
            const isOptimistic = item.id.startsWith("temp_");
            const isLastFromMe = isMe && lastMyMsg?.id === item.id;
            return (
              <Bubble
                item={item}
                isMe={isMe}
                themeColors={themeColors}
                isOptimistic={isOptimistic}
                isLastFromMe={isLastFromMe}
                isRead={!!(item as any).is_read}
                onLongPress={() => handleMessageLongPress(item)}
              />
            );
          }}
        />

        {/* Recording bar */}
        {isRecording && (
          <View
            style={[
              styles.recordBar,
              {
                backgroundColor: themeColors.card,
                borderTopColor: themeColors.border + "30",
              },
            ]}
          >
            <TouchableOpacity
              onPress={cancelRecording}
              style={styles.recordCancel}
            >
              <XIcon size={20} color="#EF4444" weight="bold" />
            </TouchableOpacity>
            <Animated.View
              style={[styles.recordDot, { transform: [{ scale: pulseAnim }] }]}
            />
            <ThemedText
              style={{
                flex: 1,
                fontWeight: "600",
                color: themeColors.text,
                fontSize: 16,
              }}
            >
              {formatDuration(recordingDuration)}
            </ThemedText>
            <ThemedText
              style={{
                color: themeColors.text + "55",
                fontSize: 12,
                marginRight: 10,
              }}
            >
              {t("chat.tap_to_send")}
            </ThemedText>
            <TouchableOpacity onPress={stopAndSend} style={styles.recordSend}>
              <PaperPlaneTiltIcon size={18} color="#fff" weight="fill" />
            </TouchableOpacity>
          </View>
        )}

        {/* Attach menu */}
        {showAttachMenu && !isRecording && (
          <View
            style={[
              styles.attachMenu,
              {
                backgroundColor: themeColors.card,
                borderTopColor: themeColors.border + "30",
              },
            ]}
          >
            <TouchableOpacity
              style={styles.attachItem}
              onPress={handlePickImage}
            >
              <View style={[styles.attachIcon, { backgroundColor: "#6366F1" }]}>
                <ImageIcon size={22} color="#fff" weight="fill" />
              </View>
              <ThemedText
                style={[styles.attachLabel, { color: themeColors.text }]}
              >
                {t("chat.photo")}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachItem}
              onPress={handleSendLocation}
            >
              <View style={[styles.attachIcon, { backgroundColor: "#10B981" }]}>
                <MapPinIcon size={22} color="#fff" weight="fill" />
              </View>
              <ThemedText
                style={[styles.attachLabel, { color: themeColors.text }]}
              >
                {t("chat.location")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar (shared input component + buttons) */}
        {!isRecording && (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: themeColors.background,
                borderTopColor: themeColors.border + "30",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowAttachMenu((v) => !v)}
              style={[
                styles.roundBtn,
                {
                  backgroundColor: showAttachMenu
                    ? Colors.reds[500]
                    : themeColors.card,
                },
              ]}
            >
              <PlusIcon
                size={22}
                color={showAttachMenu ? "#fff" : themeColors.text}
                weight="bold"
              />
            </TouchableOpacity>

            <ChatInputBar
              value={inputText}
              onChange={(v: string) => {
                setInputText(v);
                if (showAttachMenu) setShowAttachMenu(false);
              }}
              onSend={handleSendText}
              themeColors={themeColors}
            />

            {inputText.trim().length === 0 && (
              <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopAndSend}
                style={[styles.roundBtn, { backgroundColor: themeColors.card }]}
              >
                <MicrophoneIcon
                  size={22}
                  color={isRecording ? Colors.reds[500] : themeColors.text}
                  weight="fill"
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Options sheet (shared component) ── */}
      <ChatOptionsSheet
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        onMute={handleToggleMute}
        onBlock={handleBlock}
        isMuted={isMuted}
        themeColors={themeColors}
        otherUserName={otherUser?.first_name || "User"}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 6 },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 6,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  onlineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  headerName: { fontSize: 16, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 2 },

  // Product banner
  productBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
  },
  productBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  productThumb: { width: 44, height: 44, borderRadius: 10 },
  productBannerTitle: { fontSize: 14, fontWeight: "600" },
  productBannerPrice: {
    fontSize: 13,
    color: Colors.reds[500],
    fontWeight: "600",
    marginTop: 1,
  },

  // Messages
  msgList: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dateLine: { flex: 1, height: 1 },
  dateLabel: { fontSize: 12, fontWeight: "500" },

  msgWrap: { marginBottom: 8, maxWidth: "80%" },
  myWrap: { alignSelf: "flex-end", alignItems: "flex-end" },
  otherWrap: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  myBubble: { borderTopRightRadius: 4 },
  otherBubble: { borderTopLeftRadius: 4 },
  imgBubble: { padding: 3, borderRadius: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  msgTime: { fontSize: 11 },

  imgMsg: { width: 200, height: 155, borderRadius: 13 },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 150,
    maxWidth: 220,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 190,
  },
  voiceBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  voiceFill: { height: 3, borderRadius: 2 },

  // Recording bar
  recordBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
  },
  recordCancel: { padding: 4 },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  recordSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.reds[500],
    justifyContent: "center",
    alignItems: "center",
  },

  // Attach menu
  attachMenu: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 18,
    gap: 32,
    borderTopWidth: 1,
  },
  attachItem: { alignItems: "center", gap: 8 },
  attachIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  attachLabel: { fontSize: 12, fontWeight: "500" },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 42,
    justifyContent: "center",
  },
  textInput: { fontSize: 16, maxHeight: 100, paddingVertical: 8 },

  // Options modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  optLabel: { fontSize: 16, fontWeight: "500" },
  divider: { height: 1 },
  cancelBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
});
