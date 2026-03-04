import { Stack } from "expo-router";
import { View } from "react-native";

export default function TradeStackLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="AddTradeProductScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="[id]" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
