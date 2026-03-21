import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

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
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!visible) {
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(40);
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY, visible]);

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
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border + "20",
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: themeColors.border + "90" },
            ]}
          />
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
});
