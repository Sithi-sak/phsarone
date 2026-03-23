import { ThemedText } from "@src/components/shared_components/ThemedText";
import { CAMBODIA_LOCATIONS } from "@src/constants/CambodiaLocations";
import { SellDraft } from "@src/context/SellDraftContext";
import { TradeDraft } from "@src/context/TradeDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedTextInput } from "./ThemedTextInput";

interface AddressDropdownsProps {
  currentDraft: SellDraft | TradeDraft;
  onUpdateDraft: (key: string, value: any) => void;
}

export default function AddressDropdowns({
  currentDraft,
  onUpdateDraft,
}: AddressDropdownsProps) {
  const { t, i18n } = useTranslation();
  const themeColors = useThemeColor();
  const insets = useSafeAreaInsets();
  const currentLang = i18n.language;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    "province" | "district" | "commune" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getLabel = (
    type: "province" | "district" | "commune",
    value: string,
  ) => {
    if (!value) return "";

    if (type === "province") {
      const p = CAMBODIA_LOCATIONS.find((loc) => loc.name_en === value);
      return currentLang === "kh" ? p?.name_km : p?.name_en;
    }

    if (type === "district") {
      const p = CAMBODIA_LOCATIONS.find(
        (loc) => loc.name_en === currentDraft.province,
      );
      const d = p?.subdivisions.find((dist) => dist.name_en === value);
      return currentLang === "kh" ? d?.name_km : d?.name_en;
    }

    if (type === "commune") {
      const p = CAMBODIA_LOCATIONS.find(
        (loc) => loc.name_en === currentDraft.province,
      );
      const d = p?.subdivisions.find(
        (dist) => dist.name_en === currentDraft.district,
      );
      const c = d?.subdivisions.find((com) => com.name_en === value);
      return currentLang === "kh" ? c?.name_km : c?.name_en;
    }
    return value;
  };

  const openPicker = (type: "province" | "district" | "commune") => {
    if (type === "district" && !currentDraft.province) return;
    if (type === "commune" && !currentDraft.district) return;

    setModalType(type);
    setSearchQuery("");
    setModalVisible(true);
  };

  const handleSelect = (value: string) => {
    if (modalType === "province") {
      onUpdateDraft("province", value);
      onUpdateDraft("district", "");
      onUpdateDraft("commune", "");
    } else if (modalType === "district") {
      onUpdateDraft("district", value);
      onUpdateDraft("commune", "");
    } else if (modalType === "commune") {
      onUpdateDraft("commune", value);
    }
    setModalVisible(false);
  };

  const getItems = () => {
    let items: any[] = [];
    if (modalType === "province") {
      items = CAMBODIA_LOCATIONS;
    } else if (modalType === "district") {
      items =
        CAMBODIA_LOCATIONS.find((p) => p.name_en === currentDraft.province)
          ?.subdivisions || [];
    } else if (modalType === "commune") {
      const d = CAMBODIA_LOCATIONS.find(
        (p) => p.name_en === currentDraft.province,
      )?.subdivisions.find((d) => d.name_en === currentDraft.district);
      items = d?.subdivisions || [];
    }

    if (searchQuery) {
      items = items.filter(
        (item) =>
          item.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.name_km.includes(searchQuery),
      );
    }
    return items;
  };

  const renderPickerTrigger = (
    type: "province" | "district" | "commune",
    labelKey: string,
  ) => {
    const value = currentDraft[type];
    const displayLabel = getLabel(type, value as string);
    const isDisabled =
      (type === "district" && !currentDraft.province) ||
      (type === "commune" && !currentDraft.district);

    return (
      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>
          {t(`sellSection.${labelKey}`)}
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.trigger,
            {
              borderColor: themeColors.border,
              backgroundColor: isDisabled
                ? themeColors.secondaryBackground
                : themeColors.card,
            },
          ]}
          onPress={() => openPicker(type)}
          disabled={isDisabled}
        >
          <ThemedText style={[styles.triggerText, !value && { opacity: 0.3 }]}>
            {displayLabel || `${t("common.select")} ${t(`sellSection.${labelKey}`)}`}
          </ThemedText>
          <CaretDownIcon
            size={20}
            color={isDisabled ? themeColors.tabIconDefault : themeColors.text}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      {renderPickerTrigger("province", "ProvinceCapital")}
      {renderPickerTrigger("district", "KhanDistrict")}
      {renderPickerTrigger("commune", "SangkatCommune")}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: themeColors.background,
              paddingTop: insets.top,
            },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: themeColors.border },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              {t("common.select")} {modalType}
            </ThemedText>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
            >
              <XIcon size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <MagnifyingGlassIcon
              size={20}
              color={themeColors.tabIconDefault}
              style={styles.searchIcon}
            />
            <ThemedTextInput
              style={[
                styles.modalSearchInput,
                { backgroundColor: themeColors.secondaryBackground },
              ]}
              placeholder={t("common.search")}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <FlatList
            data={getItems()}
            keyExtractor={(item) => item.name_en}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => handleSelect(item.name_en)}
              >
                <ThemedText style={styles.itemNameEn}>
                  {item.name_en}
                </ThemedText>
                <ThemedText style={styles.itemNameKm}>
                  {item.name_km}
                </ThemedText>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: themeColors.border },
                ]}
              />
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 99,
    height: 44,
    paddingHorizontal: 16,
  },
  triggerText: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 28,
    zIndex: 1,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    borderRadius: 24,
    paddingLeft: 44,
    borderWidth: 0,
  },
  itemRow: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemNameEn: {
    fontSize: 16,
    fontWeight: "500",
  },
  itemNameKm: {
    fontSize: 16,
    opacity: 0.5,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
});
