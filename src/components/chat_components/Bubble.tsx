import LocationMessage from "@src/components/chat_components/LocationMessage";
import VoicePlayer from "@src/components/chat_components/VoicePlayer";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { parseContent } from "@src/utils/chatUtils";
import { CheckIcon, ChecksIcon } from "phosphor-react-native";
import React from "react";
import { Image, Pressable, TouchableOpacity, View } from "react-native";

const KHMER_REGEX = /[\u1780-\u17FF]/;

export default function Bubble({
  item,
  isMe,
  themeColors,
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
              source={{ uri: content.url }}
              style={{ width: 200, height: 155, borderRadius: 13 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      case "location":
        return (
          <LocationMessage
            latitude={Number(content.latitude)}
            longitude={Number(content.longitude)}
            label={content.label}
            isMe={isMe}
            themeColors={themeColors}
            onDelete={onLongPress}
          />
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
              lineHeight: 22,
            }}
          >
            {text}
          </ThemedText>
        );
      }
    }
  };

  // Detect Khmer in text messages for bubble padding adjustment
  const text =
    content.type === "text"
      ? content.text ||
        content.message ||
        (typeof item.content === "string" ? item.content : "")
      : "";
  const hasKhmerContent = KHMER_REGEX.test(text);

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
            paddingVertical: hasKhmerContent ? 5 : 10,
            paddingHorizontal: 14,
            borderRadius: 18,
            backgroundColor: bubbleBg,
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
