import { useAuth, useUser } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ThemedTextInput } from "@src/components/shared_components/ThemedTextInput";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileOnboardingScreen() {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const themeColors = useThemeColor();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!userId) return;

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName) {
      Alert.alert("Name required", "Please enter your name before continuing.");
      return;
    }

    try {
      setSaving(true);
      const token = await getAuthToken(getToken, "profile onboarding save", {
        timeoutMs: 30000,
        retries: 1,
      });
      const supabase = createClerkSupabaseClient(token);

      const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        throw new Error("Missing account email.");
      }

      const { error } = await supabase.from("users").upsert({
        id: userId,
        email,
        first_name: normalizedFirstName,
        last_name: normalizedLastName || null,
      });

      if (error) throw error;
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Could not save profile", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={styles.content}>
        <View style={styles.copyBlock}>
          <ThemedText style={styles.title}>Finish your profile</ThemedText>
          <ThemedText style={[styles.subtitle, { color: themeColors.text }]}>Add your name before entering the marketplace.</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <ThemedText style={styles.label}>First name</ThemedText>
          <ThemedTextInput
            placeholder="Your first name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            style={styles.input}
          />

          <ThemedText style={[styles.label, styles.secondaryLabel]}>Last name (optional)</ThemedText>
          <ThemedTextInput
            placeholder="Your last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.primary }, saving && styles.buttonDisabled]}
          activeOpacity={0.8}
          onPress={handleContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Continue</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  copyBlock: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.72,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  secondaryLabel: {
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingLeft: 18,
    paddingVertical: 12,
  },
  button: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
