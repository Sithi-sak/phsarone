import DataQualityWarnings from "@src/components/sell_components/DataQualityWarnings";
import DynamicPostFields from "@src/components/sell_components/DynamicPostFields";
import FormattedProductPreview from "@src/components/sell_components/FormattedProductPreview";
import FormattingFeatureBanner from "@src/components/sell_components/FormattingFeatureBanner";
import PriceAndDiscountForm from "@src/components/sell_components/PriceAndDiscountForm";
import ProductDetailsCompletion from "@src/components/sell_components/ProductDetailsCompletion";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import AddressDropdowns from "@src/components/shared_components/AddressDropdowns";
import LocationPickerMap from "@src/components/shared_components/LocationPickerMap";
import PhotoUploadSection from "@src/components/shared_components/PhotoUploadSection";
import SellerContactForm from "@src/components/shared_components/SellerContactForm";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { POST_FIELDS_MAP } from "@src/constants/postFields";
import { useSellDraft } from "@src/context/SellDraftContext";
import { usePostProduct } from "@src/hooks/usePostProduct";
import useThemeColor from "@src/hooks/useThemeColor";
import { useAuth } from "@clerk/clerk-expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon, ListBullets, SparkleIcon } from "phosphor-react-native";
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
  const { isLoaded: isAuthLoaded } = useAuth();
  const { t } = useTranslation();
  const { editId } = useLocalSearchParams<{ editId: string }>();
  const [isInitialLoading, setIsInitialLoading] = useState(!!editId);
  const [showFormattedDetails, setShowFormattedDetails] = useState(true);
  const [successPrompt, setSuccessPrompt] = useState<{
    description: string;
    tone?: "error" | "info" | "success";
    title: string;
    visible: boolean;
  }>({
    description: "",
    title: "",
    tone: "success",
    visible: false,
  });

  const fields = POST_FIELDS_MAP[draft.subCategory] || [];
  const themeColors = useThemeColor();

  const { postProduct, saveDraft, updateProduct, fetchProductForEdit, isPosting } =
    usePostProduct();
  const router = useRouter();
  const editingStatus = String((draft as any)._status || "").toLowerCase();
  const isDraftFlow = !editId || editingStatus === "draft";

  // Load existing product if editId is provided
  useEffect(() => {
    if (editId && isAuthLoaded) {
      const loadProduct = async () => {
        try {
          setIsInitialLoading(true);
          const data = await fetchProductForEdit(editId);
          // Cast data to any to resolve the mismatch between Supabase Json and the local state Record
          setDraft(data as any);
        } catch (error) {
          Alert.alert(t("common.error"), t("sellSection.load_failed"));
          router.back();
        } finally {
          setIsInitialLoading(false);
        }
      };
      loadProduct();
    }
  }, [editId, isAuthLoaded]);

  useEffect(() => {
    return () => {
      // Keep image input clean when user leaves this screen.
      setDraft((prev) => ({ ...prev, photos: [] }));
    };
  }, [setDraft]);

  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  const handleConfirmLocation = (location: {
    latitude: number;
    longitude: number;
  }) => {
    setIsLocationConfirmed(true);
    updateDraft("location", location);
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft(draft, editId);
      setSuccessPrompt({
        description: t("sellSection.draft_success"),
        title: t("sellSection.draft_saved_title"),
        tone: "success",
        visible: true,
      });
      resetDraft();
    } catch (error: any) {
      const message = error.message || t("sellSection.save_failed");
      setSuccessPrompt({
        description: message,
        title: message.includes("prohibited content")
          ? "Listing not allowed"
          : t("common.error"),
        tone: "error",
        visible: true,
      });
    }
  };

  const handlePost = async () => {
    if (!draft.photos || draft.photos.length === 0) {
      Alert.alert(t("common.error"), t("sellSection.photo_required"));
      return;
    }

    try {
      if (editId && editingStatus !== "draft") {
        await updateProduct(editId, draft);
        setSuccessPrompt({
          description: t("sellSection.update_success"),
          title: t("sellSection.update_title"),
          tone: "success",
          visible: true,
        });
      } else if (editId && editingStatus === "draft") {
        await updateProduct(editId, draft);
        setSuccessPrompt({
          description: t("sellSection.post_success"),
          title: t("sellSection.publish_title"),
          tone: "success",
          visible: true,
        });
      } else {
        await postProduct(draft);
        setSuccessPrompt({
          description: t("sellSection.post_success"),
          title: t("sellSection.publish_title"),
          tone: "success",
          visible: true,
        });
      }
      resetDraft();
    } catch (error: any) {
      const message = error.message || t("sellSection.save_failed");
      setSuccessPrompt({
        description: message,
        title: message.includes("prohibited content")
          ? "Listing not allowed"
          : t("common.error"),
        tone: "error",
        visible: true,
      });
    }
  };

  const handleNavigateBack = () => {
    if (!editId) {
      resetDraft();
    } else {
      updateDraft("photos", []);
    }
    router.back();
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
      <ActionStatusModal
        visible={successPrompt.visible}
        hideHeaderTone
        title={successPrompt.title}
        description={successPrompt.description}
        actionLabel="Continue"
        tone={successPrompt.tone}
        onClose={() => {
          const shouldGoHome = successPrompt.tone !== "error";
          setSuccessPrompt((current) => ({
            ...current,
            tone: "success",
            visible: false,
          }));
          if (shouldGoHome) {
            router.replace("/(tabs)");
          }
        }}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.header, { backgroundColor: themeColors.background }]}
      >
        <TouchableOpacity
          onPress={handleNavigateBack}
          style={styles.backButton}
        >
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <ThemedText style={styles.headerTitle}>
            {editId
              ? t("sellSection.edit_listing")
              : t(`subcategories.${draft.subCategory}`) || draft.subCategory}
          </ThemedText>
          <ThemedText
            style={[styles.headerSubtitle, { color: themeColors.text }]}
          >
            {t("productDetailsComponents.detailsSubtitle")}
          </ThemedText>
        </View>

        <TouchableOpacity
          onPress={() => setShowFormattedDetails(!showFormattedDetails)}
          style={[
            styles.toggleButton,
            {
              backgroundColor: showFormattedDetails
                ? themeColors.primary
                : themeColors.card,
              borderColor: showFormattedDetails
                ? themeColors.primary
                : themeColors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          {showFormattedDetails ? (
            <>
              <SparkleIcon size={18} color="white" weight="fill" />
              <ThemedText style={styles.toggleButtonTextActive}>
                {t("productDetailsComponents.format")}
              </ThemedText>
            </>
          ) : (
            <>
              <ListBullets
                size={18}
                color={themeColors.text}
                weight="regular"
              />
              <ThemedText
                style={[styles.toggleButtonText, { color: themeColors.text }]}
              >
                {t("productDetailsComponents.format")}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: themeColors.background }}
        behavior="padding"
        enabled={Platform.OS === "ios"}
      >
        <FlatList
          data={[{ key: "formContent" }]}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={styles.formContainer}>
              <FormattingFeatureBanner
                isEnabled={showFormattedDetails}
                onToggle={() => setShowFormattedDetails(!showFormattedDetails)}
              />

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

                <DataQualityWarnings
                  subCategory={draft.subCategory}
                  details={draft.details}
                />

                {showFormattedDetails && (
                  <>
                    {Object.keys(draft.details).length > 0 && (
                      <FormattedProductPreview
                        subCategory={draft.subCategory}
                        details={draft.details}
                        title={t("productDetailsComponents.detailsSummary")}
                      />
                    )}

                    <ProductDetailsCompletion
                      subCategory={draft.subCategory}
                      details={draft.details}
                      showMissingFields={true}
                    />
                  </>
                )}
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
                  onPress={isDraftFlow ? handleSaveDraft : handleNavigateBack}
                >
                  <ThemedText
                    style={[styles.cancelBtnText, { color: themeColors.text }]}
                  >
                    {isDraftFlow ? t("sellSection.save_draft") : t("common.cancel")}
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
                      : editId && !isDraftFlow
                        ? t("sellSection.update")
                        : t("sellSection.post")}
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.7,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  toggleButtonTextActive: {
    color: "white",
    fontSize: 14,
    fontWeight: "800",
  },
  formContainer: {
    padding: 8,
    gap: 16,
  },
  card: {
    padding: 12,
    borderRadius: 16,
    borderCurve: "continuous",
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
