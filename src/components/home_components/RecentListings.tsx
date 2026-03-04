import ProductCard from "@src/components/category_components/ProductCard";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { mapDatabaseProductToProduct } from "@src/utils/productUtils";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface RecentListingsProps {
  products: any[];
  loading: boolean;
}

export default function RecentListings({
  products,
  loading,
}: RecentListingsProps) {
  const { t } = useTranslation();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#E44336" />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.center}>
        <ThemedText>
          {t("category.no_products") || "No products found"}
        </ThemedText>
      </View>
    );
  }

  const renderProduct = (item: any) => {
    const product = mapDatabaseProductToProduct(item);
    return (
      <ProductCard
        key={product.id}
        product={product}
        onPress={() => {
          router.push(`/product/${product.id}`);
        }}
      />
    );
  };

  const showPlaceholder = products.length % 2 === 1;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>
        {t("home_screen.recent_listings")}
      </ThemedText>
      <View style={styles.row}>
        {products.map((item) => (
          <View key={item.id} style={styles.productItem}>
            {renderProduct(item)}
          </View>
        ))}
        {showPlaceholder && (
          <View style={[styles.productItem, styles.placeholder]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    marginHorizontal: 6,
    marginBottom: 68,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    paddingBottom: 10,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  productItem: {
    width: "49%",
  },
  placeholder: {
    opacity: 0,
  },
});
