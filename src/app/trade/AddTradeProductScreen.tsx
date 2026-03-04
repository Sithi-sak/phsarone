import { useAuth, useUser } from "@clerk/clerk-expo";
import AddressDropdowns from "@src/components/shared_components/AddressDropdowns";
import DynamicPhosphorIcon from "@src/components/shared_components/DynamicPhosphorIcon";
import LocationPickerMap from "@src/components/shared_components/LocationPickerMap";
import PhotoUploadSection from "@src/components/shared_components/PhotoUploadSection";
import ThemedCard from "@src/components/shared_components/ThemedCard";
import ThemedInput from "@src/components/shared_components/ThemedInput";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import ConditionSelector from "@src/components/trade_components/ConditionSelector";
import { Colors } from "@src/constants/Colors";
import { useTradeDraft } from "@src/context/TradeDraftContext";
import { useTradeProducts } from "@src/context/TradeProductsContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { XIcon } from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddTradeProductScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { draft, updateDraft, resetDraft } = useTradeDraft();
  const { refreshProducts } = useTradeProducts();
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { isPrivate, targetUserId, tradeId } = useLocalSearchParams<{ isPrivate: string; targetUserId: string; tradeId: string }>();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product Information
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");

  // Trade Preferences
  const [lookingForName, setLookingForName] = useState("");
  const [lookingForDescription, setLookingForDescription] = useState("");

  // Trade Value Estimation
  const [estimatedMinValue, setEstimatedMinValue] = useState("");
  const [estimatedMaxValue, setEstimatedMaxValue] = useState("");

  // Contact Information
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""]);

  // Location state
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  const conditionOptions = [
    { label: t("condition.brand_new"), value: "Brand New" },
    { label: t("condition.good"), value: "Good" },
    { label: t("condition.fair"), value: "Fair" },
    { label: t("condition.poor"), value: "Poor" },
  ];

  const handleConfirmLocation = (location: {
    latitude: number;
    longitude: number;
  }) => {
    setIsLocationConfirmed(true);
    updateDraft("location", location);
  };

  const handleAddPhoneNumber = () => {
    if (phoneNumbers.length < 3) {
      setPhoneNumbers([...phoneNumbers, ""]);
    } else {
      Alert.alert(t("error"), t("trade.alerts.max_phones_reached"));
    }
  };

  const handleUpdatePhoneNumber = (text: string, index: number) => {
    const newPhoneNumbers = [...phoneNumbers];
    newPhoneNumbers[index] = text;
    setPhoneNumbers(newPhoneNumbers);
  };

  const handleRemovePhoneNumber = (index: number) => {
    const newPhoneNumbers = [...phoneNumbers];
    newPhoneNumbers.splice(index, 1);
    setPhoneNumbers(newPhoneNumbers);
  };

  const uploadTradeImage = async (uri: string, supabaseClient: any) => {
    if (uri.startsWith("http")) {
      return uri;
    }

    if (!userId) {
      throw new Error("User must be authenticated to upload images.");
    }

    const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
    const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
    const fileName = `${userId}/trade-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    const { error: uploadError } = await supabaseClient.storage
      .from("product-images")
      .upload(fileName, decode(base64), {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("product-images").getPublicUrl(fileName);

    return publicUrl;
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert(t("error"), t("trade.alerts.title_required"));
      return false;
    }
    if (!description.trim()) {
      Alert.alert(t("error"), t("trade.alerts.description_required"));
      return false;
    }
    if (!condition) {
      Alert.alert(t("error"), t("trade.alerts.condition_required"));
      return false;
    }
    if (draft.photos.length === 0) {
      Alert.alert(t("error"), t("trade.alerts.photo_required"));
      return false;
    }
    if (!lookingForName.trim()) {
      Alert.alert(t("error"), t("trade.alerts.looking_for_required"));
      Alert.alert(t("error"), t("trade.alerts.looking_for_required"));
      return false;
    }
    if (!estimatedMinValue.trim() || !estimatedMaxValue.trim()) {
      Alert.alert(t("error"), t("trade.alerts.value_range_required"));
      return false;
    }

    const minVal = parseFloat(estimatedMinValue);
    const maxVal = parseFloat(estimatedMaxValue);
    if (isNaN(minVal) || isNaN(maxVal)) {
      Alert.alert(t("error"), t("trade.alerts.invalid_value"));
      return false;
    }
    if (minVal > maxVal) {
      Alert.alert(t("error"), t("trade.alerts.min_greater_than_max"));
      Alert.alert(t("error"), t("trade.alerts.min_greater_than_max"));
      return false;
    }
    if (!draft.province || !draft.district) {
      Alert.alert(t("error"), t("trade.alerts.location_required"));
      return false;
    }
    if (!isLocationConfirmed) {
      Alert.alert(t("error"), t("trade.alerts.map_confirm_required"));
      return false;
    }

    const hasAtLeastOnePhone = phoneNumbers.some(
      (phone) => phone.trim().length > 0,
    );
    const hasAtLeastOnePhone = phoneNumbers.some(
      (phone) => phone.trim().length > 0,
    );
    if (!hasAtLeastOnePhone) {
      Alert.alert(t("error"), t("trade.alerts.phone_required"));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!userId) {
      Alert.alert(
        t("common.sign_in_required"),
        t("common.sign_in_to_bookmark"),
      );
      Alert.alert(
        t("common.sign_in_required"),
        t("common.sign_in_to_bookmark"),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      const authSupabase = createClerkSupabaseClient(token);

      const uploadedImages = await Promise.all(
        draft.photos.map((uri) => uploadTradeImage(uri, authSupabase)),
      );

      const provinceKey =
        draft.province
          ?.replace(/\s+/g, "")
          .replace(/^./, (str) => str.toLowerCase()) || "phnomPenh";

      const conditionLower = condition.toLowerCase().replace(/\s+/g, "_");

      const normalizedPhones = phoneNumbers
        .map((phone) => phone.trim())
        .filter(Boolean);

      const ownerName =
        user?.fullName ||
        user?.username ||
        user?.primaryEmailAddress?.emailAddress ||
        "Current User";

      const estimatedRange = `$${estimatedMinValue} - $${estimatedMaxValue}`;

      const isPrivatePost = isPrivate === "true";

      const { data: newTrade, error } = await authSupabase
        .from("trades")
        .insert({
          owner_id: userId,
          title: title.trim(),
          description: description.trim(),
          images: uploadedImages,
          looking_for: lookingForName.trim(),
          location_name: draft.province || null,
          cash_adjustment: 0,
          is_private: isPrivatePost,
          target_user_id: targetUserId || null,
          metadata: {
            sellerName: ownerName,
            condition: conditionLower,
            originalPrice: originalPrice ? parseFloat(originalPrice) : 0,
            province: provinceKey,
            district: draft.district || "",
            commune: draft.commune || "",
            coordinates: draft.location,
            telephone: normalizedPhones.join(" / "),
            estimatedTradeValueRange: estimatedRange,
            lookingForName: lookingForName.trim(),
            lookingForDescription: lookingForDescription.trim(),
            owner: {
              name: ownerName,
              isVerified: false,
              avatar: user?.imageUrl || "",
            },
          },
          status: isPrivatePost ? "private" : "active",
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      // If we are creating a private offer for a specific trade, create the offer too
      if (isPrivatePost && tradeId && newTrade) {
        const { error: offerError } = await authSupabase
          .from("trade_offers")
          .insert({
            trade_id: tradeId,
            bidder_id: userId,
            offered_trade_id: newTrade.id,
            offered_item_desc: title.trim(),
            status: "pending",
          });

        if (offerError) {
          console.error("Error creating trade offer:", offerError);
          // Don't throw, we successfully created the trade post at least
        }
      }

      await refreshProducts();

      Alert.alert(t("success"), t("trade.alerts.post_success"), [
        {
          text: "OK",
          onPress: () => {
            resetDraft();
            router.back();
          },
        },
      ]);
      Alert.alert(t("success"), t("trade.alerts.post_success"), [
        {
          text: "OK",
          onPress: () => {
            resetDraft();
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("Error posting trade product:", error);
      Alert.alert(t("error"), t("trade.alerts.post_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: themeColors.card,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <XIcon size={24} color={themeColors.text} weight="bold" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>
            {t("trade.add_new_product")}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo Upload Section */}
          <PhotoUploadSection
            photos={draft.photos}
            onUpdatePhotos={(newPhotos) => updateDraft("photos", newPhotos)}
            themeColors={themeColors}
          />

          {/* Product Information Card */}
          <ThemedCard>
            <ThemedText style={styles.sectionTitle}>
              {t("trade.product_information")}
            </ThemedText>

            {/* Title */}
            <ThemedInput
              label={t("trade.product_title")}
              required
              placeholder={t("trade.product_title_placeholder")}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <ThemedInput
              label={t("trade.description")}
              required
              placeholder={t("trade.description_placeholder")}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputStyle={styles.textArea}
            />

            {/* Condition */}
            <View style={styles.condition_sec}>
              <ThemedText
                style={[{ fontSize: 14, fontWeight: "500", marginBottom: 8 }]}
              >
                {t("trade.condition")} *
              </ThemedText>
              <ConditionSelector
                condition={condition}
                onSelectCondition={setCondition}
                options={conditionOptions}
              />
            </View>

            {/* Original Price (Optional) */}
            <ThemedInput
              label={`${t("trade.original_price")} (${t("optional")})`}
              placeholder={t("trade.original_price_placeholder")}
              value={originalPrice}
              onChangeText={setOriginalPrice}
              keyboardType="numeric"
            />
          </ThemedCard>

          {/* Trade Preferences Card */}
          <ThemedCard>
            <ThemedText style={styles.sectionTitle}>
              {t("trade.looking_for")} *
            </ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              {t("trade.looking_for_description")}
            </ThemedText>

            {/* Looking For Item Input */}
            <ThemedInput
              label={t("trade.item_name")}
              required
              placeholder={t("trade.item_name_placeholder")}
              value={lookingForName}
              onChangeText={setLookingForName}
            />

            <ThemedInput
              label={`${t("trade.item_description")} (${t("optional")})`}
              placeholder={t("trade.item_description_placeholder")}
              value={lookingForDescription}
              onChangeText={setLookingForDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputStyle={styles.textArea}
            />

            {/* Trade Value Estimation */}
            <View
              style={[styles.divider, { backgroundColor: themeColors.border }]}
            />

            <ThemedText style={[styles.sectionTitle, { marginTop: 20 }]}>
            <ThemedText style={[styles.sectionTitle, { marginTop: 20 }]}>
              {t("trade.estimated_trade_value_range")} *
            </ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              {t("trade.estimated_trade_value_range_description")}
            </ThemedText>

            <View style={styles.valueRangeContainer}>
              <View style={[styles.valueInputWrapper, { flex: 1 }]}>
              <View style={[styles.valueInputWrapper, { flex: 1 }]}>
                <ThemedText
                  style={[{ fontSize: 14, fontWeight: "500", marginBottom: 8 }]}
                >
                  {t("trade.minimum_value")}
                </ThemedText>
                <View style={styles.currencyInputContainer}>
                  <ThemedText
                    style={[styles.currencySymbol, { color: themeColors.text }]}
                  >
                    $
                  </ThemedText>
                  <ThemedInput
                    placeholder="1200"
                    value={estimatedMinValue}
                    onChangeText={setEstimatedMinValue}
                    keyboardType="numeric"
                    inputStyle={styles.valueInput}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              <View style={styles.rangeSeparator}>
                <ThemedText style={styles.rangeSeparatorText}></ThemedText>
              </View>

              <View style={[styles.valueInputWrapper, { flex: 1 }]}>
              <View style={[styles.valueInputWrapper, { flex: 1 }]}>
                <ThemedText
                  style={[{ fontSize: 14, fontWeight: "500", marginBottom: 8 }]}
                >
                  {t("trade.maximum_value")}
                </ThemedText>
                <View style={styles.currencyInputContainer}>
                  <ThemedText
                    style={[styles.currencySymbol, { color: themeColors.text }]}
                  >
                    $
                  </ThemedText>
                  <ThemedInput
                    placeholder="1500"
                    value={estimatedMaxValue}
                    onChangeText={setEstimatedMaxValue}
                    keyboardType="numeric"
                    inputStyle={styles.valueInput}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            </View>

            {/* Display estimated range if both values are entered */}
            {estimatedMinValue && estimatedMaxValue && (
              <View
                style={[
                  styles.estimatedRangeDisplay,
                  { backgroundColor: themeColors.background },
                ]}
              >
                <ThemedText
                  style={[styles.estimatedRangeLabel, { flexShrink: 1 }]}
                >
                  {t("trade.estimated_range")}:
                </ThemedText>
                <ThemedText
                  style={[
                    styles.estimatedRangeValue,
                    { color: Colors.reds[500], flexShrink: 1 },
                  ]}
                >
                  ${estimatedMinValue} - ${estimatedMaxValue}
                </ThemedText>
              </View>
            )}
          </ThemedCard>

          {/* Location Card */}
          <ThemedCard>
            <ThemedText style={styles.sectionTitle}>
              {t("trade.location")} *
            </ThemedText>

            <AddressDropdowns
              currentDraft={draft}
              onUpdateDraft={(key, value) => updateDraft(key as any, value)}
            />

            <LocationPickerMap
              onConfirmLocation={handleConfirmLocation}
              currentDraft={draft}
              onUpdateDraft={(key, value) => updateDraft(key as any, value)}
              themeColors={themeColors}
              t={t}
            />
          </ThemedCard>

          {/* Contact Information Card */}
          <ThemedCard>
            <ThemedText style={styles.sectionTitle}>
              {t("trade.contact_information")}
            </ThemedText>

            {phoneNumbers.map((phone, index) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <ThemedText
                  style={[{ fontSize: 14, fontWeight: "500", marginBottom: 8 }]}
                >
                  {t("trade.phone_number")} {index + 1}
                </ThemedText>
                <View style={styles.phoneInputContainer}>
                  <ThemedInput
                    value={phone}
                    onChangeText={(text) =>
                      handleUpdatePhoneNumber(text, index)
                    }
                    keyboardType="phone-pad"
                    placeholder={t("trade.phone_number_placeholder")}
                    inputStyle={styles.phoneInput}
                    containerStyle={{ marginBottom: 0, flex: 1 }}
                  />
                  {phoneNumbers.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemovePhoneNumber(index)}
                      style={styles.removeBtn}
                    >
                      <DynamicPhosphorIcon
                        name="Trash"
                        size={24}
                        color={Colors.reds[500]}
                      />
                    </TouchableOpacity>
                  )}
                  {index === phoneNumbers.length - 1 &&
                    phoneNumbers.length < 3 && (
                      <TouchableOpacity
                        onPress={handleAddPhoneNumber}
                        style={styles.addPhoneIconBtn}
                      >
                        <DynamicPhosphorIcon
                          name="PlusCircle"
                          size={24}
                          color={themeColors.tint}
                        />
                      </TouchableOpacity>
                    )}
                </View>
              </View>
            ))}
          </ThemedCard>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: isSubmitting
                  ? Colors.reds[300]
                  : Colors.reds[500],
              },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <ThemedText style={styles.submitButtonText}>
              {isSubmitting ? t("chat.sending") : t("trade.post_trade_product")}
            </ThemedText>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  condition_sec: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneInput: {
    flex: 1,
  },
  addPhoneIconBtn: {
    marginLeft: 10,
  },
  removeBtn: {
    marginLeft: 10,
  },
  divider: {
    height: 1,
  },
  valueRangeContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },

  valueInputWrapper: {
    flex: 1,
  },
  currencyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencySymbol: {
    position: "absolute",
    left: 12,
    fontSize: 16,
    fontWeight: "600",
    zIndex: 1,
  },
  valueInput: {
    paddingLeft: 28,
  },
  rangeSeparator: {
    paddingBottom: 12,
  },
  rangeSeparatorText: {
    fontSize: 20,
    fontWeight: "600",
  },
  estimatedRangeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  estimatedRangeLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  estimatedRangeValue: {
    fontSize: 16,
    fontWeight: "700",
  },
});
