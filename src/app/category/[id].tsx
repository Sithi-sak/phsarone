import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon, FunnelIcon, MapPinIcon } from "phosphor-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ProductCard from "@src/components/category_components/ProductCard";
import DynamicPhosphorIcon from "@src/components/shared_components/DynamicPhosphorIcon";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { supabase } from "@src/lib/supabase";
import { Product } from "@src/types/productTypes";
import { mapDatabaseProductToProduct } from "@src/utils/productUtils";

interface Category {
  id: string;
  name_key: string;
  icon_name: string | null;
}

export default function CategorySearchScreen() {
  const { id: mainCategoryId, title } = useLocalSearchParams<{
    id: string;
    title: string;
  }>();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();

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

  const fetchSubCategories = useCallback(async () => {
    if (!mainCategoryId) return;
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_key, icon_name")
        .eq("parent_id", mainCategoryId);

      if (error) throw error;
      setSubCategories(data || []);
    } catch (error) {
      console.error("Error fetching sub-categories:", error);
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
          // Fetch products for main category and all its children
          const { data: subCats } = await supabase
            .from("categories")
            .select("id")
            .eq("parent_id", mainCategoryId);

          const catIds = [mainCategoryId, ...(subCats?.map((c) => c.id) || [])];
          query = query.in("category_id", catIds);
        }
        if (searchQuery) {
          query = query.ilike("title", `%${searchQuery}%`);
        }

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) throw error;
        const mappedProducts = ((data as any[]) || []).map(
          mapDatabaseProductToProduct,
        );
        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching category products:", error);
      } finally {
        setLoading(false);
      }
    },
    [mainCategoryId, selectedSubCategoryId, searchQuery],
  );

  useEffect(() => {
    fetchSubCategories();
  }, [fetchSubCategories]);

  useEffect(() => {
    fetchProducts();
  }, [mainCategoryId, selectedSubCategoryId]); // We trigger search on button click or sub-cat change

  const handleSearch = () => {
    fetchProducts();
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: themeColors.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
      </TouchableOpacity>
      <View style={[styles.searchContainer, { backgroundColor: "#F3F4F6" }]}>
        <TextInput
          style={[styles.searchInput, { color: "#000" }]}
          placeholder={t("common.search")}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
          <ThemedText style={styles.searchBtnText}>
            {t("common.search")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subCategoryScroll}
      >
        <TouchableOpacity
          style={[
            styles.subChip,
            {
              backgroundColor:
                selectedSubCategoryId === null ? themeColors.tint : "#F3F4F6",
            },
          ]}
          onPress={() => {
            setSelectedSubCategoryId(null);
            setSelectedSubCategoryName(null);
          }}
        >
          <ThemedText
            style={[
              styles.subChipText,
              { color: selectedSubCategoryId === null ? "#FFF" : "#4B5563" },
            ]}
          >
            {t("common.showAll")}
          </ThemedText>
        </TouchableOpacity>

        {subCategories.map((sub) => {
          const isSelected = selectedSubCategoryId === sub.id;
          return (
            <TouchableOpacity
              key={sub.id}
              style={[
                styles.subChip,
                {
                  backgroundColor: isSelected ? themeColors.tint : "#F3F4F6",
                },
              ]}
              onPress={() => {
                if (isSelected) {
                  setSelectedSubCategoryId(null);
                  setSelectedSubCategoryName(null);
                } else {
                  setSelectedSubCategoryId(sub.id);
                  setSelectedSubCategoryName(sub.name_key);
                }
              }}
            >
              {sub.icon_name && (
                <DynamicPhosphorIcon
                  name={sub.icon_name}
                  size={18}
                  color={isSelected ? "#FFF" : "#4B5563"}
                  weight={isSelected ? "fill" : "regular"}
                />
              )}
              <ThemedText
                style={[
                  styles.subChipText,
                  { color: isSelected ? "#FFF" : "#4B5563" },
                ]}
              >
                {t(`subcategories.${sub.name_key}`, {
                  defaultValue: sub.name_key,
                })}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#F3F4F6" }]}
        >
          <MapPinIcon size={18} color="#000" />
          <ThemedText style={styles.actionBtnText}>
            {t("common.location")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#F3F4F6" }]}
        >
          <FunnelIcon size={18} color="#000" />
          <ThemedText style={styles.actionBtnText}>
            {t("common.filter")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}
      {renderFilters()}

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 50 }}
          size="small"
          color={themeColors.tint}
        />
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <View style={styles.productGridItem}>
              <ProductCard
                product={item as any}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          onRefresh={() => fetchProducts(true)}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText>{t("common.noProductsFound")}</ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 99,
    paddingLeft: 20,
    paddingRight: 8,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  searchBtn: {
    paddingHorizontal: 12,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  filterSection: {
    paddingBottom: 16,
  },
  subCategoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  subChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtonsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 99,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: 12,
  },
  productGridItem: {
    flex: 1,
    maxWidth: "48.5%",
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 100,
  },
});
