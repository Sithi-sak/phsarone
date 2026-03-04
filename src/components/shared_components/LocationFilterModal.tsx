import { CAMBODIA_LOCATIONS } from "@/src/constants/CambodiaLocations";
import useThemeColor from "@/src/hooks/useThemeColor";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

type SortOption = "none" | "price_low_to_high" | "price_high_to_low";
type ConditionType = "new" | "like_new" | "used" | "refurbished";

interface LocationFilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: (
    province: string | null,
    district: string | null,
    commune: string | null,
  ) => void;
  currentProvince: string | null;
  currentDistrict: string | null;
  currentCommune: string | null;
}

export default function LocationFilterModal({
  isVisible,
  onClose,
  onApplyFilters,
  currentProvince,
  currentDistrict,
  currentCommune,
}: LocationFilterModalProps) {
  const { t, i18n } = useTranslation();
  const themeColors = useThemeColor();
  const [searchQuery, setSearchQuery] = useState("");
  const [tempProvince, setTempProvince] = useState<string | null>(
    currentProvince,
  );
  const [tempDistrict, setTempDistrict] = useState<string | null>(
    currentDistrict,
  );
  const [tempCommune, setTempCommune] = useState<string | null>(currentCommune);

  useEffect(() => {
    setTempProvince(currentProvince);
    setTempDistrict(currentDistrict);
    setTempCommune(currentCommune);
  }, [currentProvince, currentDistrict, currentCommune]);

  const getDistricts = () => {
    if (!tempProvince) return [];
    const provinceData = CAMBODIA_LOCATIONS.find(
      (loc) => loc.name_en === tempProvince,
    );
    return provinceData?.subdivisions || [];
  };

  const getCommunes = () => {
    if (!tempProvince || !tempDistrict) return [];
    const provinceData = CAMBODIA_LOCATIONS.find(
      (loc) => loc.name_en === tempProvince,
    );
    const districtData = provinceData?.subdivisions.find(
      (sub) => sub.name_en === tempDistrict,
    );
    return districtData?.subdivisions || [];
  };

  const locationsToShow = tempProvince
    ? tempDistrict
      ? getCommunes()
      : getDistricts()
    : CAMBODIA_LOCATIONS.filter((item) => {
        const query = searchQuery.toLowerCase();
        return (
          item.name_en.toLowerCase().includes(query) ||
          item.name_km.toLowerCase().includes(query)
        );
      });

  const renderItem = (item: any, type: "province" | "district" | "commune") => {
    const isSelected =
      (type === "province" && tempProvince === item.name_en) ||
      (type === "district" && tempDistrict === item.name_en) ||
      (type === "commune" && tempCommune === item.name_en);

    return (
      <Pressable
        key={item.name_en}
        onPress={() => {
          if (type === "province") {
            setTempProvince(item.name_en);
            setTempDistrict(null);
            setTempCommune(null);
            setSearchQuery("");
          } else if (type === "district") {
            setTempDistrict(item.name_en);
            setTempCommune(null);
          } else {
            setTempCommune(item.name_en);
          }
        }}
        style={({ pressed }) => [
          styles.listItem,
          {
            backgroundColor: isSelected
              ? `${themeColors.tint}10`
              : pressed
                ? themeColors.card
                : "transparent",
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <View
          style={[
            styles.radio,
            {
              borderColor: isSelected ? themeColors.tint : themeColors.border,
              backgroundColor: isSelected ? themeColors.tint : "transparent",
            },
          ]}
        >
          {isSelected && <View style={styles.radioInner} />}
        </View>
        <ThemedText style={styles.itemText}>
          {i18n.language === "kh" ? item.name_km : item.name_en}
        </ThemedText>
      </Pressable>
    );
  };

  const handleApply = () => {
    onApplyFilters(tempProvince, tempDistrict, tempCommune);
    onClose();
  };

  const handleClear = () => {
    setTempProvince(null);
    setTempDistrict(null);
    setTempCommune(null);
    setSearchQuery("");
  };

  const handleBack = () => {
    if (tempCommune) {
      setTempCommune(null);
    } else if (tempDistrict) {
      setTempDistrict(null);
    } else if (tempProvince) {
      setTempProvince(null);
      setSearchQuery("");
    } else {
      onClose();
    }
  };

  const getCurrentTitle = () => {
    // Show title based on what we're DISPLAYING, not what's selected
    if (tempProvince && tempDistrict) return t("location.commune");
    if (tempProvince) return t("location.district");
    return t("location.province");
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: themeColors.background }]}>
        {/* Handle */}
        <View style={styles.handle}>
          <View
            style={[styles.handlePill, { backgroundColor: themeColors.border }]}
          />
        </View>

        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <Pressable onPress={handleBack} style={styles.headerBtn}>
            <ThemedText style={styles.headerBtnText}>✕</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {getCurrentTitle()}
          </ThemedText>
          <Pressable onPress={handleClear} style={styles.headerBtn}>
            <ThemedText style={[styles.resetText, { color: themeColors.tint }]}>
              {t("common.clear")}
            </ThemedText>
          </Pressable>
        </View>

        {/* Search (only show on province level) */}
        {!tempProvince && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <TextInput
              placeholder={t("common.search_province") || "Search province..."}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: themeColors.text }]}
            />
          </View>
        )}

        {/* List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {locationsToShow.map((item) => {
            // Type should match what we're DISPLAYING
            const type = tempProvince
              ? tempDistrict
                ? "commune"
                : "district"
              : "province";
            return renderItem(item, type as any);
          })}
        </ScrollView>

        {/* Footer Button */}
        <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [
              styles.applyBtn,
              {
                backgroundColor: themeColors.tint,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <ThemedText style={styles.applyBtnText}>
              {t("common.apply")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  handle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 8,
    minWidth: 44,
  },
  headerBtnText: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  resetText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  list: {
    flex: 1,
    paddingHorizontal: 0,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  itemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
