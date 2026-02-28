import { Ionicons } from "@expo/vector-icons";
import useThemeColor from "@src/hooks/useThemeColor";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

interface ProductHeaderProps {
  onShare: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
}

const ProductHeader: React.FC<ProductHeaderProps> = ({
  onShare,
  onFavorite,
  isFavorite,
}) => {
  const router = useRouter();
  const themeColors = useThemeColor();

  return (
    <View style={[styles.header, { backgroundColor: themeColors.background }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.headerButton}
      >
        <Ionicons
          name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
          size={24}
          color={themeColors.text}
        />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={onShare} style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onFavorite} style={styles.headerButton}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? themeColors.tint : themeColors.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
});

export default ProductHeader;
