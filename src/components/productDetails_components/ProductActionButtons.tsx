import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Colors } from "@src/constants/Colors";
import useThemeColor from "@src/hooks/useThemeColor";
import {
  ChatCircleIcon,
  PencilSimpleIcon,
  PhoneIcon,
  TrashIcon,
} from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface ProductActionButtonsProps {
  onCallSeller?: () => void;
  onChatSeller?: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ProductActionButtons: React.FC<ProductActionButtonsProps> = ({
  onCallSeller,
  onChatSeller,
  isOwner,
  onEdit,
  onDelete,
}) => {
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  const styles = getStyles(themeColors);

  if (isOwner) {
    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <TrashIcon size={20} color={Colors.reds[500]} />
          <ThemedText style={styles.deleteButtonText}>
            {t("common.delete")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <PencilSimpleIcon size={20} color="white" />
          <ThemedText style={styles.editButtonText}>
            {t("listings_screen.edit")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.actionButtons}>
      <TouchableOpacity style={styles.callButton} onPress={onCallSeller}>
        <PhoneIcon size={20} color="white" />
        <ThemedText style={styles.callButtonText}>
          {t("productDetail.callSeller")}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.chatButton,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.text + "20",
          },
        ]}
        onPress={onChatSeller}
      >
        <ChatCircleIcon size={20} color={themeColors.text} />
        <ThemedText style={styles.chatButtonText}>
          {t("productDetail.chatSeller")}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (themeColors: ReturnType<typeof useThemeColor>) =>
  StyleSheet.create({
    actionButtons: {
      flexDirection: "row",
      gap: 10,
      height: 50,
      paddingHorizontal: 16,
      backgroundColor: themeColors.background,
      paddingVertical: 4,
    },
    callButton: {
      flex: 1,
      backgroundColor: themeColors.tint,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 99,
      gap: 8,
    },
    callButtonText: {
      color: "white",
      fontSize: 15,
      fontWeight: "600",
    },
    chatButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 99,
      gap: 8,
      borderWidth: 1,
    },
    chatButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: themeColors.text,
    },
    editButton: {
      flex: 1,
      backgroundColor: Colors.reds[500],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 99,
      gap: 8,
    },
    editButtonText: {
      color: "white",
      fontSize: 15,
      fontWeight: "600",
    },
    deleteButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 99,
      gap: 8,
      borderWidth: 1,
      borderColor: Colors.reds[500],
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: Colors.reds[500],
    },
  });

export default ProductActionButtons;
