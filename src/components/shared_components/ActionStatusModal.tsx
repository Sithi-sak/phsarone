import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
} from "phosphor-react-native";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type ActionStatusModalProps = {
  actionLabel?: string;
  description: string;
  hideHeaderTone?: boolean;
  onClose: () => void;
  title: string;
  tone?: "error" | "info" | "success";
  visible: boolean;
};

export default function ActionStatusModal({
  actionLabel = "Done",
  description,
  hideHeaderTone = false,
  onClose,
  title,
  tone = "success",
  visible,
}: ActionStatusModalProps) {
  const themeColors = useThemeColor();
  const toneConfig =
    tone === "error"
      ? {
          badgeBackground: "#FEECE9",
          badgeText: "#B42318",
          icon: <WarningCircleIcon size={20} color="#B42318" weight="fill" />,
          iconBackground: "#FDE8E8",
          label: "Something needs attention",
        }
      : tone === "info"
        ? {
            badgeBackground: themeColors.tint + "18",
            badgeText: themeColors.tint,
            icon: <InfoIcon size={20} color={themeColors.tint} weight="fill" />,
            iconBackground: themeColors.tint + "14",
            label: "Update",
          }
        : {
            badgeBackground: themeColors.tint + "18",
            badgeText: themeColors.tint,
            icon: <CheckCircleIcon size={20} color="#0F9D58" weight="fill" />,
            iconBackground: "#E7F6EC",
            label: "Success",
          };

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
          {!hideHeaderTone && (
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: toneConfig.iconBackground },
                ]}
              >
                {toneConfig.icon}
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: toneConfig.badgeBackground },
                ]}
              >
                <ThemedText
                  style={[styles.badgeText, { color: toneConfig.badgeText }]}
                >
                  {toneConfig.label}
                </ThemedText>
              </View>
            </View>
          )}

          <ThemedText style={[styles.title, { color: themeColors.text }]}>
            {title}
          </ThemedText>
          <ThemedText
            style={[styles.description, { color: themeColors.text + "B3" }]}
          >
            {description}
          </ThemedText>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: themeColors.tint }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <ThemedText
              style={[
                styles.primaryButtonText,
                { color: themeColors.primaryButtonText },
              ]}
            >
              {actionLabel}
            </ThemedText>
          </TouchableOpacity>
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
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#E7F6EC",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
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
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
