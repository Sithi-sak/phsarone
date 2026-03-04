import { useTradeProducts } from "@/src/context/TradeProductsContext";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import TradeProductCard from "@src/components/trade_components/TradeProductCard";
import useThemeColor from "@src/hooks/useThemeColor";
import { useRouter } from "expo-router";
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from "phosphor-react-native";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TradeScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const { products, loading, refreshProducts } = useTradeProducts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProducts();
    setRefreshing(false);
  };

  const productsToDisplay = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const titleMatch = product.title.toLowerCase().includes(query);
      const wantedMatch = product.lookingFor.some((item) =>
        item.name.toLowerCase().includes(query),
      );
      return titleMatch || wantedMatch;
    });
  }, [products, searchQuery]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  const handleAddNewTrade = () => {
    router.push("/trade/AddTradeProductScreen");
  };

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
            placeholder={t("trade_screen.search_placeholder")}
            placeholderTextColor={themeColors.text + "80"}
            style={[styles.input, { color: themeColors.text }]}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchActionButton}>
            <ThemedText style={styles.searchActionText}>
              {t("common.search")}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: themeColors.card,
            },
          ]}
          activeOpacity={0.8}
        >
          <FunnelIcon size={20} color={themeColors.text} />
        </TouchableOpacity>
      </View>

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
          ListHeaderComponent={
            hasActiveSearch ? (
              <View style={styles.activeFilterContainer}>
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearFilterRow}
                >
                  <XIcon size={13} color={themeColors.text} />
                  <ThemedText style={styles.clearFilterText}>
                    {t("trade_screen.clear_filter")}
                  </ThemedText>
                </TouchableOpacity>

                <View
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: themeColors.secondaryBackground,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <ThemedText style={styles.filterChipText}>
                    {searchQuery}
                  </ThemedText>
                </View>
              </View>
            ) : null
          }
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
                {t("trade_screen.no_listings_found")}
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {hasActiveSearch
                  ? t("trade_screen.clear_filter")
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
          style={[styles.fab, { backgroundColor: themeColors.primary }]}
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
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchRow: {
    flex: 1,
    borderRadius: 99,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  activeFilterContainer: {
    marginTop: 4,
    marginBottom: 10,
  },
  clearFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.75,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 13,
    opacity: 0.8,
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
    bottom: 70,
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
