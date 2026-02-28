import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import React from "react";
import { Linking, StyleSheet, TouchableOpacity } from "react-native";

interface ProductLocationProps {
  fullAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

const ProductLocation: React.FC<ProductLocationProps> = ({
  fullAddress,
  location,
}) => {
  const themeColors = useThemeColor();

  const handleOpenMap = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  return (
    <TouchableOpacity style={styles.locationContainer} onPress={handleOpenMap}>
      <Ionicons name="location-outline" size={16} color={themeColors.text} />
      <ThemedText style={styles.locationText}>{fullAddress}</ThemedText>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={themeColors.text + "60"}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  locationText: {
    fontSize: 14,
    opacity: 0.6,
    flex: 1,
  },
});

export default ProductLocation;
