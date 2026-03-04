import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  CheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  XIcon,
} from "phosphor-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ProductCard from "@src/components/category_components/ProductCard";
import DynamicPhosphorIcon from "@src/components/shared_components/DynamicPhosphorIcon";
import LocationFilterModal from "@src/components/shared_components/LocationFilterModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { CAMBODIA_LOCATIONS } from "@src/constants/CambodiaLocations";
import useThemeColor from "@src/hooks/useThemeColor";
import { supabase } from "@src/lib/supabase";
import { Product } from "@src/types/productTypes";
import { mapDatabaseProductToProduct } from "@src/utils/productUtils";

interface Category {
  id: string;
  name_key: string;
  icon_name: string | null;
}

type SortOption = "none" | "price_low_to_high" | "price_high_to_low";
type ConditionType = "new" | "like_new" | "used" | "refurbished";

const CONDITIONS: { value: ConditionType; labelKey: string }[] = [
  { value: "new", labelKey: "common.condition_new" },
  { value: "like_new", labelKey: "common.condition_like_new" },
  { value: "used", labelKey: "common.condition_used" },
  { value: "refurbished", labelKey: "common.condition_refurbished" },
];

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "none", labelKey: "common.default" },
  { value: "price_low_to_high", labelKey: "common.price_low_to_high" },
  { value: "price_high_to_low", labelKey: "common.price_high_to_low" },
];

