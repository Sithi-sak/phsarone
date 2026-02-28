import DynamicPostFields from "@src/components/sell_components/DynamicPostFields";
import PriceAndDiscountForm from "@src/components/sell_components/PriceAndDiscountForm";
import AddressDropdowns from "@src/components/shared_components/AddressDropdowns";
import LocationPickerMap from "@src/components/shared_components/LocationPickerMap";
import PhotoUploadSection from "@src/components/shared_components/PhotoUploadSection";
import SellerContactForm from "@src/components/shared_components/SellerContactForm";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { POST_FIELDS_MAP } from "@src/constants/postFields";
import { useSellDraft } from "@src/context/SellDraftContext";
import { usePostProduct } from "@src/hooks/usePostProduct";
import useThemeColor from "@src/hooks/useThemeColor";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProductDetailsForm() {
  const { draft, updateDraft, setDraft, resetDraft } = useSellDraft();
  const { t } = useTranslation();
  const { editId } = useLocalSearchParams<{ editId: string }>();
  const [isInitialLoading, setIsInitialLoading] = useState(!!editId);

  const fields = POST_FIELDS_MAP[draft.subCategory] || [];
  const themeColors = useThemeColor();

  const { postProduct, updateProduct, fetchProductForEdit, isPosting } =
    usePostProduct();
  const router = useRouter();

  // Load existing product if editId is provided
  useEffect(() => {
    if (editId) {
      const loadProduct = async () => {
        try {
          setIsInitialLoading(true);
          const data = await fetchProductForEdit(editId);
          // Cast data to any to resolve the mismatch between Supabase Json and the local state Record
          setDraft(data as any);
        } catch (error) {
          Alert.alert("Error", "Failed to load product details.");
          router.back();
        } finally {
          setIsInitialLoading(false);
        }
      };
      loadProduct();
    }
  }, [editId]);

  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  const handleConfirmLocation = (location: {
    latitude: number;
    longitude: number;
  }) => {
    setIsLocationConfirmed(true);
    updateDraft("location", location);
  };

  const handlePost = async () => {
    if (!draft.photos || draft.photos.length === 0) {
      Alert.alert(t("common.error"), t("sellSection.photo_required"));
      return;
    }

    try {
      if (editId) {
        await updateProduct(editId, draft);
        Alert.alert(t("common.success"), t("sellSection.update_success"));
      } else {
        await postProduct(draft);
        Alert.alert(t("common.success"), t("sellSection.post_success"));
      }
      resetDraft();
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Post handle error:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("sellSection.save_failed"),
      );
    }
  };

  if (isInitialLoading) {
    return (
      <View
        style={[styles.center, { backgroundColor: themeColors.background }]}
      >
        <ActivityIndicator size="small" color={themeColors.primary} />
        <ThemedText style={{ marginTop: 12 }}>
          {t("sellSection.loading_details")}
        </ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: themeColors.background }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.header, { backgroundColor: themeColors.background }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>

        <ThemedText style={styles.headerTitle}>
          {editId
            ? t("sellSection.edit_listing")
            : t(`subcategories.${draft.subCategory}`) || draft.subCategory}
        </ThemedText>

        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: themeColors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={[{ key: "formContent" }]}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={styles.formContainer}>
              {/* Card 1: Main Info & Photos */}
              <View
                style={[styles.card, { backgroundColor: themeColors.card }]}
              >
                <PhotoUploadSection
                  themeColors={themeColors}
                  photos={draft.photos}
                  onUpdatePhotos={(newPhotos) =>
                    updateDraft("photos", newPhotos)
                  }
                />

                <DynamicPostFields
                  fields={fields}
                  themeColors={themeColors}
                  t={t}
                />
              </View>

              {/* Card 2: Pricing */}
              <View
                style={[styles.card, { backgroundColor: themeColors.card }]}
              >
                <PriceAndDiscountForm />
              </View>

              {/* Card 3: Location */}
              <View
                style={[styles.card, { backgroundColor: themeColors.card }]}
              >
                <ThemedText style={styles.sectionTitle}>
                  {t("sellSection.Pin_Location")}
                </ThemedText>
                <LocationPickerMap
                  themeColors={themeColors}
                  t={t}
                  onConfirmLocation={handleConfirmLocation}
                  currentDraft={draft}
                  onUpdateDraft={(key, value) => updateDraft(key as any, value)}
                />

                <AddressDropdowns
                  currentDraft={draft}
                  onUpdateDraft={updateDraft}
                />
              </View>

              {/* Card 4: Contact Detail */}
              <View
                style={[styles.card, { backgroundColor: themeColors.card }]}
              >
                <SellerContactForm themeColors={themeColors} t={t} />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: themeColors.secondaryBackground },
                  ]}
                  onPress={() => router.back()}
                >
                  <ThemedText
                    style={[styles.cancelBtnText, { color: themeColors.text }]}
                  >
                    {t("common.cancel")}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: themeColors.primary },
                    isPosting && { opacity: 0.7 },
                  ]}
                  onPress={handlePost}
                  disabled={isPosting}
                >
                  <ThemedText style={styles.submitBtnText}>
                    {isPosting
                      ? t("sellSection.saving")
                      : editId
                        ? t("sellSection.update")
                        : t("sellSection.save")}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          }
          keyExtractor={(item) => item.key}
        />
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
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  backButton: {
    padding: 8,
  },
  formContainer: {
    padding: 8,
    gap: 16,
  },
  card: {
    padding: 12,
    borderRadius: 16,
    borderCurve: "continuous",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 99,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 99,
    alignItems: "center",
  },
  submitBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
