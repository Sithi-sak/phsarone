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

type BoostListingModalProps = {
  description: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export default function BoostListingModal({
  description,
  isSubmitting = false,
  onClose,
  onConfirm,
  title,
  visible,
}: BoostListingModalProps) {
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
              disabled={isSubmitting}
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: themeColors.text }]}
              >
                Cancel
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: themeColors.tint },
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <ThemedText
                style={[
                  styles.primaryButtonText,
                  { color: themeColors.primaryButtonText },
                ]}
              >
                {isSubmitting ? "Boosting..." : "Boost"}
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
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: "100%",
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
    borderRadius: 99,
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
    borderRadius: 99,
    flex: 1,
    paddingVertical: 13,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 14,
  },
});
