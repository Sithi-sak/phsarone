import { useAuth, useUser } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ThemedTextInput } from "@src/components/shared_components/ThemedTextInput";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { CameraIcon, CaretLeftIcon } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProfileScreen() {
  const { userId, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const supabase = createClerkSupabaseClient(token);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId as string)
        .single();

      if (error) throw error;
      if (data) {
        const user = data as any;
        setFormData({
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          phone: user.phone || "",
          bio: user.bio || "",
          avatar_url: user.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!userId) return;
    try {
      setSaving(true);
      const token = await getToken();
      const supabase = createClerkSupabaseClient(token);

      const fileName = `${userId as string}/avatar-${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, decode(base64), {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(t("error"), t("profile_screen.upload_failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      const token = await getToken();
      const supabase = createClerkSupabaseClient(token);

      const { error } = await supabase
        .from("users")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
        })
        .eq("id", userId as string);

      if (error) throw error;

      Alert.alert(t("success"), t("profile_screen.update_success"));
      router.back();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert(t("error"), t("profile_screen.update_failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.center, { backgroundColor: themeColors.background }]}
      >
        <ActivityIndicator size="small" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.header, { backgroundColor: themeColors.background }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{t("profile_screen.edit_profile")}</ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator size="small" color={themeColors.primary} />
          ) : (
            <ThemedText
              style={[styles.saveText, { color: themeColors.primary }]}
            >
              {t("profile_screen.save")}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: themeColors.background }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: formData.avatar_url || "https://via.placeholder.com/150",
                }}
                style={styles.avatar}
              />
              <View
                style={[
                  styles.cameraIcon,
                  {
                    backgroundColor: themeColors.primary,
                    borderColor: themeColors.background,
                  },
                ]}
              >
                <CameraIcon size={20} color="#FFF" weight="fill" />
              </View>
            </TouchableOpacity>
            <ThemedText
              style={[styles.changePhotoText, { color: themeColors.primary }]}
            >
              {t("profile_screen.change_photo")}
            </ThemedText>
          </View>

          {/* Form Fields */}
          <View
            style={[styles.formCard, { backgroundColor: themeColors.card }]}
          >
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>{t("profile_screen.first_name")}</ThemedText>
              <ThemedTextInput
                style={[
                  styles.input,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  },
                ]}
                value={formData.first_name}
                onChangeText={(val) =>
                  setFormData((prev) => ({ ...prev, first_name: val }))
                }
                placeholder={t("profile_screen.first_name_placeholder")}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>{t("profile_screen.last_name")}</ThemedText>
              <ThemedTextInput
                style={[
                  styles.input,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  },
                ]}
                value={formData.last_name}
                onChangeText={(val) =>
                  setFormData((prev) => ({ ...prev, last_name: val }))
                }
                placeholder={t("profile_screen.last_name_placeholder")}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>{t("profile_screen.phone_number")}</ThemedText>
              <ThemedTextInput
                style={[
                  styles.input,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  },
                ]}
                value={formData.phone}
                onChangeText={(val) =>
                  setFormData((prev) => ({ ...prev, phone: val }))
                }
                placeholder={t("profile_screen.phone_placeholder")}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>{t("profile_screen.bio")}</ThemedText>
              <ThemedTextInput
                style={[
                  styles.input,
                  styles.bioInput,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  },
                ]}
                value={formData.bio}
                onChangeText={(val) =>
                  setFormData((prev) => ({ ...prev, bio: val }))
                }
                placeholder={t("profile_screen.bio_placeholder")}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  backBtn: {
    padding: 8,
  },
  saveBtn: {
    padding: 8,
    paddingHorizontal: 16,
  },
  saveText: {
    fontWeight: "700",
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EEE",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  changePhotoText: {
    marginTop: 12,
    fontWeight: "600",
    fontSize: 14,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    gap: 20,
    elevation: 2,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
  },
  bioInput: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
