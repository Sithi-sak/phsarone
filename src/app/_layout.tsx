import ThemedStatusBar from "@/src/components/shared_components/ThemedStatusBar";
import SellDraftProvider from "@/src/context/SellDraftContext";
import TradeProductsProvider from "@/src/context/TradeProductsContext";
import TradeDraftProvider from "@/src/context/TradeDraftContext";
import { ThemeProvider } from "@/src/context/ThemeContext";
import i18n from "@/src/i18n";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const [loaded, error] = useFonts({
    "khmer-regular": require("@src/assets/fonts/KantumruyPro-Regular.ttf"),
    "khmer-KantumruyPro-Bold": require("@src/assets/fonts/KantumruyPro-Bold.ttf"),
  });

  const loadSavedLanguage = useCallback(async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem("user-language");
      if (savedLanguage) {
        await i18n.changeLanguage(savedLanguage);
      }
    } catch (e) {
      console.error("Failed to load language", e);
    } finally {
      setLanguageLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSavedLanguage();
  }, [loadSavedLanguage]);

  useEffect(() => {
    if ((loaded || error) && languageLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, languageLoaded]);

  if (!loaded && !error && !languageLoaded) {
    return null;
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <TradeProductsProvider>
              <TradeDraftProvider>
                <SellDraftProvider>
                  <ThemedStatusBar />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="sell" />
                    <Stack.Screen name="settings" />
                  </Stack>
                </SellDraftProvider>
              </TradeDraftProvider>
            </TradeProductsProvider>
          </I18nextProvider>
        </ThemeProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
