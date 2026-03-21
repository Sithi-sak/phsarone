import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type UpgradePromptModalProps = {
  ctaLabel?: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export default function UpgradePromptModal({
  ctaLabel = "View plans",
  description,
  onClose,
  onConfirm,
  title,
  visible,
}: UpgradePromptModalProps) {
  const themeColors = useThemeColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View
            style={[
              styles.badge,
              { backgroundColor: themeColors.tint + "18" },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: themeColors.tint }]}>
              Premium Access
            </ThemedText>
          </View>

          <ThemedText style={[styles.title, { color: themeColors.text }]}>
            {title}
          </ThemedText>
          <ThemedText
            style={[styles.description, { color: themeColors.text + "B3" }]}
          >
            {description}
          </ThemedText>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: themeColors.border },
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: themeColors.text }]}
              >
                Not now
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: themeColors.tint },
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <ThemedText
                style={[
                  styles.primaryButtonText,
                  { color: themeColors.primaryButtonText },
                ]}
              >
                {ctaLabel}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.46)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: "100%",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 13,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
