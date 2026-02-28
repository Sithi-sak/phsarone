import { PaperPlaneRight } from "phosphor-react-native";
import React, { useRef } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";

export default function ChatInputBar({
  value,
  onChange,
  onSend,
  themeColors,
}: any) {
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
      // Clear input after sending
      onChange("");
      inputRef.current?.clear();
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        padding: 10,
        borderTopWidth: 1,
        borderColor: themeColors.border,
        backgroundColor: themeColors.card,
        alignItems: "center",
        gap: 10,
      }}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onEndEditing={() => inputRef.current?.clear()}
        placeholder="Type a message..."
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        keyboardType="default"
        autoComplete="off"
        textContentType="none"
        inputAccessoryViewID={undefined}
        disableFullscreenUI={true}
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          color: themeColors.text,
        }}
      />
      <TouchableOpacity onPress={handleSend}>
        <PaperPlaneRight size={22} color={themeColors.primary} />
      </TouchableOpacity>
    </View>
  );
}
