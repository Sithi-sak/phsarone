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
    "MiSansLatin-Normal": require("@src/assets/fonts/MiSansLatin-Normal.ttf"),
    "MiSansLatin-Medium": require("@src/assets/fonts/MiSansLatin-Medium.ttf"),
    "MiSansLatin-Semibold": require("@src/assets/fonts/MiSansLatin-Semibold.ttf"),
    "MiSansLatin-Bold": require("@src/assets/fonts/MiSansLatin-Bold.ttf"),
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
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animationDuration: 300,
                      gestureEnabled: true,
                      gestureDirection: "horizontal",
                    }}
                  >
                    <Stack.Screen
                      name="(auth)"
                      options={{
                        animationDuration: 250,
                      }}
                    />
                    <Stack.Screen
                      name="(tabs)"
                      options={{
                        animationDuration: 250,
                      }}
                    />
                    <Stack.Screen
                      name="sell"
                      options={{
                        presentation: "modal",
                        animationDuration: 300,
                      }}
                    />
                    <Stack.Screen
                      name="settings"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="product/[id]"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="category/[id]"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="chat"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="user"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="trade"
                      options={{
                        presentation: "modal",
                        animationDuration: 300,
                      }}
                    />
                    <Stack.Screen
                      name="notifications"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="subscription"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="favorites"
                      options={{
                        animationDuration: 280,
                      }}
                    />
                    <Stack.Screen
                      name="search"
                      options={{
                        animationDuration: 250,
                      }}
                    />
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
