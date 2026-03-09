import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface DashboardHeaderProps {
  title: string;
}

export default function DashboardHeader({ title }: DashboardHeaderProps) {
  const themeColors = useThemeColor();
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        activeOpacity={0.75}
      >
        <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
      </TouchableOpacity>

      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backBtn: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  rightSpacer: {
    width: 36,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
});