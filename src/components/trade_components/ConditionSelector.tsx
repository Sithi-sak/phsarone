import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Colors } from "@src/constants/Colors";
import useThemeColor from "@src/hooks/useThemeColor";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";

interface ConditionOption {
  label: string;
  value: string;
}

interface ConditionSelectorProps {
  condition: string;
  onSelectCondition: (value: string) => void;
  options: ConditionOption[];
  containerStyle?: ViewStyle;
}

export default function ConditionSelector({
  condition,
  onSelectCondition,
  options,
  containerStyle,
}: ConditionSelectorProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  return (
    <View style={[styles.conditionContainer, containerStyle]}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.conditionButton,
            {
              backgroundColor:
                condition === option.value
                  ? Colors.reds[500]
                  : themeColors.background,
              borderColor:
                condition === option.value
                  ? Colors.reds[500]
                  : themeColors.border,
            },
          ]}
          onPress={() => onSelectCondition(option.value)}
        >
          <ThemedText
            style={[
              styles.conditionText,
              {
                color:
                  condition === option.value ? "#FFFFFF" : themeColors.text,
              },
            ]}
          >
            {option.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  conditionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: "400",
  },
});
