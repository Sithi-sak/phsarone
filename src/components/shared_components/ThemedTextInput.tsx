import useThemeColor from "@src/hooks/useThemeColor";
import { TextInput, TextInputProps } from "react-native";

export function ThemedTextInput({ style, ...props }: TextInputProps) {
  const themeColors = useThemeColor();

  return (
    <TextInput
      style={[
        {
          borderWidth: 1,
          color: themeColors.text,
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
        },
        style,
      ]}
      placeholderTextColor={themeColors.tabIconDefault}
      {...props}
    />
  );
}
