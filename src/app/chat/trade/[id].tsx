import { useAuth } from "@clerk/clerk-expo";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChecksIcon,
  DotsThreeVerticalIcon,
  HandshakeIcon,
  ImageIcon,
  MapPinIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PhoneCallIcon,
  PlusIcon,
  StopIcon,
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
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ChatOptionsSheet from "@src/components/chat_components/ChatOptionsSheet";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Colors } from "@src/constants/Colors";
import { Message, useChat } from "@src/hooks/useChat";
import useThemeColor from "@src/hooks/useThemeColor";
import { normalizeImageForUpload } from "@src/utils/imageUpload";
import { getOptimizedStorageImageUrl } from "@src/utils/storageImage";
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
            source={{ uri: getOptimizedStorageImageUrl(content.url, "chat") }}
            style={styles.imgMsg}
            resizeMode="cover"
          />
        );

      case "location":
        return (
          <TouchableOpacity
            style={[styles.locRow, !isMe && styles.locReceiverCard]}
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

      case "trade_offer":
        return (
          <View
            style={[
              styles.tradeOfferCard,
              {
                backgroundColor: isMe
                  ? "rgba(255,255,255,0.16)"
                  : themeColors.background,
                borderColor: isMe
                  ? "rgba(255,255,255,0.22)"
                  : themeColors.border,
              },
            ]}
          >
            <View style={styles.tradeOfferHeader}>
              <View
                style={[
                  styles.tradeOfferIconWrap,
                  {
                    backgroundColor: isMe
                      ? "rgba(255,255,255,0.18)"
                      : Colors.reds[50],
                  },
                ]}
              >
                <HandshakeIcon
                  size={14}
                  color={isMe ? "#fff" : Colors.reds[500]}
                  weight="fill"
                />
              </View>
              <ThemedText
                style={[styles.tradeOfferLabel, { color: textColor }]}
              >
                Trade offer sent
              </ThemedText>
            </View>

            <View style={styles.tradeOfferBody}>
              {!!content.offeredItemImage && (
                <Image
                  source={{ uri: content.offeredItemImage }}
                  style={styles.tradeOfferThumb}
                  resizeMode="cover"
                />
              )}
              <View style={styles.tradeOfferMeta}>
                <ThemedText
                  style={[styles.tradeOfferTitle, { color: textColor }]}
                  numberOfLines={2}
                >
                  {content.offeredItemTitle || "Offered item"}
                </ThemedText>
                {!!content.offeredItemPrice && (
                  <ThemedText
                    style={[
                      styles.tradeOfferPrice,
                      { color: isMe ? "#fff" : Colors.reds[500] },
                    ]}
                  >
                    {content.offeredItemPrice}
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TradeProductChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useThemeColor();
  const insets = useSafeAreaInsets();
  const composerBottomPadding = Math.max(10, Math.min(insets.bottom, 18));
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isMuted =
    userId === conversation?.buyer_id
      ? conversation?.buyer_muted
      : conversation?.seller_muted;
  const otherUser =
    userId === conversation?.buyer_id
      ? conversation?.seller
      : userId === conversation?.seller_id
        ? conversation?.buyer
        : conversation?.buyer;
  const fallbackName =
    sellerId && String(sellerId) !== String(userId)
      ? (sellerName as string)
      : "";
  const fallbackAvatar =
    sellerId && String(sellerId) !== String(userId)
      ? String(sellerAvatar || "")
      : "";
  const chatName =
    `${otherUser?.first_name || ""} ${otherUser?.last_name || ""}`.trim() ||
    fallbackName ||
    "Trader";
  const chatAvatar =
    String(otherUser?.avatar_url || "") ||
    fallbackAvatar ||
    "https://via.placeholder.com/150";

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
      quality: 0.65,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsSending(true);
    try {
      const normalizedUri = await normalizeImageForUpload(asset.uri, {
        maxDimension: 1400,
        compress: 0.72,
      });
      const path = `chat/${conversation?.id || "unknown"}/${Date.now()}.jpg`;
      const url = await uploadFile(normalizedUri, path, "image/jpeg");
      await sendMessage({ type: "image", url });
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "Could not upload image.");
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

      <View
        style={[styles.refHeader, { backgroundColor: themeColors.background }]}
      >
        <TouchableOpacity
          style={[styles.refIconBtn, { backgroundColor: themeColors.card }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeftIcon size={20} color={themeColors.text} weight="bold" />
        </TouchableOpacity>

        <View style={styles.refCenterWrap}>
          <View style={styles.refAvatarWrap}>
            <Image
              source={{ uri: chatAvatar || "https://via.placeholder.com/150" }}
              style={styles.refAvatar}
            />
            {otherUserOnline ? <View style={styles.refOnlineDot} /> : null}
          </View>
          <View style={styles.refNameWrap}>
            <ThemedText numberOfLines={1} style={styles.refName}>
              {chatName}
            </ThemedText>
            <ThemedText
              style={[
                styles.refStatus,
                {
                  color: otherUserOnline ? "#10B981" : themeColors.text + "60",
                },
              ]}
            >
              {otherUserOnline ? t("chat.active_now") : t("chat.offline")}
            </ThemedText>
          </View>
        </View>

        <View style={styles.refActions}>
          <TouchableOpacity
            style={[styles.refIconBtn, { backgroundColor: themeColors.card }]}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <PhoneCallIcon size={19} color={themeColors.text} weight="fill" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refIconBtn, { backgroundColor: themeColors.card }]}
            onPress={() => setShowOptionsMenu(true)}
            activeOpacity={0.8}
          >
            <DotsThreeVerticalIcon
              size={20}
              color={themeColors.text}
              weight="bold"
            />
          </TouchableOpacity>
        </View>
      </View>
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
              <ThemedText
                style={[styles.dateLabel, { color: themeColors.text + "80" }]}
              >
                {t("chat.today")}
              </ThemedText>
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

        {isRecording ? (
          <View
            style={[
              styles.recordInline,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.recordInlineDot,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <ThemedText
              style={[styles.recordInlineText, { color: themeColors.text }]}
            >
              Recording {formatDuration(recordingDuration)}
            </ThemedText>
            <TouchableOpacity
              onPress={cancelRecording}
              style={styles.recordInlineCancel}
            >
              <XIcon size={16} color="#EF4444" weight="bold" />
            </TouchableOpacity>
          </View>
        ) : null}

        {showAttachMenu && !isRecording ? (
          <View style={styles.attachTray}>
            <TouchableOpacity
              style={[
                styles.attachPill,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
              ]}
              onPress={handlePickImage}
            >
              <ImageIcon size={16} color={Colors.reds[500]} weight="fill" />
              <ThemedText
                style={[styles.attachPillText, { color: themeColors.text }]}
              >
                {t("chat.photo")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={[
            styles.composerRow,
            {
              backgroundColor: themeColors.background,
              paddingBottom: composerBottomPadding,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setShowAttachMenu((v) => !v)}
            style={[
              styles.composerCircleBtn,
              { backgroundColor: themeColors.card },
            ]}
            activeOpacity={0.85}
          >
            <PlusIcon
              size={20}
              color={showAttachMenu ? Colors.reds[500] : themeColors.text}
              weight="bold"
            />
          </TouchableOpacity>

          <View
            style={[
              styles.composerInputWrap,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <TextInput
              value={inputText}
              onChangeText={(v) => {
                setInputText(v);
                if (showAttachMenu) setShowAttachMenu(false);
              }}
              placeholder={
                t("chat.type_your_message") || "Type your message..."
              }
              placeholderTextColor={themeColors.text + "66"}
              style={[styles.composerInput, { color: themeColors.text }]}
              multiline
              maxLength={2000}
            />
          </View>

          {inputText.trim().length > 0 ? (
            <TouchableOpacity
              style={[
                styles.composerCircleBtn,
                { backgroundColor: Colors.reds[500] },
              ]}
              onPress={handleSendText}
              activeOpacity={0.85}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <PaperPlaneTiltIcon size={18} color="#fff" weight="fill" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPressIn={startRecording}
              onPressOut={stopAndSend}
              style={[
                styles.composerCircleBtn,
                { backgroundColor: themeColors.card },
              ]}
              activeOpacity={0.85}
              disabled={isSending}
            >
              <MicrophoneIcon
                size={18}
                color={isRecording ? Colors.reds[500] : themeColors.text}
                weight="fill"
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Options sheet (shared component) ── */}
      <ChatOptionsSheet
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        onMute={handleToggleMute}
        onBlock={async () => {
          try {
            await blockUser(otherUser?.id || "");
            Alert.alert(t("chat.block"), t("chat.user_blocked_successfully"));
            router.back();
          } catch (e: any) {
            Alert.alert(t("error"), e.message);
          }
        }}
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
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  refHeader: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refIconBtn: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  refCenterWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    marginHorizontal: 10,
  },
  refAvatarWrap: {
    marginRight: 10,
    position: "relative",
  },
  refAvatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  refOnlineDot: {
    backgroundColor: "#22C55E",
    borderColor: "#fff",
    borderRadius: 6,
    borderWidth: 2,
    bottom: -1,
    height: 12,
    position: "absolute",
    right: -1,
    width: 12,
  },
  refName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  refNameWrap: {
    flex: 1,
  },
  refStatus: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  refActions: {
    alignItems: "center",
    columnGap: 8,
    flexDirection: "row",
  },

  msgList: {
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  dateSep: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  msgWrap: {
    marginBottom: 10,
    maxWidth: "82%",
  },
  myWrap: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
  },
  otherWrap: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    borderTopRightRadius: 16,
  },
  otherBubble: {
    borderTopLeftRadius: 16,
  },
  imgBubble: {
    borderRadius: 16,
    padding: 3,
  },
  tradeOfferCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    minWidth: 220,
    padding: 12,
  },
  tradeOfferHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  tradeOfferIconWrap: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    marginRight: 8,
    width: 26,
  },
  tradeOfferLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  tradeOfferBody: {
    alignItems: "center",
    flexDirection: "row",
  },
  tradeOfferThumb: {
    borderRadius: 12,
    height: 54,
    marginRight: 10,
    width: 54,
  },
  tradeOfferMeta: {
    flex: 1,
  },
  tradeOfferTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  tradeOfferPrice: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 4,
  },
  msgTime: {
    fontSize: 11,
  },

  imgMsg: {
    borderRadius: 13,
    height: 155,
    width: 200,
  },
  locRow: {
    alignItems: "center",
    flexDirection: "row",
    maxWidth: 220,
    minWidth: 150,
  },
  locReceiverCard: {
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  voiceRow: {
    alignItems: "center",
    columnGap: 8,
    flexDirection: "row",
    minWidth: 190,
  },
  voiceBtn: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  voiceTrack: {
    borderRadius: 2,
    flex: 1,
    height: 3,
    overflow: "hidden",
  },
  voiceFill: {
    borderRadius: 2,
    height: 3,
  },

  recordInline: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 8,
    marginHorizontal: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recordInlineDot: {
    backgroundColor: "#EF4444",
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  recordInlineText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  recordInlineCancel: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },

  attachTray: {
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  attachPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachPillText: {
    fontSize: 13,
    fontWeight: "600",
  },

  composerRow: {
    alignItems: "center",
    columnGap: 10,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  composerCircleBtn: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  composerInputWrap: {
    borderRadius: 999,
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  composerInput: {
    fontSize: 16,
    maxHeight: 110,
    paddingVertical: 12,
  },
});
