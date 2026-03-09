import { useAuth } from "@clerk/clerk-expo";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  CheckIcon,
  ChecksIcon,
  DotsThreeVerticalIcon,
  ImageIcon,
  MapPinIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PhoneIcon,
  PlusIcon,
  ShoppingBagIcon,
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
  Keyboard,
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
import ImageViewerModal from "@src/components/chat_components/ImageViewerModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Message, useChat } from "@src/hooks/useChat";
import useThemeColor from "@src/hooks/useThemeColor";
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
  const { t } = useTranslation();
  const themeColors = useThemeColor();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(
    () => () => {
      sound?.unloadAsync();
    },
    [sound],
  );

  const toggle = async () => {
    try {
      if (playing && sound) {
        await sound.pauseAsync();
        setPlaying(false);
        return;
      }
      if (sound) {
        await sound.playAsync();
        setPlaying(true);
        return;
      }
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      setSound(s);
      setPlaying(true);
      s.setOnPlaybackStatusUpdate((st: any) => {
        if (st.isLoaded) {
          setProgress(st.positionMillis / (st.durationMillis || 1));
          if (st.didJustFinish) {
            setPlaying(false);
            setProgress(0);
          }
        }
      });
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
      {/* ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary */}
      <View
        style={[
          styles.voiceBtn,
          {
            backgroundColor: isMe
              ? "rgba(255,255,255,0.25)"
              : themeColors.primary,
          },
        ]}
      >
        {playing ? (
          <StopIcon size={13} color="#fff" weight="fill" />
        ) : (
          <MicrophoneIcon size={13} color="#fff" weight="fill" />
        )}
      </View>
      {/* ✅ Was hardcoded "#E5E7EB" — now uses themeColors.border */}
      <View
        style={[
          styles.voiceTrack,
          {
            backgroundColor: isMe
              ? "rgba(255,255,255,0.3)"
              : themeColors.border,
          },
        ]}
      >
        {/* ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary */}
        <View
          style={[
            styles.voiceFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: isMe ? "#fff" : themeColors.primary,
            },
          ]}
        />
      </View>
      {/* ✅ Was hardcoded "#6B7280" — now uses themeColors.tabIconDefault */}
      <ThemedText
        style={{
          color: isMe ? "#fff" : themeColors.tabIconDefault,
          fontSize: 12,
          minWidth: 34,
        }}
      >
        {formatDuration(duration || 0)}
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
  const { t } = useTranslation();
  const content = parseContent(item.content);
  // ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary
  const bubbleBg = isMe ? themeColors.primary : themeColors.card;
  const textColor = isMe ? "#fff" : themeColors.text;

  const inner = () => {
    switch (content.type) {
      case "image":
        return (
          <Image
            source={{ uri: getOptimizedStorageImageUrl(content.url, "chat") }}
            source={{ uri: getOptimizedStorageImageUrl(content.url, "chat") }}
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
            {/* ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary */}
            <MapPinIcon
              size={18}
              color={isMe ? "#fff" : themeColors.primary}
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
            {/* ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary */}
            {isRead ? (
              <ChecksIcon size={14} color={themeColors.primary} weight="bold" />
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

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
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
  const [collapsed, setCollapsed] = useState(false);
  if (!title) return null;
  const hasPrice = price && price !== "0" && price !== "";
  const optimizedThumbnail = thumbnail
    ? getOptimizedStorageImageUrl(thumbnail, "thumb")
    : "";

  if (collapsed) {
    return (
      <TouchableOpacity
        onPress={() => setCollapsed(false)}
        activeOpacity={0.8}
        style={[
          styles.cardPill,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border + "40",
          },
        ]}
      >
        {thumbnail ? (
          <Image
            source={{ uri: optimizedThumbnail }}
            style={styles.pillThumb}
          />
        ) : (
          // ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary
          <ShoppingBagIcon
            size={14}
            color={themeColors.primary}
            weight="fill"
          />
        )}
        <ThemedText
          style={[styles.pillTitle, { color: themeColors.text }]}
          numberOfLines={1}
        >
          {title}
        </ThemedText>
        {hasPrice && (
          // ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary
          <ThemedText
            style={[styles.pillPrice, { color: themeColors.primary }]}
          >
            {currency || "$"} {price}
          </ThemedText>
        )}
        <CaretLeftIcon
          size={14}
          color={themeColors.text + "60"}
          weight="bold"
        />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.productCard,
        {
          backgroundColor: themeColors.card,
          borderBottomColor: themeColors.border + "25",
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.cardImageWrap}
      >
        {thumbnail ? (
          <Image
            source={{ uri: optimizedThumbnail }}
            source={{ uri: optimizedThumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          // ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary
          <View
            style={[
              styles.cardImagePlaceholder,
              { backgroundColor: themeColors.primary + "15" },
            ]}
          >
            <ShoppingBagIcon
              size={44}
              color={themeColors.primary}
              weight="fill"
            />
          </View>
        )}
        <View style={styles.cardBadge}>
          <ShoppingBagIcon size={11} color="#fff" weight="fill" />
          <ThemedText style={styles.cardBadgeText}>
            {t("chat.listing")}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setCollapsed(true)}
          style={styles.cardCollapseBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <CaretLeftIcon
            size={13}
            color="#fff"
            weight="bold"
            style={{ transform: [{ rotate: "90deg" }] }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <View style={{ flex: 1 }}>
          <ThemedText
            style={[styles.cardTitle, { color: themeColors.text }]}
            numberOfLines={2}
          >
            {title}
          </ThemedText>
          {hasPrice && (
            // ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary
            <View
              style={[
                styles.cardPricePill,
                { backgroundColor: themeColors.primary + "18" },
              ]}
            >
              <ThemedText
                style={[styles.cardPriceText, { color: themeColors.primary }]}
              >
                {currency || "USD"} {Number(price).toLocaleString()}
              </ThemedText>
            </View>
          )}
        </View>
        {/* ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary */}
        <TouchableOpacity
          onPress={onPress}
          style={[styles.cardViewBtn, { backgroundColor: themeColors.primary }]}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.cardViewBtnText}>
            {t("chat.view_listing")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NormalProductChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { userId } = useAuth();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isKhmer = i18n.language === "kh";
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const {
    id: productId,
    sellerId,
    sellerName,
    sellerAvatar,
    conversationId: initialConversationId,
    productTitle,
    productThumbnail,
    productPrice,
    productCurrency,
  } = params as any;
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
    productId: productId as string,
    sellerId: sellerId as string,
    conversationId: initialConversationId as string,
  });
  const flatListRef = useRef<FlatList<Message>>(null);
  const [inputText, setInputText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const hasScrolledOnMount = useRef(false);
  const isMuted =
    userId === conversation?.buyer_id
      ? conversation?.buyer_muted
      : conversation?.seller_muted;
  const otherUser =
    userId === conversation?.buyer_id
      ? conversation?.seller
      : conversation?.buyer;
  const myMessages = messages.filter(
    (m) => m.sender_id === userId && !m.id.startsWith("temp_"),
  );
  const lastMyMsg = myMessages[myMessages.length - 1];

  // ─── Scroll helper ─────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // ─── Mark as read ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (conversation?.id && messages.length > 0) markMessagesAsRead();
  }, [conversation?.id, messages.length]);

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

  const handleScrollIndexFailed = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [messages.length, scrollToLatest]);

  useEffect(() => {
    if (conversation?.id && messages.length > 0 && !loading) {
      scrollToLatest();
    }
  }, [conversation?.id, loading, scrollToLatest]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      const delay = Platform.OS === "ios" ? 50 : 0;
      setTimeout(() => scrollToBottom(true), delay);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  // ─── Recording pulse ───────────────────────────────────────────────────────
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

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleMessageLongPress = (msg: Message) => {
    if (msg.sender_id !== userId || msg.id.startsWith("temp_")) return;
    const content = parseContent(msg.content);
    const typeMap: Record<string, string> = {
      text: t("chat.this_message"),
      image: t("chat.this_photo"),
      voice: t("chat.this_voice_message"),
      location: t("chat.this_location"),
    };
    const contentLabel = typeMap[content.type] || t("chat.this_message");
    const title = t("chat.delete_title");
    const confirmationMessage = t("chat.delete_confirmation_dynamic", {
      item: contentLabel,
    });
    const performDelete = async () => {
      try {
        await deleteMessage(msg.id);
      } catch (e: any) {
        Alert.alert(
          t("error"),
          e?.message || t("chat.failed_to_delete_message"),
        );
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: confirmationMessage,
          options: [t("common.cancel"), t("chat.delete_for_you")],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) performDelete();
        },
      );
    } else {
      Alert.alert(
        t("chat.delete_conversation_title"),
        t("chat.delete_conversation_confirmation"),
        [
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
        ],
      );
    }
  };

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

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("error"), t("chat.permission_photo_library"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.65,
      quality: 0.65,
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
      Alert.alert(t("error"), t("chat.upload_image_failed"));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendLocation = async () => {
    setShowAttachMenu(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("error"), t("chat.permission_location"));
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
      Alert.alert(t("error"), e.message || t("chat.get_location_failed"));
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("error"), t("chat.permission_microphone"));
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingDuration((d) => d + 1),
        1000,
      );
    } catch (e: any) {
      Alert.alert(t("error"), e.message || t("chat.start_recording_failed"));
    }
  };

  const stopAndSend = async () => {
    if (!recording) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const dur = recordingDuration;
    setIsRecording(false);
    setRecordingDuration(0);
    setIsSending(true);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error("No recording URI.");
      const path = `chat/${conversation?.id || "unknown"}/${Date.now()}.m4a`;
      const url = await uploadFile(uri, path, "audio/m4a");
      await sendMessage({ type: "voice", url, duration: dur });
    } catch (e: any) {
      Alert.alert(t("error"), e.message || t("chat.send_voice_failed"));
    } finally {
      setIsSending(false);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try {
      await recording.stopAndUnloadAsync();
    } catch {}
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleToggleMute = async () => {
    await toggleMuteConversation();
  };

  const handleCall = () => {
    if (otherUser?.phone) Linking.openURL(`tel:${otherUser.phone}`);
    else Alert.alert(t("error"), t("chat.phone_not_available"));
  };

  // ─── Chat Bubble ──────────────────────────────────────────────────────────
  function ChatBubble({
    item,
    isMe,
    isOptimistic,
    isLastFromMe,
    isRead,
    onLongPress,
    onImagePress,
  }: any) {
    const content = parseContent(item.content);
    const bubbleBg = isMe ? themeColors.primary : themeColors.card;
    const textColor = isMe ? "#fff" : themeColors.text;

    const inner = () => {
      switch (content.type) {
        case "image":
          return (
            <TouchableOpacity
              onPress={() => onImagePress(content.url)}
              activeOpacity={0.9}
            >
              <Image
                source={{
                  uri: getOptimizedStorageImageUrl(content.url, "chat"),
                }}
                source={{
                  uri: getOptimizedStorageImageUrl(content.url, "chat"),
                }}
                style={{ width: 200, height: 155, borderRadius: 13 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        case "location":
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const u = Platform.select({
                  ios: `maps:?q=${content.label || "Location"}&ll=${content.latitude},${content.longitude}`,
                  android: `geo:${content.latitude},${content.longitude}?q=${content.label || "Location"}`,
                });
                if (u) Linking.openURL(u);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                borderRadius: 14,
                borderWidth: 1,
                minWidth: 200,
                maxWidth: 240,
                gap: 10,
                backgroundColor: isMe
                  ? "rgba(255,255,255,0.15)"
                  : themeColors.background,
                borderColor: themeColors.border + "40",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: isMe ? "#fff" : themeColors.primary + "20",
                }}
              >
                <MapPinIcon
                  size={18}
                  color={themeColors.primary}
                  weight="fill"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  numberOfLines={2}
                  style={{ color: textColor, fontWeight: "600", fontSize: 14 }}
                >
                  {content.label || t("chat.shared_location")}
                </ThemedText>
                <ThemedText
                  style={{ color: "#fff", fontSize: 11, marginTop: 2 }}
                >
                  {Number(content.latitude).toFixed(4)},{" "}
                  {Number(content.longitude).toFixed(4)}
                </ThemedText>
                <ThemedText
                  style={{
                    color: "#fff",
                    fontSize: 11,
                    marginTop: 4,
                    fontWeight: "500",
                  }}
                >
                  {t("chat.tap_to_open_map")}
                </ThemedText>
              </View>
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
              style={{
                color: textColor,
                fontSize: 15,
                lineHeight: isKhmer ? 30 : 22,
                includeFontPadding: false,
                textAlignVertical: "center",
              }}
            >
              {text}
            </ThemedText>
          );
        }
      }
    };

    return (
      <View
        style={{
          marginBottom: 8,
          maxWidth: "80%",
          alignSelf: isMe ? "flex-end" : "flex-start",
          alignItems: isMe ? "flex-end" : "flex-start",
          opacity: isOptimistic ? 0.6 : 1,
        }}
      >
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={350}
          style={[
            {
              // ── Khmer fix: less vertical padding so tall glyphs don't push bubble taller ──
              paddingVertical: isKhmer ? 6 : 10,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: bubbleBg,
              // ── Khmer fix: ensure text sits centered inside bubble ──
              justifyContent: "center",
            },
            content.type === "image" ? { padding: 3, borderRadius: 16 } : null,
          ]}
        >
          {inner()}
        </Pressable>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}
        >
          <ThemedText style={{ fontSize: 11, color: themeColors.text + "55" }}>
            {isOptimistic
              ? "Sending…"
              : new Date(item.created_at || "").toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
          </ThemedText>
          {isMe && isLastFromMe && (
            <View style={{ marginLeft: 4 }}>
              {isRead ? (
                <ChecksIcon
                  size={14}
                  color={themeColors.primary}
                  weight="bold"
                />
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

  // ─── Loading / Error ───────────────────────────────────────────────────────
  if (loading && !conversation) {
    return (
      <View
        style={[styles.centered, { backgroundColor: themeColors.background }]}
      >
        {/* ✅ Was hardcoded Colors.reds[500] — now uses themeColors.primary */}
        <ActivityIndicator size="small" color={themeColors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View
        style={[styles.centered, { backgroundColor: themeColors.background }]}
      >
        <ThemedText style={{ color: themeColors.error, marginBottom: 16 }}>
          {error}
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={{ color: themeColors.tint }}>
            {t("common.go_back")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.background,
            borderBottomColor: themeColors.border + "25",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <CaretLeftIcon size={28} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View>
            <Image
              source={{
                uri:
                  (sellerAvatar as string) || "https://via.placeholder.com/150",
              }}
              style={styles.headerAvatar}
            />
            {otherUserOnline && <View style={styles.onlineDot} />}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerName} numberOfLines={1}>
              {sellerName}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 12,
                color: otherUserOnline ? "#10B981" : themeColors.text + "50",
              }}
            >
              {otherUserOnline
                ? t("chat.active_now")
                : isMuted
                  ? t("chat.muted")
                  : t("chat.offline")}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleCall} style={styles.headerBtn}>
            <PhoneIcon size={22} color={themeColors.text} weight="fill" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowOptionsMenu(true)}
            style={styles.headerBtn}
          >
            <DotsThreeVerticalIcon
              size={22}
              color={themeColors.text}
              weight="bold"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Product banner ──────────────────────────────────────────────────── */}
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
          router.push(
            `/product/${productId || conversation?.product?.id}` as any,
          )
        }
      />
      <View
        style={{
          flex: 1,
          paddingBottom: Platform.OS === "ios" ? keyboardHeight : 0,
        }}
      >
        {/* ── Messages ────────────────────────────────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          getItemLayout={(_, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
          onScrollToIndexFailed={handleScrollIndexFailed}
          onLayout={() => {
            if (!hasScrolledOnMount.current && messages.length > 0) {
              scrollToBottom(false);
              hasScrolledOnMount.current = true;
            }
          }}
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
              <ChatBubble
                item={item}
                isMe={isMe}
                themeColors={themeColors}
                isOptimistic={isOptimistic}
                isLastFromMe={isLastFromMe}
                isRead={!!(item as any).is_read}
                onLongPress={() => handleMessageLongPress(item)}
                onImagePress={(url: string) => setViewingImage(url)}
              />
            );
          }}
        />

        {/* ── Recording bar ───────────────────────────────────────────────── */}
        {isRecording && (
          <View
            style={[
              styles.recordBar,
              {
                backgroundColor: themeColors.card,
                borderTopColor: themeColors.border + "30",
                paddingBottom: insets.bottom > 0 ? insets.bottom : 14,
              },
            ]}
          >
            <TouchableOpacity
              onPress={cancelRecording}
              style={styles.recordCancel}
            >
              <XIcon size={20} color={themeColors.error} weight="bold" />
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
            <TouchableOpacity
              onPress={stopAndSend}
              style={[
                styles.recordSend,
                { backgroundColor: themeColors.primary },
              ]}
            >
              <PaperPlaneTiltIcon size={18} color="#fff" weight="fill" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Attach menu ─────────────────────────────────────────────────── */}
        {showAttachMenu && !isRecording && (
          <View
            style={[
              styles.attachMenu,
              {
                backgroundColor: themeColors.card,
                borderTopColor: themeColors.border + "30",
                paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 18,
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

        {/* ── Input bar ───────────────────────────────────────────────────── */}
        {!isRecording && (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: themeColors.background,
                borderTopColor: themeColors.border + "30",
                paddingBottom: 20,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowAttachMenu((v) => !v)}
              style={[
                styles.roundBtn,
                {
                  backgroundColor: showAttachMenu
                    ? themeColors.primary
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

            <View
              style={[styles.inputWrap, { backgroundColor: themeColors.card }]}
            >
              <TextInput
                style={[styles.textInput, { color: themeColors.text }]}
                placeholder={t("chat.type_a_message")}
                placeholderTextColor={themeColors.text + "40"}
                value={inputText}
                onChangeText={(v) => {
                  setInputText(v);
                  if (showAttachMenu) setShowAttachMenu(false);
                }}
                multiline
                maxLength={2000}
                scrollEnabled={false}
              />
            </View>

            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSendText}
                disabled={isSending}
                style={[
                  styles.roundBtn,
                  { backgroundColor: themeColors.primary },
                ]}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <PaperPlaneTiltIcon size={20} color="#fff" weight="fill" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopAndSend}
                style={[styles.roundBtn, { backgroundColor: themeColors.card }]}
              >
                <MicrophoneIcon
                  size={22}
                  color={isRecording ? themeColors.primary : themeColors.text}
                  weight="fill"
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <ImageViewerModal
        visible={!!viewingImage}
        uri={viewingImage}
        onClose={() => setViewingImage(null)}
      />
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
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
  msgList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dateLine: { flex: 1, height: 1 },
  dateLabel: { fontSize: 12, fontWeight: "500" },
  recordBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
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
    justifyContent: "center",
    alignItems: "center",
  },
  attachMenu: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 18,
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
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.0)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
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
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  imageViewerClose: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImg: { width: "100%", height: "100%" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 200,
    maxWidth: 240,
    gap: 10,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  productCard: { borderBottomWidth: 1 },
  cardImageWrap: {
    width: "100%",
    height: 160,
    position: "relative",
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 160 },
  cardImagePlaceholder: {
    width: "100%",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cardBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  cardCollapseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 6,
  },
  cardPricePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cardPriceText: { fontSize: 14, fontWeight: "800" },
  cardViewBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  cardViewBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cardPill: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 7,
  },
  pillThumb: { width: 24, height: 24, borderRadius: 6 },
  pillTitle: { flex: 1, fontSize: 13, fontWeight: "600" },
  pillPrice: { fontSize: 12, fontWeight: "700" },
});
