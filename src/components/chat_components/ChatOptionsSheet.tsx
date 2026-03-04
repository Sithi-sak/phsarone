import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Pressable, TouchableOpacity, View } from "react-native";

export default function ChatOptionsSheet({
  visible,
  onClose,
  onMute,
  onBlock,
  themeColors: propsThemeColors,
  isMuted,
  otherUserName,
}: any) {
  const { t } = useTranslation();
  const hookThemeColors = useThemeColor();
  const themeColors = propsThemeColors || hookThemeColors;

  const handleMutePress = async () => {
    try {
      if (onMute) await onMute();
    } catch (e) {
      // swallow - parent will handle errors
    } finally {
      if (onClose) onClose();
    }
  };

  const handleBlockPress = async () => {
    // Ask for confirmation inside the sheet so we can await the full flow
    const confirmed: boolean = await new Promise((resolve) => {
      Alert.alert(
        t("chat.block_user_title"),
        t("chat.block_user_confirmation", {
          userName: otherUserName || "this user",
        }),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: t("chat.block"),
            style: "destructive",
            onPress: () => resolve(true),
          },
        ],
      );
    });

    if (!confirmed) return;

    try {
      if (onBlock) await onBlock();
    } catch (e) {
      // swallow - parent will handle errors
    } finally {
      if (onClose) onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      >
        <View
          style={{
            marginTop: "auto",
            backgroundColor: themeColors.card,
            padding: 20,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <TouchableOpacity onPress={handleMutePress}>
            <ThemedText style={{ paddingVertical: 12 }}>
              {isMuted
                ? t("chat.unmute_notifications")
                : t("chat.mute_notifications")}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBlockPress}>
            <ThemedText style={{ paddingVertical: 12, color: "#EF4444" }}>
              {t("chat.block")}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={{ paddingVertical: 12 }}>
              {t("common.cancel")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
