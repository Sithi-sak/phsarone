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
  TextStyle,
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
  const popoverOpacity = useRef(new Animated.Value(0)).current;
  const popoverScale = useRef(new Animated.Value(0.96)).current;
  const popoverTranslateY = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    if (!visible) {
      backdropOpacity.setValue(0);
      popoverOpacity.setValue(0);
      popoverScale.setValue(0.96);
      popoverTranslateY.setValue(-6);
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(popoverOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(popoverScale, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(popoverTranslateY, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    backdropOpacity,
    popoverOpacity,
    popoverScale,
    popoverTranslateY,
    visible,
  ]);

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
            styles.popover,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
              opacity: popoverOpacity,
              transform: [
                { translateY: popoverTranslateY },
                { scale: popoverScale },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleMutePress}
            style={styles.popoverItem}
          >
            <ThemedText style={styles.popoverItemText as TextStyle}>
              {isMuted
                ? t("chat.unmute_notifications")
                : t("chat.mute_notifications")}
            </ThemedText>
          </TouchableOpacity>
          <View
            style={[
              styles.divider,
              { backgroundColor: themeColors.border + "90" },
            ]}
          />
          <TouchableOpacity
            onPress={handleBlockPress}
            style={styles.popoverItem}
          >
            <ThemedText style={[styles.popoverItemText as TextStyle, { color: "#EF4444" }]}>
              {t("chat.block")}
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  popover: {
    position: "absolute",
    top: 64,
    right: 16,
    minWidth: 190,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },
  popoverItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  popoverItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
  },
});
