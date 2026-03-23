import { useTradeProducts } from "@/src/context/TradeProductsContext";
import { CAMBODIA_LOCATIONS } from "@src/constants/CambodiaLocations";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import TradeProductCard from "@src/components/trade_components/TradeProductCard";
import useThemeColor from "@src/hooks/useThemeColor";
import { useRouter } from "expo-router";
import {
  CaretLeftIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  XIcon,
} from "phosphor-react-native";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function TradeScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const { t, i18n } = useTranslation();
  const { products, loading, refreshProducts } = useTradeProducts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProducts();
    setRefreshing(false);
  };

  const productsToDisplay = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.lookingFor.some((item) =>
          item.name.toLowerCase().includes(query),
        );

      const normalizedCondition = String(product.condition || "")
        .toLowerCase()
        .replace(/\s+/g, "_");
      const matchesCondition =
        !selectedCondition || normalizedCondition === selectedCondition;
      const matchesProvince =
        !selectedProvince || product.province === selectedProvince;

      return matchesSearch && matchesCondition && matchesProvince;
    });
  }, [products, searchQuery, selectedCondition, selectedProvince]);

  const conditionOptions = useMemo(
    () => [
      { label: t("condition.brand_new"), value: "brand_new" },
      { label: t("condition.good"), value: "good" },
      { label: t("condition.fair"), value: "fair" },
      { label: t("condition.poor"), value: "poor" },
    ],
    [t],
  );

  const provinceOptions = useMemo(
    () =>
      CAMBODIA_LOCATIONS.map((province) => ({
        key: province.name_en
          .replace(/\s+/g, "")
          .replace(/^./, (char) => char.toLowerCase()),
        label: province.name_en,
        labelKm: province.name_km,
      })),
    [],
  );

  const filteredProvinceOptions = useMemo(() => {
    const query = locationSearchQuery.trim().toLowerCase();
    if (!query) return provinceOptions;

    return provinceOptions.filter((province) =>
      province.label.toLowerCase().includes(query) ||
      province.labelKm.toLowerCase().includes(query),
    );
  }, [locationSearchQuery, provinceOptions]);

  const activeFilterCount =
    (selectedCondition ? 1 : 0) + (selectedProvince ? 1 : 0);

  const handleAddNewTrade = () => {
    router.push("/trade/AddTradeProductScreen");
  };

  const clearFilters = () => {
    setSelectedCondition(null);
    setSelectedProvince(null);
  };

  const selectedProvinceLabel =
    provinceOptions.find((province) => province.key === selectedProvince)
      ? i18n.language === "kh"
        ? provinceOptions.find((province) => province.key === selectedProvince)?.labelKm
        : provinceOptions.find((province) => province.key === selectedProvince)?.label
      : null;

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#E44336" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable
            style={[
              styles.filterModalCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.filterModalHeader}>
              <ThemedText style={styles.filterModalTitle}>
                {t("trade.trade_filters")}
              </ThemedText>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <XIcon size={18} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionLabel}>
                {t("trade.condition")}
              </ThemedText>
              <View style={styles.filterChipWrap}>
                {conditionOptions.map((option) => {
                  const isSelected = selectedCondition === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalChip,
                        {
                          backgroundColor: isSelected
                            ? themeColors.tint
                            : themeColors.secondaryBackground,
                          borderColor: isSelected
                            ? themeColors.tint
                            : themeColors.border,
                        },
                      ]}
                      onPress={() =>
                        setSelectedCondition((current) =>
                          current === option.value ? null : option.value,
                        )
                      }
                      activeOpacity={0.85}
                    >
                      <ThemedText
                        style={[
                          styles.modalChipText,
                          {
                            color: isSelected
                              ? themeColors.primaryButtonText
                              : themeColors.text,
                          },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={[
                  styles.filterActionSecondary,
                  { borderColor: themeColors.border },
                ]}
                onPress={clearFilters}
                activeOpacity={0.85}
              >
                <ThemedText style={[styles.filterActionSecondaryText, { color: themeColors.text }]}>
                  {t("common.clear")}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterActionPrimary,
                  { backgroundColor: themeColors.tint },
                ]}
                onPress={() => setFilterModalVisible(false)}
                activeOpacity={0.85}
              >
                <ThemedText
                  style={[
                    styles.filterActionPrimaryText,
                    { color: themeColors.primaryButtonText },
                  ]}
                >
                  {t("common.apply")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={locationPickerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setLocationPickerVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.locationScreen,
            { backgroundColor: themeColors.background },
          ]}
        >
          <View
            style={[
              styles.locationHeader,
              { borderBottomColor: themeColors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setLocationPickerVisible(false)}
              style={styles.locationHeaderButton}
            >
              <CaretLeftIcon size={20} color={themeColors.text} weight="bold" />
            </TouchableOpacity>
            <ThemedText style={styles.locationHeaderTitle}>
              {t("trade.select_location")}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                setSelectedProvince(null);
                setLocationPickerVisible(false);
              }}
              style={styles.locationHeaderButton}
            >
              <ThemedText
                style={[styles.locationClearText, { color: themeColors.tint }]}
              >
                {t("common.clear")}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.locationSearchRow,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <MagnifyingGlassIcon size={18} color={themeColors.text} />
            <TextInput
              value={locationSearchQuery}
              onChangeText={setLocationSearchQuery}
              placeholder={t("common.search_province")}
              placeholderTextColor={themeColors.text + "80"}
              style={[styles.locationSearchInput, { color: themeColors.text }]}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredProvinceOptions}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.locationList}
            renderItem={({ item }) => {
              const isSelected = selectedProvince === item.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.locationItem,
                    {
                      backgroundColor: isSelected
                        ? themeColors.tint + "12"
                        : "transparent",
                      borderBottomColor: themeColors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedProvince(item.key);
                    setLocationPickerVisible(false);
                    setLocationSearchQuery("");
                  }}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.locationItemLabel}>
                    {i18n.language === "kh" ? item.labelKm : item.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      <View style={styles.topSection}>
        <View
          style={[
            styles.searchRow,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <MagnifyingGlassIcon size={20} color={themeColors.text} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("trade.search_placeholder")}
            placeholderTextColor={themeColors.text + "80"}
            style={[styles.input, { color: themeColors.text }]}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          <TouchableOpacity
            style={styles.searchActionButton}
            onPress={Keyboard.dismiss}
          >
            <ThemedText style={styles.searchActionText}>
              {t("common.search")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickFilterRow}>
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.quickFilterButtonInner}>
            <FunnelIcon size={16} color={themeColors.text} />
            <ThemedText
              style={[styles.quickFilterButtonText, { color: themeColors.text }]}
            >
              {selectedCondition
                ? conditionOptions.find((option) => option.value === selectedCondition)
                    ?.label || t("common.filter")
                : t("common.filter")}
            </ThemedText>
          </View>
          {selectedCondition ? (
            <View style={styles.quickFilterActiveDot} />
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
          onPress={() => setLocationPickerVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.quickFilterButtonInner}>
            <MapPinIcon size={16} color={themeColors.text} />
            <ThemedText
              style={[styles.quickFilterButtonText, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {selectedProvinceLabel ? selectedProvinceLabel : t("common.location")}
            </ThemedText>
          </View>
          {selectedProvince ? <View style={styles.quickFilterActiveDot} /> : null}
        </TouchableOpacity>
      </View>

      {activeFilterCount > 0 ? (
        <View style={styles.clearFiltersWrap}>
          <TouchableOpacity
            onPress={clearFilters}
            style={[
              styles.clearFilterRow,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
            activeOpacity={0.85}
          >
            <XIcon size={13} color={themeColors.text} />
            <ThemedText style={styles.clearFilterText}>{t("common.clear_all")}</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ flex: 1, position: "relative" }}>
        <FlatList
          data={productsToDisplay}
          keyExtractor={(item) => item.id}
          numColumns={2}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E44336"
              colors={["#E44336"]}
            />
          }
          renderItem={({ item }) => {
            const mappedProduct = {
              id: item.id,
              image: item.images[0] || "",
              title: item.title,
              seller: item.seller,
              timeAgo: t(`time_ago.${item.timeAgo.unit}`, {
                count: item.timeAgo.value,
              }),
              location: t(`provinces.${item.province}`, {
                defaultValue: item.district || item.province,
              }),
              lookingFor: item.lookingFor.map((lf) => lf.name),
              condition: item.condition,
            };

            return (
              <View style={styles.itemColumn}>
                <TradeProductCard
                  product={mappedProduct}
                  onPress={() =>
                    router.push({
                      pathname: "/trade/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              </View>
            );
          }}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View
              style={[
                styles.emptyContainer,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>
                {t("trade_screen.no_listings_found", {
                  defaultValue: "No trade listings found",
                })}
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {activeFilterCount > 0 || searchQuery.trim().length > 0
                  ? "Try adjusting your search or filters."
                  : t("trade.add_new_product")}
              </ThemedText>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleAddNewTrade}
                activeOpacity={0.9}
              >
                <PlusIcon size={16} color="#FFFFFF" weight="bold" />
                <ThemedText style={styles.createButtonText}>
                  {t("trade.add_new_product")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          }
        />

        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: themeColors.primary, bottom: insets.bottom + 72 },
          ]}
          onPress={handleAddNewTrade}
          activeOpacity={0.8}
        >
          <PlusIcon size={24} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    marginBottom: 12,
  },
  quickFilterRow: {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchRow: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 14,
  },
  searchActionButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  searchActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickFilterButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  quickFilterButtonInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  quickFilterButtonText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  quickFilterActiveDot: {
    alignItems: "center",
    backgroundColor: "#E44336",
    borderRadius: 999,
    height: 9,
    position: "absolute",
    right: 10,
    top: 9,
    width: 9,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  clearFiltersWrap: {
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  clearFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.85,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    padding: 16,
  },
  filterModalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  filterSection: {
    marginBottom: 18,
  },
  filterSectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  filterChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  filterActionSecondary: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  filterActionSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterActionPrimary: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12,
  },
  filterActionPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  locationScreen: {
    flex: 1,
  },
  locationHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationHeaderButton: {
    minWidth: 52,
    paddingVertical: 6,
  },
  locationHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  locationClearText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  locationSearchRow: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 12,
  },
  locationList: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  locationItem: {
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  locationItemLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  itemColumn: {
    width: "49%",
  },
  emptyContainer: {
    marginTop: 40,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 6,
    marginBottom: 16,
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E44336",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 99,
  },
});
