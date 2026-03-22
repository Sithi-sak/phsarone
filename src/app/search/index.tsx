import ProductCard from "@src/components/category_components/ProductCard";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { fetchBlockedUserIds } from "@src/lib/blockedUsers";
import { getRecommendedProducts, searchProductsWithAI } from "@src/lib/aiSearch";
import { mapDatabaseProductToProduct } from "@src/utils/productUtils";
import { useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter } from "expo-router";
import { CaretLeftIcon, SparkleIcon } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const QUERY_SUGGESTIONS = [
  "cheap laptop for school",
  "family car",
  "skin care serum",
  "iphone 14",
];

export default function SearchScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [blockedSellerIds, setBlockedSellerIds] = useState<string[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const blockedUsersLoadedForRef = useRef<string | null>(null);
  const blockedUsersLoadingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadBlockedUsers = async () => {
      if (!userId || !getToken) {
        blockedUsersLoadedForRef.current = null;
        setBlockedSellerIds([]);
        return;
      }
      if (
        blockedUsersLoadedForRef.current === userId ||
        blockedUsersLoadingRef.current
      ) {
        return;
      }

      blockedUsersLoadingRef.current = true;
      const ids = await fetchBlockedUserIds(getToken, "blocked sellers AI search", {
        cacheKey: userId,
      });
      if (!isCancelled) {
        blockedUsersLoadedForRef.current = userId;
        setBlockedSellerIds(ids);
      }
      blockedUsersLoadingRef.current = false;
    };

    loadBlockedUsers();
    return () => {
      isCancelled = true;
      blockedUsersLoadingRef.current = false;
    };
  }, [userId]);

  useEffect(() => {
    let isCancelled = false;

    const loadRecommendations = async () => {
      try {
        setLoadingRecommendations(true);
        const data = await getRecommendedProducts(userId, blockedSellerIds);
        if (!isCancelled) {
          setRecommendedProducts(data);
        }
      } catch {
        if (!isCancelled) {
          setRecommendedProducts([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingRecommendations(false);
        }
      }
    };

    loadRecommendations();
    return () => {
      isCancelled = true;
    };
  }, [userId, blockedSellerIds]);

  useEffect(() => {
    const normalized = searchQuery.trim();
    if (normalized.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setLoadingSearch(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        setSearchError(null);
        const data = await searchProductsWithAI(normalized, blockedSellerIds);
        if (!isCancelled) {
          setSearchResults(data);
        }
      } catch (error) {
        if (!isCancelled) {
          setSearchResults([]);
          setSearchError(
            error instanceof Error ? error.message : "Search failed.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoadingSearch(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, blockedSellerIds]);

  const hasQuery = searchQuery.trim().length >= 2;
  const visibleProducts = hasQuery ? searchResults : recommendedProducts;
  const visibleTitle = hasQuery ? "Smart results" : userId ? "Picked for you" : "Browse with AI";
  const visibleSubtitle = hasQuery
    ? "Ranked by query meaning, category, and listing relevance."
    : userId
      ? "Based on your recent activity, saved items, and active listings."
      : "Start with a natural phrase or explore recent relevant listings.";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.text + "15",
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: themeColors.text }]}
            placeholder="Search naturally, for example 'cheap laptop for school'"
            placeholderTextColor={themeColors.text + "50"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          <TouchableOpacity
            onPress={Keyboard.dismiss}
            style={styles.searchTextButton}
          >
            <ThemedText style={styles.searchText}>
              {t("navigation.search")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.banner,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={[styles.bannerIcon, { backgroundColor: "#FEECE9" }]}>
            <SparkleIcon size={16} color="#B42318" weight="fill" />
          </View>
          <View style={styles.bannerTextWrap}>
            <ThemedText style={styles.bannerTitle}>Smarter search</ThemedText>
            <ThemedText style={styles.bannerText}>
              {hasQuery
                ? "We blend semantic meaning with category and listing signals."
                : "Use natural phrases or explore recommendations shaped by your activity."}
            </ThemedText>
          </View>
        </View>

        {!hasQuery ? (
          <View style={styles.suggestionRow}>
            {QUERY_SUGGESTIONS.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
                activeOpacity={0.75}
                onPress={() => setSearchQuery(suggestion)}
              >
                <ThemedText style={styles.suggestionChipText}>{suggestion}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>{visibleTitle}</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>{visibleSubtitle}</ThemedText>
        </View>

        {(loadingSearch && hasQuery) || (loadingRecommendations && !hasQuery) ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={themeColors.tint} />
            <ThemedText style={styles.loadingText}>
              {hasQuery ? "Understanding your query and ranking listings..." : "Preparing personalized suggestions..."}
            </ThemedText>
          </View>
        ) : visibleProducts.length > 0 ? (
          <View style={styles.resultsGrid}>
            {visibleProducts.map((item) => {
              const product = mapDatabaseProductToProduct(item);
              return (
                <View key={item.id} style={styles.productItem}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                  />
                </View>
              );
            })}
            {visibleProducts.length % 2 === 1 ? (
              <View style={[styles.productItem, styles.placeholder]} />
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <ThemedText style={styles.emptyTitle}>
              {hasQuery ? "No close matches yet" : "No recommendations ready yet"}
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchError
                ? searchError
                : hasQuery
                  ? "Try a clearer phrase like 'budget laptop', 'family car', or 'skin care serum'."
                  : "Browse a few listings or save some favorites to make recommendations more personal."}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    height: 48,
    paddingLeft: 16,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  searchTextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchText: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.6,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 48,
  },
  banner: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    padding: 16,
  },
  bannerIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.7,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  suggestionChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.82,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.65,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
  },
  loadingText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    opacity: 0.65,
    textAlign: "center",
  },
  resultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  productItem: {
    width: "48.8%",
  },
  placeholder: {
    opacity: 0,
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.72,
    textAlign: "center",
  },
});
