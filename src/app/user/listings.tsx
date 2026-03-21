import { useAuth } from "@clerk/clerk-expo";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import BoostListingModal from "@src/components/shared_components/BoostListingModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import UpgradePromptModal from "@src/components/shared_components/UpgradePromptModal";
import { useBoostProduct } from "@src/hooks/useBoostProduct";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { getEntitlements } from "@src/lib/entitlements";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import {
  createListingExpiryFromNow,
  getDaysUntilListingExpiry,
  getEffectiveListingStatus,
  getListingExpiryDate,
  normalizePlanType,
} from "@src/utils/listingExpiry";
import { formatPrice, formatTimeAgo } from "@src/utils/productUtils";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowsCounterClockwiseIcon,
  CaretLeftIcon,
  ChatTeardropTextIcon,
  EyeIcon,
  PauseIcon,
  PencilSimpleIcon,
  RocketLaunchIcon,
} from "phosphor-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LISTINGS_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

export default function MyListingsScreen() {
  const { userId, getToken } = useAuth();
  const { status } = useLocalSearchParams<{ status: string }>(); // 'active', 'sold', 'draft', 'expired'
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPlanType, setUserPlanType] = useState("regular");
  const [activeListingCount, setActiveListingCount] = useState(0);
  const [monthlyBoostsUsed, setMonthlyBoostsUsed] = useState(0);
  const [boostPrompt, setBoostPrompt] = useState<{
    description: string;
    productId: string | null;
    title: string;
    visible: boolean;
  }>({
    description: "",
    productId: null,
    title: "",
    visible: false,
  });
  const [boostSuccessPrompt, setBoostSuccessPrompt] = useState<{
    description: string;
    title: string;
    tone?: "error" | "info" | "success";
    visible: boolean;
  }>({
    description: "",
    title: "",
    tone: "success",
    visible: false,
  });
  const [boostUpgradePromptVisible, setBoostUpgradePromptVisible] =
    useState(false);
  const { boostProduct, boostingProductId } = useBoostProduct();

  const fetchMyProducts = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getAuthToken(
        getToken,
        "my listings fetch",
        LISTINGS_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);

      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString();

      const [userResult, boostUsageResult, productResult] = await Promise.all([
        authSupabase
          .from("users")
          .select("user_type")
          .eq("id", userId)
          .maybeSingle(),
        authSupabase
          .from("product_boosts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", monthStart),
        authSupabase
          .from("products")
          .select("*")
          .eq("seller_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (userResult.error) throw userResult.error;
      if (boostUsageResult.error) throw boostUsageResult.error;
      if (productResult.error) throw productResult.error;

      const normalizedPlan = normalizePlanType(userResult.data?.user_type);
      setUserPlanType(normalizedPlan);
      setMonthlyBoostsUsed(boostUsageResult.count || 0);

      const allProducts = productResult.data || [];
      const productIds = allProducts.map((item) => item.id).filter(Boolean);

      let viewsByProductId = new Map<string, number>();
      let chatsByProductId = new Map<string, number>();

      if (productIds.length > 0) {
        const [viewsResult, conversationsResult] = await Promise.all([
          authSupabase
            .from("analytics_views")
            .select("product_id")
            .in("product_id", productIds),
          authSupabase
            .from("conversations")
            .select("id, product_id")
            .in("product_id", productIds),
        ]);

        if (viewsResult.error) throw viewsResult.error;
        if (conversationsResult.error) throw conversationsResult.error;

        viewsByProductId = (viewsResult.data || []).reduce(
          (map, row) => {
            if (!row.product_id) return map;
            map.set(row.product_id, (map.get(row.product_id) || 0) + 1);
            return map;
          },
          new Map<string, number>(),
        );

        chatsByProductId = (conversationsResult.data || []).reduce(
          (map, row) => {
            if (!row.product_id) return map;
            map.set(row.product_id, (map.get(row.product_id) || 0) + 1);
            return map;
          },
          new Map<string, number>(),
        );
      }

      const enrichedProducts = allProducts.map((item) => ({
        ...item,
        _chatCount: chatsByProductId.get(item.id) || 0,
        _viewCount: viewsByProductId.get(item.id) || 0,
      }));

      const expiredIds = enrichedProducts
        .filter((item) => {
          const effectiveStatus = getEffectiveListingStatus(item.status, {
            createdAt: item.created_at,
            metadata: item.metadata as Record<string, any> | null,
            planType: normalizedPlan,
          });

          return effectiveStatus === "expired" && item.status !== "expired";
        })
        .map((item) => item.id);

      if (expiredIds.length > 0) {
        const { error: expireError } = await authSupabase
          .from("products")
          .update({ status: "expired" })
          .eq("seller_id", userId)
          .in("id", expiredIds);

        if (expireError) {
          console.warn("Listing expiry sync warning:", expireError);
        }
      }

      const activeCount = enrichedProducts.filter((item) => {
        const effectiveStatus = getEffectiveListingStatus(item.status, {
          createdAt: item.created_at,
          metadata: item.metadata as Record<string, any> | null,
          planType: normalizedPlan,
        });
        return effectiveStatus === "active";
      }).length;
      setActiveListingCount(activeCount);

      const requestedStatus = String(status || "active").toLowerCase();
      const filtered = enrichedProducts.filter((item) => {
        const effectiveStatus = getEffectiveListingStatus(item.status, {
          createdAt: item.created_at,
          metadata: item.metadata as Record<string, any> | null,
          planType: normalizedPlan,
        });
        return effectiveStatus === requestedStatus;
      });

      setProducts(filtered);
    } catch (error) {
      console.warn("Listings fetch warning:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, [userId, status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyProducts();
    setRefreshing(false);
  }, [userId, status]);

  const handleUpdateStatus = async (
    id: string,
    newStatus: string,
    item?: any,
  ) => {
    try {
      if (newStatus === "active") {
        const { maxActiveAds, planType } = getEntitlements({
          fallbackUserType: userPlanType,
        });
        const isAlreadyActive =
          String(item?.status || "").toLowerCase() === "active";

        if (!isAlreadyActive && activeListingCount >= maxActiveAds) {
          Alert.alert(
            "Listing limit reached",
            `Your ${
              planType.charAt(0).toUpperCase() + planType.slice(1)
            } plan allows ${maxActiveAds} active listings. Upgrade your plan or free up a slot first.`,
          );
          return;
        }
      }

      const token = await getAuthToken(
        getToken,
        "listing status update",
        LISTINGS_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);

      const updatePayload: Record<string, any> = { status: newStatus };

      if (newStatus === "active") {
        updatePayload.metadata = {
          ...(item?.metadata || {}),
          listing_expires_at: createListingExpiryFromNow(userPlanType),
        };
      }

      const { error } = await authSupabase
        .from("products")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;
      fetchMyProducts();
    } catch (err) {
      console.warn("Listing status update warning:", err);
      Alert.alert(
        "Update failed",
        err instanceof Error
          ? err.message
          : "Unable to update this listing.",
      );
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t("common.delete") || "Delete",
      t("common.confirm_delete") ||
        "Are you sure you want to delete this listing?",
      [
        { text: t("common.cancel") || "Cancel", style: "cancel" },
        {
          text: t("common.delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getAuthToken(
              getToken,
              "listing delete",
              LISTINGS_AUTH_OPTIONS,
            );
            const authSupabase = createClerkSupabaseClient(token);
            const { error } = await authSupabase
              .from("products")
              .delete()
              .eq("id", id);
            if (!error) fetchMyProducts();
          },
        },
      ],
    );
  };

  const promptUpgradeForBoost = () => {
    setBoostUpgradePromptVisible(true);
  };

  const formatBoostTimestamp = (iso?: string | null) => {
    if (!iso) return null;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    return `Boosted ${formatTimeAgo(iso, t)}`;
  };

  const handleBoost = async (item: any) => {
    const entitlements = getEntitlements({ fallbackUserType: userPlanType });
    const hasUnlimitedBoosts = entitlements.monthlyBoosts >= 9999;

    if (entitlements.monthlyBoosts <= 0) {
      promptUpgradeForBoost();
      return;
    }

    if (!hasUnlimitedBoosts && monthlyBoostsUsed >= entitlements.monthlyBoosts) {
      promptUpgradeForBoost();
      return;
    }

    setBoostPrompt({
      description: item.metadata?.last_boosted_at
        ? "This will use another boost from your monthly allowance and refresh the listing promotion timestamp."
        : "This will use one boost from your monthly allowance and promote this active listing.",
      productId: item.id,
      title: item.metadata?.last_boosted_at
        ? "Boost listing again?"
        : "Boost listing?",
      visible: true,
    });
  };

  const confirmBoost = async () => {
    if (!boostPrompt.productId) return;

    try {
      const result = await boostProduct(boostPrompt.productId);
      setBoostPrompt((current) => ({ ...current, visible: false }));
      await fetchMyProducts();
      setBoostSuccessPrompt({
        description:
          result.monthly_boost_limit >= 9999
            ? "Your listing was boosted successfully."
            : `Your listing was boosted successfully. ${result.monthly_boosts_remaining} boost${result.monthly_boosts_remaining === 1 ? "" : "s"} remaining this month.`,
        title: "Listing boosted",
        tone: "success",
        visible: true,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to boost this listing.";

      setBoostPrompt((current) => ({ ...current, visible: false }));

      if (
        message.includes("paid plan") ||
        message.includes("allowance") ||
        message.includes("boosts available")
      ) {
        promptUpgradeForBoost();
        return;
      }

      setBoostSuccessPrompt({
        description: message,
        title: "Boost failed",
        tone: "error",
        visible: true,
      });
    }
  };

  const renderActiveItem = (item: any) => (
    <View style={[styles.card, { backgroundColor: themeColors.card }]}>
      <View style={styles.cardContent}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/150",
          }}
          style={styles.image}
        />
        <View style={styles.details}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.price}>
            {formatPrice(item.price, item.metadata?.currency || "USD")}
          </ThemedText>

          <ThemedText style={styles.expiryText}>
            {(() => {
              const daysLeft = getDaysUntilListingExpiry({
                createdAt: item.created_at,
                metadata: item.metadata as Record<string, any> | null,
                planType: userPlanType,
              });
              if (daysLeft == null) return "";
              if (daysLeft <= 0) return "Expired";
              if (daysLeft === 1) return "Expires in 1 day";
              return `Expires in ${daysLeft} days`;
            })()}
          </ThemedText>

          {item.metadata?.last_boosted_at ? (
            <View style={styles.boostMetaRow}>
              <View style={styles.boostBadge}>
                <RocketLaunchIcon size={12} color="#B42318" weight="fill" />
                <ThemedText style={styles.boostBadgeText}>
                  {formatBoostTimestamp(item.metadata?.last_boosted_at)}
                </ThemedText>
              </View>
              <ThemedText style={styles.boostCountText}>
                {`Boosts: ${Number(item.metadata?.boost_count || 0)}`}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <EyeIcon size={14} color={themeColors.text} />
              <ThemedText style={styles.statText}>
                {item._viewCount || 0}
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <ChatTeardropTextIcon size={14} color={themeColors.text} />
              <ThemedText style={styles.statText}>
                {item._chatCount || 0}
              </ThemedText>
            </View>
            <ThemedText style={styles.timeAgo}>
              {formatTimeAgo(item.created_at, t)}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/sell/details?editId=${item.id}`)}
        >
          <PencilSimpleIcon size={18} color={themeColors.text} />
          <ThemedText style={styles.actionButtonText}>
            {t("listings_screen.edit")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleBoost(item)}
          disabled={boostingProductId === item.id}
        >
          <RocketLaunchIcon
            size={18}
            color={
              boostingProductId === item.id
                ? themeColors.tabIconDefault
                : themeColors.text
            }
          />
          <ThemedText
            style={[
              styles.actionButtonText,
              boostingProductId === item.id && styles.actionButtonTextDisabled,
            ]}
          >
            {boostingProductId === item.id
              ? "Boosting..."
              : item.metadata?.last_boosted_at
                ? "Boost again"
                : t("listings_screen.boost")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleUpdateStatus(item.id, "sold")}
        >
          <PauseIcon size={18} color={themeColors.text} />
          <ThemedText style={styles.actionButtonText}>
            {t("listings_screen.pause")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSoldItem = (item: any) => (
    <View style={[styles.card, { backgroundColor: themeColors.card }]}>
      <View style={styles.cardContent}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/150",
          }}
          style={styles.image}
        />
        <View style={styles.details}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.soldOn}>
            {t("listings_screen.pause_on")}{" "}
            {new Date(item.updated_at).toLocaleDateString()}
          </ThemedText>

          <View style={styles.soldPriceRow}>
            <ThemedText style={styles.price}>
              {formatPrice(item.price, item.metadata?.currency || "USD")}
            </ThemedText>
            <TouchableOpacity
              style={styles.relistBtn}
              onPress={() => handleUpdateStatus(item.id, "active", item)}
            >
              <ArrowsCounterClockwiseIcon size={16} color="#fff" />
              <ThemedText style={styles.relistText}>
                {t("listings_screen.relist")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDraftItem = (item: any) => (
    <View style={[styles.card, { backgroundColor: themeColors.card }]}>
      <View style={styles.cardContent}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/150",
          }}
          style={styles.image}
        />
        <View style={styles.details}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {item.title || t("listings_screen.untitled_draft")}
          </ThemedText>
          <ThemedText style={styles.soldOn}>
            Saved as draft
          </ThemedText>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.draftActionBtn,
            { backgroundColor: themeColors.primary },
          ]}
          onPress={() => router.push(`/sell/details?editId=${item.id}`)}
        >
          <ThemedText style={styles.draftActionText}>
            {t("listings_screen.continue_editing")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.draftActionBtn,
            styles.draftDeleteBtn,
            {
              backgroundColor: themeColors.background,
              borderColor: themeColors.primary,
            },
          ]}
          onPress={() => handleDelete(item.id)}
        >
          <ThemedText
            style={[styles.draftActionText, { color: themeColors.primary }]}
          >
            {t("common.delete")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExpiredItem = (item: any) => {
    const expiryDate = getListingExpiryDate({
      createdAt: item.created_at,
      metadata: item.metadata as Record<string, any> | null,
      planType: userPlanType,
    });

    const expiredDateLabel = expiryDate ? expiryDate.toLocaleDateString() : "-";

    return (
      <View style={[styles.card, { backgroundColor: themeColors.card }]}>
        <View style={styles.cardContent}>
          <Image
            source={{
              uri: item.images?.[0] || "https://via.placeholder.com/150",
            }}
            style={styles.image}
          />
          <View style={styles.details}>
            <ThemedText style={styles.title} numberOfLines={1}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.soldOn}>
              Expired on {expiredDateLabel}
            </ThemedText>

            <View style={styles.soldPriceRow}>
              <ThemedText style={styles.price}>
                {formatPrice(item.price, item.metadata?.currency || "USD")}
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.expiredRelistBtn,
                  {
                    backgroundColor: themeColors.primary,
                  },
                ]}
                onPress={() => handleUpdateStatus(item.id, "active", item)}
              >
                <ThemedText style={styles.draftActionText}>Relist</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    if (status === "sold") return renderSoldItem(item);
    if (status === "draft") return renderDraftItem(item);
    if (status === "expired") return renderExpiredItem(item);
    return renderActiveItem(item);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <UpgradePromptModal
        visible={boostUpgradePromptVisible}
        title="Upgrade to boost listings"
        description={
          userPlanType === "regular"
            ? "Boosts are available on Starter, Pro, and Business plans. Upgrade to start promoting your active listings."
            : "You have used your monthly boost allowance. Upgrade your plan to unlock more listing boosts."
        }
        onClose={() => setBoostUpgradePromptVisible(false)}
        onConfirm={() => {
          const recommendedPlan =
            userPlanType === "regular"
              ? "starter"
              : userPlanType === "starter"
                ? "pro"
                : "business";

          setBoostUpgradePromptVisible(false);
          router.push({
            pathname: "/subscription" as any,
            params: { plan: recommendedPlan },
          });
        }}
      />
      <ActionStatusModal
        visible={boostSuccessPrompt.visible}
        title={boostSuccessPrompt.title}
        description={boostSuccessPrompt.description}
        actionLabel="OK"
        tone={boostSuccessPrompt.tone}
        onClose={() =>
          setBoostSuccessPrompt((current) => ({
            ...current,
            tone: "success",
            visible: false,
          }))
        }
      />
      <BoostListingModal
        visible={boostPrompt.visible}
        title={boostPrompt.title}
        description={boostPrompt.description}
        isSubmitting={boostingProductId === boostPrompt.productId}
        onClose={() =>
          setBoostPrompt((current) => ({ ...current, visible: false }))
        }
        onConfirm={confirmBoost}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {t(`user_actions.${status}`) || String(status).toUpperCase()}
        </ThemedText>
        <View style={{ width: 28 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#E44336" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            status === "active" ? (
              <View
                style={[styles.summaryCard, { backgroundColor: themeColors.card }]}
              >
                <ThemedText style={styles.summaryTitle}>
                  Boost allowance
                </ThemedText>
                <ThemedText style={styles.summaryText}>
                  {(() => {
                    const entitlements = getEntitlements({
                      fallbackUserType: userPlanType,
                    });

                    if (entitlements.monthlyBoosts <= 0) {
                      return "Upgrade to Starter or above to unlock listing boosts.";
                    }

                    if (entitlements.monthlyBoosts >= 9999) {
                      return "Your Business plan includes unlimited monthly boosts.";
                    }

                    const remaining = Math.max(
                      entitlements.monthlyBoosts - monthlyBoostsUsed,
                      0,
                    );

                    return `${remaining} of ${entitlements.monthlyBoosts} boosts remaining this month.`;
                  })()}
                </ThemedText>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText>
                {t("category.no_products") || "No listings found"}
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backBtn: {
    padding: 4,
  },
  list: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  card: {
    borderRadius: 6,
    borderCurve: "continuous",
    marginBottom: 8,
    padding: 12,
  },
  cardContent: {
    flexDirection: "row",
    gap: 8,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#f0f0f0",
  },
  details: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  soldOn: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    opacity: 0.6,
  },
  timeAgo: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: "auto",
  },
  expiryText: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 4,
  },
  boostMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  boostBadge: {
    alignItems: "center",
    backgroundColor: "#FEECE9",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  boostBadgeText: {
    color: "#B42318",
    fontSize: 11,
    fontWeight: "600",
  },
  boostCountText: {
    fontSize: 11,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionButtonTextDisabled: {
    opacity: 0.55,
  },
  soldPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  relistBtn: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  relistText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  draftActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  draftDeleteBtn: {
    borderWidth: 1,
  },
  expiredRelistBtn: {
    minWidth: 96,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  draftActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
});
