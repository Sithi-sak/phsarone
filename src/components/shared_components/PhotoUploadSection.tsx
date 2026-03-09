import ImageSuggestions from "@src/components/sell_components/ImageSuggestions";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useImageSuggestions } from "@src/hooks/useImageSuggestions";
import useThemeColor from "@src/hooks/useThemeColor";
import { analyzeImageQuality } from "@src/utils/imageQuality";
import * as ImagePicker from "expo-image-picker";
import { ImagesIcon, LightbulbIcon, PlusIcon } from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PhotoUploadSectionProps {
  photos: string[];
  onUpdatePhotos: (newPhotos: string[]) => void;
  themeColors: ReturnType<typeof useThemeColor>;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 10;
const SQUARE_SIZE = (SCREEN_WIDTH - 64 - GRID_GAP * 2) / 3;

export default function PhotoUploadSection({
  photos,
  onUpdatePhotos,
}: PhotoUploadSectionProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColor();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { analysis } = useImageSuggestions(photos.length);

  const validateImage = async (uri: string) => {
    const metrics = await analyzeImageQuality(uri);

    // Strict gate: block images that are likely blurry/low-quality or badly framed.
    const isRejected =
      metrics.qualityScore < 60 ||
      metrics.isLowResolution ||
      !!metrics.issues.aspectRatio;

    return {
      isRejected,
      metrics,
    };
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      const acceptedUris: string[] = [];
      const rejectedMessages: string[] = [];

      for (const asset of result.assets) {
        try {
          const { isRejected, metrics } = await validateImage(asset.uri);

          if (isRejected) {
            const reason = metrics.issues.resolution
              ? t("sellSection.image_resolution_low", {
                  defaultValue: "Increase image resolution",
                })
              : metrics.issues.aspectRatio
                ? t("sellSection.image_aspect_ratio_extreme", {
                    defaultValue:
                      "Image is very narrow or wide - consider a more balanced aspect ratio",
                  })
                : t("sellSection.image_quality_check", {
                    defaultValue: "Image quality check failed",
                  });

            rejectedMessages.push(`${metrics.fileName || "image"}: ${reason}`);
            continue;
          }

          acceptedUris.push(asset.uri);
        } catch {
          rejectedMessages.push(
            `${asset.fileName || "image"}: ${t(
              "sellSection.image_quality_check",
              {
                defaultValue: "Unable to validate image quality",
              },
            )}`,
          );
        }
      }

      if (rejectedMessages.length > 0) {
        Alert.alert(
          t("common.error", { defaultValue: "Error" }),
          `${t("sellSection.image_quality_check", {
            defaultValue: "Image quality check",
          })}\n\n${rejectedMessages.slice(0, 3).join("\n")}`,
        );
      }

      if (acceptedUris.length > 0) {
        onUpdatePhotos([...photos, ...acceptedUris].slice(0, 5));
      }
    }
  };

  const openPreview = (index: number) => {
    setSelectedImageIndex(index);
    setPreviewVisible(true);
  };

  const deleteCurrentImage = () => {
    const newPhotos = [...photos];
    newPhotos.splice(selectedImageIndex, 1);
    onUpdatePhotos(newPhotos);
    if (newPhotos.length === 0) setPreviewVisible(false);
    else if (selectedImageIndex >= newPhotos.length)
      setSelectedImageIndex(newPhotos.length - 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.sectionTitle}>Media</ThemedText>
        <View style={styles.headerActions}>
          <ThemedText style={styles.countText}>{photos.length}/5</ThemedText>
          {photos.length > 0 && (
            <TouchableOpacity
              style={[
                styles.suggestionsToggle,
                {
                  backgroundColor: showSuggestions
                    ? themeColors.primary
                    : themeColors.background,
                },
              ]}
              onPress={() => setShowSuggestions(!showSuggestions)}
              activeOpacity={0.7}
            >
              <LightbulbIcon
                size={16}
                color={showSuggestions ? "#fff" : themeColors.primary}
                weight="fill"
              />
              <ThemedText
                style={[
                  styles.suggestionsToggleText,
                  {
                    color: showSuggestions ? "#fff" : themeColors.primary,
                  },
                ]}
              >
                {t("sellSection.image_suggestions_toggle")}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {photos.length === 0 ? (
        <TouchableOpacity
          style={[
            styles.uploadBox,
            {
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
            },
          ]}
          onPress={pickImage}
          activeOpacity={0.7}
        >
          <ImagesIcon size={32} color={themeColors.primary} weight="regular" />
          <ThemedText
            style={[styles.uploadText, { color: themeColors.primary }]}
          >
            Add images
          </ThemedText>
          <ThemedText
            style={[styles.uploadHint, { color: themeColors.tabIconDefault }]}
          >
            Pick a plan to add more media types
          </ThemedText>
        </TouchableOpacity>
      ) : (
        <View style={styles.grid}>
          {photos.map((uri, index) => (
            <View
              key={index}
              style={[
                styles.imageCard,
                {
                  width: SQUARE_SIZE,
                  height: SQUARE_SIZE,
                  backgroundColor: themeColors.secondaryBackground,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => openPreview(index)}
                activeOpacity={0.9}
              >
                <Image source={{ uri }} style={styles.image} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  const newPhotos = [...photos];
                  newPhotos.splice(index, 1);
                  onUpdatePhotos(newPhotos);
                }}
              >
                <ThemedText style={styles.deleteBtnText}>×</ThemedText>
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < 5 && (
            <TouchableOpacity
              style={[
                styles.addSquare,
                {
                  width: SQUARE_SIZE,
                  height: SQUARE_SIZE,
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                },
              ]}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <PlusIcon size={24} color={themeColors.primary} weight="bold" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {showSuggestions && photos.length > 0 && (
        <ImageSuggestions
          currentImageCount={analysis.currentImageCount}
          recommendedImageCount={analysis.recommendedImageCount}
          completionPercentage={analysis.completionPercentage}
          suggestedImages={analysis.suggestions}
          warnings={analysis.warnings}
        />
      )}

      <Modal visible={previewVisible} transparent animationType="fade">
        <SafeAreaView style={styles.modalBg}>
          <TouchableOpacity
            style={styles.closeModal}
            onPress={() => setPreviewVisible(false)}
          >
            <ThemedText style={styles.closeModalText}>✕</ThemedText>
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <Image
              source={{ uri: photos[selectedImageIndex] }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.modalDelete,
              { backgroundColor: themeColors.primary },
            ]}
            onPress={deleteCurrentImage}
          >
            <ThemedText style={styles.modalDeleteText}>Delete</ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countText: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.6,
  },
  suggestionsToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 4,
  },
  suggestionsToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  uploadBox: {
    width: "100%",
    height: 160,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "500",
  },
  uploadHint: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  imageCard: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  addSquare: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  closeModal: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeModalText: {
    color: "#FFF",
    fontSize: 32,
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  modalDelete: {
    padding: 16,
    margin: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  modalDeleteText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