export default function CategorySearchScreen() {
  const { id: mainCategoryId } = useLocalSearchParams<{
    id: string;
    title: string;
  }>();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t, i18n } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<
    string | null
  >(null);
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<
    string | null
  >(null);

  // Location
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Filter / Sort
  const [sortBy, setSortBy] = useState<SortOption>("none");
  const [tempSortBy, setTempSortBy] = useState<SortOption>("none");
  const [selectedCondition, setSelectedCondition] =
    useState<ConditionType | null>(null);
  const [tempCondition, setTempCondition] = useState<ConditionType | null>(
    null,
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const activeFilterCount =
    (sortBy !== "none" ? 1 : 0) + (selectedCondition ? 1 : 0);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchSubCategories = useCallback(async () => {
    if (!mainCategoryId) return;
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_key, icon_name")
        .eq("parent_id", mainCategoryId);
      if (error) throw error;
      setSubCategories(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [mainCategoryId]);

  const fetchProducts = useCallback(
    async (isRefreshing = false) => {
      if (!mainCategoryId) return;
      try {
        if (!isRefreshing) setLoading(true);
        let query = supabase
          .from("products")
          .select("*, seller:users(*)")
          .eq("status", "active");

        if (selectedSubCategoryId) {
          query = query.or(
            `category_id.eq.${selectedSubCategoryId},metadata->>subCategory.eq."${selectedSubCategoryName}"`,
          );
        } else {
          const { data: subCats } = await supabase
            .from("categories")
            .select("id")
            .eq("parent_id", mainCategoryId);
          const catIds = [mainCategoryId, ...(subCats?.map((c) => c.id) || [])];
          query = query.in("category_id", catIds);
        }

        if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);
        if (selectedProvince)
          query = query.eq("location_name", selectedProvince);
        if (selectedDistrict)
          query = query.contains("metadata", { district: selectedDistrict });
        if (selectedCommune)
          query = query.contains("metadata", { commune: selectedCommune });

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });
        if (error) throw error;

        let mapped = ((data as any[]) || []).map(mapDatabaseProductToProduct);

        if (selectedCondition)
          mapped = mapped.filter((p) => {
            const c = p.details?.condition?.toLowerCase().replace(/\s+/g, "_");
            return c === selectedCondition;
          });

        if (sortBy === "price_low_to_high")
          mapped.sort(
            (a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0),
          );
        else if (sortBy === "price_high_to_low")
          mapped.sort(
            (a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0),
          );

        setProducts(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [
      mainCategoryId,
      selectedSubCategoryId,
      searchQuery,
      selectedProvince,
      selectedDistrict,
      selectedCommune,
      sortBy,
      selectedCondition,
    ],
  );

  useEffect(() => {
    fetchSubCategories();
  }, [fetchSubCategories]);
  useEffect(() => {
    fetchProducts();
  }, [
    mainCategoryId,
    selectedSubCategoryId,
    selectedProvince,
    selectedDistrict,
    selectedCommune,
    sortBy,
    selectedCondition,
  ]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openLocationModal = () => {
    setLocationModalVisible(true);
  };
  const applyLocation = (
    province: string | null,
    district: string | null,
    commune: string | null,
  ) => {
    setSelectedProvince(province);
    setSelectedDistrict(district);
    setSelectedCommune(commune);
  };
  const openFilterModal = () => {
    setTempSortBy(sortBy);
    setTempCondition(selectedCondition);
    setFilterModalVisible(true);
  };
  const applyFilters = () => {
    setSortBy(tempSortBy);
    setSelectedCondition(tempCondition);
    setFilterModalVisible(false);
  };

  const getLocationLabel = useCallback(() => {
    if (!selectedProvince && !selectedDistrict && !selectedCommune) {
      return t("common.location");
    }

    const labels: string[] = [];

    if (selectedCommune && selectedDistrict && selectedProvince) {
      const province = CAMBODIA_LOCATIONS.find(
        (p) => p.name_en === selectedProvince,
      );
      const district = province?.subdivisions?.find(
        (d) => d.name_en === selectedDistrict,
      );
      const commune = district?.subdivisions?.find(
        (c) => c.name_en === selectedCommune,
      );
      if (commune) {
        labels.push(i18n.language === "kh" ? commune.name_km : commune.name_en);
      }
    }

    if (selectedDistrict && selectedProvince) {
      const province = CAMBODIA_LOCATIONS.find(
        (p) => p.name_en === selectedProvince,
      );
      const district = province?.subdivisions?.find(
        (d) => d.name_en === selectedDistrict,
      );
      if (district) {
        labels.push(
          i18n.language === "kh" ? district.name_km : district.name_en,
        );
      }
    }

    if (selectedProvince) {
      const province = CAMBODIA_LOCATIONS.find(
        (p) => p.name_en === selectedProvince,
      );
      if (province) {
        labels.push(
          i18n.language === "kh" ? province.name_km : province.name_en,
        );
      }
    }

    return labels.join(", ");
  }, [selectedProvince, selectedDistrict, selectedCommune, i18n.language, t]);

  // ── FILTER MODAL ───────────────────────────────────────────────────────────
  const renderFilterModal = () => {
    const pendingCount =
      (tempSortBy !== "none" ? 1 : 0) + (tempCondition ? 1 : 0);
    return (
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={S.backdrop}
          onPress={() => setFilterModalVisible(false)}
        />

        <View
          style={[
            S.sheet,
            S.filterSheet,
            { backgroundColor: themeColors.background },
          ]}
        >
          {/* Handle */}
          <View style={S.handle}>
            <View
              style={[S.handlePill, { backgroundColor: themeColors.border }]}
            />
          </View>

          {/* Header */}
          <View style={S.sheetHeader}>
            <Pressable
              style={[
                S.closeBtn,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
              ]}
              onPress={() => setFilterModalVisible(false)}
            >
              <XIcon size={14} color={themeColors.text} weight="bold" />
            </Pressable>
            <ThemedText style={S.sheetTitle}>
              {t("common.filter_sort")}
            </ThemedText>
            <Pressable
              onPress={() => {
                setTempSortBy("none");
                setTempCondition(null);
              }}
            >
              <ThemedText
                style={[
                  S.headerAction,
                  {
                    color:
                      pendingCount > 0 ? themeColors.tint : themeColors.border,
                  },
                ]}
              >
                {t("common.clear_all")}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* ── SORT BY PRICE ─────────────────────────────── */}
            <View style={S.section}>
              <ThemedText style={[S.sectionTitle, { color: themeColors.text }]}>
                {t("common.sort_by_price")}
              </ThemedText>

              <View style={S.filterList}>
                {SORT_OPTIONS.map((opt, idx) => {
                  const active = tempSortBy === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setTempSortBy(opt.value)}
                      style={({ pressed }) => [
                        S.filterListRow,
                        {
                          borderBottomColor: themeColors.border,
                          backgroundColor: active
                            ? `${themeColors.tint}08`
                            : "transparent",
                          borderBottomWidth:
                            idx === SORT_OPTIONS.length - 1
                              ? 0
                              : StyleSheet.hairlineWidth,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          S.radio,
                          active
                            ? {
                                borderColor: themeColors.tint,
                                backgroundColor: themeColors.tint,
                              }
                            : {
                                borderColor: themeColors.border,
                                backgroundColor: "transparent",
                              },
                        ]}
                      >
                        {active && <View style={S.radioCore} />}
                      </View>

                      <ThemedText
                        style={[
                          S.sortLabel,
                          active && {
                            color: themeColors.tint,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {t(opt.labelKey)}
                      </ThemedText>

                      {active && (
                        <View
                          style={[
                            S.checkCircle,
                            { backgroundColor: themeColors.tint },
                          ]}
                        >
                          <CheckIcon size={10} color="#fff" weight="bold" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Divider */}
            <View
              style={[S.divider, { backgroundColor: themeColors.border }]}
            />

            {/* ── CONDITION ─────────────────────────────────── */}
            <View style={S.section}>
              <View style={S.sectionTitleRow}>
                <ThemedText
                  style={[S.sectionTitle, { color: themeColors.text }]}
                >
                  {t("common.condition")}
                </ThemedText>
                {selectedCondition && (
                  <Pressable
                    onPress={() => {
                      setTempCondition(null);
                      setSelectedCondition(null);
                    }}
                  >
                    <ThemedText
                      style={[S.clearBtn, { color: themeColors.tint }]}
                    >
                      {t("common.clear")}
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              <View style={S.filterList}>
                <Pressable
                  onPress={() => setTempCondition(null)}
                  style={({ pressed }) => [
                    S.filterListRow,
                    {
                      borderBottomColor: themeColors.border,
                      backgroundColor:
                        tempCondition === null
                          ? `${themeColors.tint}08`
                          : "transparent",
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      S.radio,
                      tempCondition === null
                        ? {
                            borderColor: themeColors.tint,
                            backgroundColor: themeColors.tint,
                          }
                        : {
                            borderColor: themeColors.border,
                            backgroundColor: "transparent",
                          },
                    ]}
                  >
                    {tempCondition === null && <View style={S.radioCore} />}
                  </View>

                  <ThemedText
                    style={[
                      S.sortLabel,
                      tempCondition === null && {
                        color: themeColors.tint,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {t("common.all_conditions")}
                  </ThemedText>

                  {tempCondition === null && (
                    <View
                      style={[
                        S.checkCircle,
                        { backgroundColor: themeColors.tint },
                      ]}
                    >
                      <CheckIcon size={10} color="#fff" weight="bold" />
                    </View>
                  )}
                </Pressable>

                {CONDITIONS.map((c, idx) => {
                  const active = tempCondition === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setTempCondition(c.value)}
                      style={({ pressed }) => [
                        S.filterListRow,
                        {
                          borderBottomColor: themeColors.border,
                          backgroundColor: active
                            ? `${themeColors.tint}08`
                            : "transparent",
                          borderBottomWidth:
                            idx === CONDITIONS.length - 1
                              ? 0
                              : StyleSheet.hairlineWidth,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          S.radio,
                          active
                            ? {
                                borderColor: themeColors.tint,
                                backgroundColor: themeColors.tint,
                              }
                            : {
                                borderColor: themeColors.border,
                                backgroundColor: "transparent",
                              },
                        ]}
                      >
                        {active && <View style={S.radioCore} />}
                      </View>

                      <ThemedText
                        style={[
                          S.sortLabel,
                          active && {
                            color: themeColors.tint,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {t(c.labelKey)}
                      </ThemedText>

                      {active && (
                        <View
                          style={[
                            S.checkCircle,
                            { backgroundColor: themeColors.tint },
                          ]}
                        >
                          <CheckIcon size={10} color="#fff" weight="bold" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[S.sheetFooter, { borderTopColor: themeColors.border }]}>
            <Pressable
              onPress={applyFilters}
              style={({ pressed }) => [
                S.applyBtn,
                {
                  backgroundColor: themeColors.tint,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FunnelIcon size={16} color="#fff" weight="fill" />
              <ThemedText style={S.applyBtnText}>
                {`${t("common.apply")} ${t("common.filter")}`}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View
      style={[
        S.header,
        {
          backgroundColor: themeColors.background,
          borderBottomColor: themeColors.border,
        },
      ]}
    >
      <Pressable onPress={() => router.back()} style={S.backBtn}>
        <CaretLeftIcon size={22} color={themeColors.text} weight="bold" />
      </Pressable>
      <View
        style={[
          S.headerSearch,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
      >
        <MagnifyingGlassIcon size={15} color="#9CA3AF" />
        <TextInput
          style={[S.headerSearchInput, { color: themeColors.text }]}
          placeholder={t("common.search")}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchProducts()}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => {
              setSearchQuery("");
              fetchProducts();
            }}
            hitSlop={8}
          >
            <XIcon size={13} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
    </View>
  );

  // ── SUBCATEGORY CHIPS + ACTION ROW ─────────────────────────────────────────
  const renderFilters = () => (
    <View>
      {/* Sub-category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.chipsRow}
      >
        {[
          { id: null, name_key: "common.showAll", icon_name: null },
          ...subCategories,
        ].map((sub) => {
          const active = selectedSubCategoryId === sub.id;
          return (
            <Pressable
              key={sub.id ?? "__all__"}
              onPress={() => {
                if (sub.id === null) {
                  setSelectedSubCategoryId(null);
                  setSelectedSubCategoryName(null);
                } else if (active) {
                  setSelectedSubCategoryId(null);
                  setSelectedSubCategoryName(null);
                } else {
                  setSelectedSubCategoryId(sub.id);
                  setSelectedSubCategoryName(sub.name_key);
                }
              }}
              style={[
                S.chip,
                active
                  ? {
                      backgroundColor: themeColors.tint,
                      borderColor: themeColors.tint,
                    }
                  : {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
              ]}
            >
              {sub.icon_name && (
                <DynamicPhosphorIcon
                  name={sub.icon_name}
                  size={13}
                  color={active ? "#fff" : themeColors.text}
                  weight={active ? "fill" : "regular"}
                />
              )}
              <ThemedText
                style={[
                  S.chipText,
                  { color: active ? "#fff" : themeColors.text },
                ]}
              >
                {sub.id === null
                  ? t("common.showAll")
                  : t(`subcategories.${sub.name_key}`, {
                      defaultValue: sub.name_key,
                    })}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Location + Filter row */}
      <View
        style={[
          S.actionRow,
          {
            borderTopColor: themeColors.border,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        {/* Location pill */}
        <Pressable
          onPress={openLocationModal}
          style={[
            S.actionPill,
            { flex: 1 },
            selectedProvince || selectedDistrict || selectedCommune
              ? {
                  backgroundColor: `${themeColors.tint}10`,
                  borderColor: themeColors.tint,
                }
              : {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
          ]}
        >
          <MapPinIcon
            size={14}
            color={
              selectedProvince || selectedDistrict || selectedCommune
                ? themeColors.tint
                : "#9CA3AF"
            }
            weight={
              selectedProvince || selectedDistrict || selectedCommune
                ? "fill"
                : "regular"
            }
          />
          <ThemedText
            style={[
              S.pillText,
              {
                color:
                  selectedProvince || selectedDistrict || selectedCommune
                    ? themeColors.tint
                    : themeColors.text,
              },
            ]}
            numberOfLines={1}
          >
            {getLocationLabel()}
          </ThemedText>
          {selectedProvince || selectedDistrict || selectedCommune ? (
            <Pressable
              onPress={() => {
                setSelectedProvince(null);
                setSelectedDistrict(null);
                setSelectedCommune(null);
              }}
              hitSlop={8}
            >
              <View style={[S.pillX, { backgroundColor: themeColors.tint }]}>
                <XIcon size={8} color="#fff" weight="bold" />
              </View>
            </Pressable>
          ) : (
            <ThemedText style={[S.pillChevron, { color: "#9CA3AF" }]}>
              ›
            </ThemedText>
          )}
        </Pressable>

        <View
          style={[S.pillSeparator, { backgroundColor: themeColors.border }]}
        />

        {/* Filter pill */}
        <Pressable
          onPress={openFilterModal}
          style={[
            S.actionPill,
            { flex: 1 },
            activeFilterCount > 0
              ? {
                  backgroundColor: `${themeColors.tint}10`,
                  borderColor: themeColors.tint,
                }
              : {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
          ]}
        >
          <FunnelIcon
            size={14}
            color={activeFilterCount > 0 ? themeColors.tint : "#9CA3AF"}
            weight={activeFilterCount > 0 ? "fill" : "regular"}
          />
          <ThemedText
            style={[
              S.pillText,
              {
                color:
                  activeFilterCount > 0 ? themeColors.tint : themeColors.text,
              },
            ]}
          >
            {t("common.filter")}
          </ThemedText>
          {activeFilterCount > 0 ? (
            <Pressable
              onPress={() => {
                setSortBy("none");
                setSelectedCondition(null);
              }}
              hitSlop={8}
            >
              <View style={[S.pillX, { backgroundColor: themeColors.tint }]}>
                <XIcon size={8} color="#fff" weight="bold" />
              </View>
            </Pressable>
          ) : (
            <ThemedText style={[S.pillChevron, { color: "#9CA3AF" }]}>
              ›
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[S.container, { backgroundColor: themeColors.background }]}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}
      {renderFilters()}

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 60 }}
          size="large"
          color={themeColors.tint}
        />
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <View style={S.gridItem}>
              <ProductCard
                product={item as any}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={S.listContent}
          columnWrapperStyle={S.columnWrapper}
          onRefresh={() => fetchProducts(true)}
          refreshing={loading}
          ListEmptyComponent={
            <View style={S.emptyWrap}>
              <ThemedText>{t("common.noProductsFound")}</ThemedText>
            </View>
          }
        />
      )}

      <LocationFilterModal
        isVisible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onApplyFilters={applyLocation}
        currentProvince={selectedProvince}
        currentDistrict={selectedDistrict}
        currentCommune={selectedCommune}
      />
      {renderFilterModal()}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES  (single source of truth — no overrides, no duplicates)
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Screen
  container: { flex: 1 },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  headerSearch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  headerSearchInput: { flex: 1, fontSize: 14 },

  // ── Chips
  chipsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    gap: 5,
  },
  chipText: { fontSize: 13, fontWeight: "600" },

  // ── Action row (location + filter)
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  pillText: { flex: 1, fontSize: 13, fontWeight: "500" },
  pillChevron: { fontSize: 18, lineHeight: 22 },
  pillX: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSeparator: { width: 1, height: 24 },

  // ── Product list
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  columnWrapper: { gap: 12 },
  gridItem: { flex: 1, maxWidth: "48.5%", marginBottom: 12 },
  emptyWrap: { alignItems: "center", marginTop: 80 },

  // ─────────────────────────────────────────────────
  // SHARED BOTTOM SHEET
  // ─────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  filterSheet: { maxHeight: "90%" },

  // Handle
  handle: { alignItems: "center", paddingTop: 10, paddingBottom: 2 },
  handlePill: { width: 36, height: 4, borderRadius: 2 },

  // Sheet header
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  headerAction: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 56,
    textAlign: "right",
  },

  // Sheet footer
  sheetFooter: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,

    height: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  applyBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // ─────────────────────────────────────────────────
  // FILTER MODAL (and shared radio/check components)
  // ─────────────────────────────────────────────────
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCore: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
    marginBottom: 14,
  },
  clearBtn: { marginLeft: "auto", fontSize: 13, fontWeight: "600" },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginTop: 8,
  },

  // Sort rows (connected card style)
  filterList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  filterListRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  sortLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
});
