import { useAuth } from "@clerk/clerk-expo";
import ProductCard from "@src/components/category_components/ProductCard";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Colors } from "@src/constants/Colors";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { fetchBlockedUserIds } from "@src/lib/blockedUsers";
import { getEntitlements } from "@src/lib/entitlements";
import { createClerkSupabaseClient, supabase } from "@src/lib/supabase";
import * as ExpoLinking from "expo-linking";
import {
  Href,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  CaretLeftIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  RowsIcon,
  SquaresFourIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "phosphor-react-native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId: currentUserId, getToken } = useAuth();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  const isOwnProfile = id === currentUserId;

  const [userData, setUserData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccessVisible, setReportSuccessVisible] = useState(false);
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [updatingBlockState, setUpdatingBlockState] = useState(false);

  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [togglingFollow, setTogglingFollow] = useState(false);

  const accountType = String(userData?.user_type || "regular").toLowerCase();
  const accountEntitlements = getEntitlements({
    fallbackUserType: accountType,
  });
  const hasEnhancedProfile = accountEntitlements.hasSellerProfileEnhancement;
  const accountTypeLabel =
    accountType === "starter"
      ? `${t("subscription_screen.starter")} Plan`
      : accountType === "pro"
        ? `${t("subscription_screen.pro")} Plan`
        : accountType === "business"
          ? `${t("subscription_screen.business")} Plan`
          : t("user_actions.regular_account");

  const reportReasons = [
    "Scam or fraudulent activity",
    "Prohibited or unsafe items",
    "Harassment or abusive behavior",
    "Fake profile or impersonation",
    "Spam or misleading listings",
  ];

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadScreen = async () => {
        const blocked = await fetchProfileData();
        if (!isActive) return;
        await fetchFollowCounts();
        if (blocked) {
          setIsFollowing(false);
          return;
        }
        await checkFollowStatus();
      };

      loadScreen();

      return () => {
        isActive = false;
      };
    }, [id, currentUserId]),
  );

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (userError) throw userError;
      setUserData(user);

      let blocked = false;
      if (currentUserId && !isOwnProfile) {
        const blockedIds = await fetchBlockedUserIds(
          getToken,
          "blocked sellers public profile",
        );
        blocked = blockedIds.includes(id);
      }

      setIsBlockedUser(blocked);

      if (blocked) {
        setProducts([]);
        return true;
      }

      const { data: userProducts, error: prodError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (prodError) throw prodError;
      setProducts(userProducts || []);
    } catch (error) {
      console.warn("Public profile fetch warning:", error);
    } finally {
      setLoading(false);
    }

    return false;
  };

  const checkFollowStatus = async () => {
    if (!currentUserId || isOwnProfile || isBlockedUser) {
      setIsFollowing(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", currentUserId)
        .eq("following_id", id)
        .single();

      setIsFollowing(!!data);
    } catch (error) {
      setIsFollowing(false);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", id);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", id);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.warn("Follow counts fetch warning:", error);
    }
  };

  const toggleFollow = async () => {
    if (!currentUserId) {
      Alert.alert("Sign In", "Please sign in to follow users.");
      return;
    }
    if (isBlockedUser) return;
    if (togglingFollow) return;

    try {
      setTogglingFollow(true);
      const token = await getAuthToken(getToken, "profile follow toggle");
      const authSupabase = createClerkSupabaseClient(token);

      if (isFollowing) {
        const { error } = await authSupabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", id);
        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount((prev) => prev - 1);
      } else {
        const { error } = await authSupabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: id });
        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error) {
      console.warn("Follow toggle warning:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setTogglingFollow(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      const profileName =
        `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim() ||
        "seller";
      const profileLink = ExpoLinking.createURL(`/user/${id}`);
      await Share.share({
        message: `Check out ${profileName}'s profile on PhsarOne.\n${profileLink}`,
      });
    } catch (error) {
      console.warn("Profile share warning:", error);
    } finally {
      setShowProfileMenu(false);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUserId || !id || isOwnProfile) return;

    try {
      setUpdatingBlockState(true);
      const token = await getAuthToken(getToken, "profile block user");
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase.from("blocked_users").upsert({
        blocker_id: currentUserId,
        blocked_id: id,
      });
      if (error) throw error;

      await authSupabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", id);

      if (isFollowing) {
        setFollowerCount((prev) => Math.max(0, prev - 1));
      }
      setIsFollowing(false);
      setIsBlockedUser(true);
      setProducts([]);
      setShowProfileMenu(false);
    } catch (error) {
      console.warn("Block user warning:", error);
      Alert.alert("Error", "Could not block this user.");
    } finally {
      setUpdatingBlockState(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!currentUserId || !id || isOwnProfile) return;

    try {
      setUpdatingBlockState(true);
      const token = await getAuthToken(getToken, "profile unblock user");
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", id);

      if (error) throw error;

      setShowProfileMenu(false);
      setIsBlockedUser(false);
      await fetchProfileData();
    } catch (error) {
      console.warn("Unblock user warning:", error);
      Alert.alert("Error", "Could not unblock this user.");
    } finally {
      setUpdatingBlockState(false);
    }
  };

  const handleReportSeller = () => {
    setShowProfileMenu(false);
    setSelectedReportReason("");
    setShowReportSheet(true);
  };

  const handleSubmitReport = async () => {
    if (!currentUserId || !id || !selectedReportReason) return;

    try {
      setSubmittingReport(true);
      const token = await getAuthToken(getToken, "profile report seller", {
        timeoutMs: 45000,
        retries: 2,
      });
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase.from("reports").insert({
        reporter_id: currentUserId,
        target_user_id: id,
        reason: selectedReportReason,
        status: "pending",
      });

      if (error) throw error;

      setShowReportSheet(false);
      setReportSuccessVisible(true);
    } catch (error) {
      console.warn("Report seller warning:", error);
      Alert.alert("Error", "Could not submit this report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.userBasicRow}>
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: themeColors.card },
          ]}
        >
          {userData?.avatar_url ? (
            <Image
              source={{ uri: userData.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={styles.avatarInitial}>
                {userData?.first_name?.[0]?.toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.userInfoText}>
          <View style={styles.userNameRow}>
            <ThemedText style={styles.userName}>
              {userData?.first_name} {userData?.last_name}
            </ThemedText>
            {accountEntitlements.hasVerifiedBadge ? (
              <View style={styles.verifiedBadge}>
                <CheckCircleIcon size={14} color="#15803D" weight="fill" />
                <ThemedText style={styles.verifiedBadgeText}>
                  {t("productDetail.verifiedSeller")}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={styles.userType}>{accountTypeLabel}</ThemedText>
        </View>

      </View>

      {!isBlockedUser && (hasEnhancedProfile || isOwnProfile) ? (
        <View style={styles.bioRow}>
          <ThemedText style={styles.bioText}>
            {hasEnhancedProfile
              ? userData?.bio || t("public_profile.no_bio")
              : "Upgrade to Pro to showcase your seller bio on your public profile."}
          </ThemedText>
          {isOwnProfile && (
            <TouchableOpacity
              style={styles.editBioBtn}
              onPress={() => router.push("/user/edit" as Href)}
            >
              <PencilSimpleIcon size={16} color={themeColors.text} />
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {!isBlockedUser && hasEnhancedProfile ? (
        <View
          style={[
            styles.profileHighlights,
            { backgroundColor: themeColors.card },
          ]}
        >
          <View style={styles.highlightItem}>
            <ThemedText style={styles.highlightValue}>{products.length}</ThemedText>
            <ThemedText style={styles.highlightLabel}>Active listings</ThemedText>
          </View>
          <View style={styles.highlightDivider} />
          <TouchableOpacity
            style={styles.highlightItem}
            onPress={() =>
              router.push({
                pathname: "/user/following",
                params: { id, type: "followers" },
              } as any)
            }
          >
            <ThemedText style={styles.highlightValue}>{followerCount}</ThemedText>
            <ThemedText style={styles.highlightLabel}>Followers</ThemedText>
          </TouchableOpacity>
          <View style={styles.highlightDivider} />
          <TouchableOpacity
            style={styles.highlightItem}
            onPress={() =>
              router.push({
                pathname: "/user/following",
                params: { id, type: "following" },
              } as any)
            }
          >
            <ThemedText style={styles.highlightValue}>{followingCount}</ThemedText>
            <ThemedText style={styles.highlightLabel}>Following</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}

      {!isOwnProfile && (
        <View style={styles.statsActionRow}>
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                router.push({
                  pathname: "/user/following",
                  params: { id, type: "followers" },
                } as any)
              }
            >
              <ThemedText style={styles.statNumber}>{followerCount}</ThemedText>
              <ThemedText style={styles.statLabel}>{t("public_profile.followers")}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                router.push({
                  pathname: "/user/following",
                  params: { id, type: "following" },
                } as any)
              }
            >
              <ThemedText style={styles.statNumber}>{followingCount}</ThemedText>
              <ThemedText style={styles.statLabel}>{t("public_profile.followings")}</ThemedText>
            </TouchableOpacity>
          </View>

          {isBlockedUser ? (
          <View style={styles.blockedActionPlaceholder} />
        ) : (
          <View style={styles.otherUserActions}>
            <TouchableOpacity
              style={[
                styles.followBtn,
                { backgroundColor: isFollowing ? "#F3F4F6" : Colors.reds[500] },
              ]}
              onPress={toggleFollow}
              disabled={togglingFollow}
            >
              {isFollowing ? (
                <UserMinusIcon size={18} color="#374151" />
              ) : (
                <UserPlusIcon size={18} color="#FFF" />
              )}
              <ThemedText
                style={[
                  styles.followBtnText,
                  isFollowing && { color: "#374151" },
                ]}
              >
                {isFollowing ? t("public_profile.unfollow") : t("public_profile.follow")}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.messageBtn, { borderColor: Colors.reds[500] }]}
              onPress={() => console.log("Message user")}
            >
              <ThemedText
                style={[styles.messageBtnText, { color: Colors.reds[500] }]}
              >
                {t("public_profile.message")}
              </ThemedText>
            </TouchableOpacity>
          </View>
          )}
        </View>
      )}

      {isBlockedUser ? (
        <View
          style={[
            styles.blockedStateCard,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <ThemedText style={styles.blockedStateTitle}>
            You blocked this seller
          </ThemedText>
          <ThemedText
            style={[styles.blockedStateText, { color: themeColors.text + "99" }]}
          >
            Their listings and contact actions are hidden until you unblock them.
          </ThemedText>
          <TouchableOpacity
            style={[
              styles.unblockBtn,
              { backgroundColor: Colors.reds[500], opacity: updatingBlockState ? 0.7 : 1 },
            ]}
            onPress={handleUnblockUser}
            disabled={updatingBlockState}
          >
            <ThemedText style={styles.unblockBtnText}>
              {updatingBlockState ? "Updating..." : "Unblock"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}

      {!isBlockedUser ? (
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>{t("public_profile.recent_post")}</ThemedText>
          <View style={styles.viewToggle}>
            <TouchableOpacity onPress={() => setViewMode("list")}>
              <RowsIcon
                size={24}
                color={themeColors.text}
                weight={viewMode === "list" ? "fill" : "regular"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode("grid")}>
              <SquaresFourIcon
                size={24}
                color={themeColors.text}
                weight={viewMode === "grid" ? "fill" : "regular"}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderProductItem = ({ item }: { item: any }) => {
    const mappedProduct = {
      ...item,
      photos: item.images || [],
      createdAt: item.created_at,
      negotiable: item.is_negotiable,
      currency: item.metadata?.currency || "USD",
      address: {
        province: item.location_name,
        district: item.metadata?.district,
        commune: item.metadata?.commune,
      },
    };

    if (viewMode === "grid") {
      return (
        <View style={styles.gridItemWrapper}>
          <ProductCard
            product={mappedProduct as any}
            onPress={() => router.push(`/product/${item.id}` as Href)}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.listItem, { backgroundColor: themeColors.card }]}
        onPress={() => router.push(`/product/${item.id}` as Href)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: mappedProduct.photos[0] || "https://via.placeholder.com/150",
          }}
          style={styles.listImage}
        />
        <View style={styles.listInfo}>
          <View>
            <ThemedText style={styles.listTitle} numberOfLines={2}>
              {mappedProduct.title}
            </ThemedText>
            <ThemedText style={styles.listMetaText}>
              {mappedProduct.address.province} •{" "}
              {new Date(mappedProduct.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>

          <ThemedText style={[styles.listPrice, { color: Colors.reds[500] }]}>
            {mappedProduct.currency === "USD" ? "$" : ""}
            {mappedProduct.price}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !userData) {
    return (
      <View
        style={[styles.center, { backgroundColor: themeColors.background }]}
      >
        <ActivityIndicator size="small" color={Colors.reds[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.navTitle}>{t("public_profile.profile")}</ThemedText>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setShowProfileMenu((current) => !current)}
        >
          <DotsThreeIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setShowProfileMenu(false)}
        >
          <Pressable
            style={[
              styles.menuCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push("/user/edit" as Href);
                  }}
                >
                  <ThemedText style={styles.menuItemText}>Edit profile</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleShareProfile}
                >
                  <ThemedText style={styles.menuItemText}>Share profile</ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleShareProfile}
                >
                  <ThemedText style={styles.menuItemText}>Share profile</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleReportSeller}
                >
                  <ThemedText style={styles.menuItemText}>Report seller</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={isBlockedUser ? handleUnblockUser : handleBlockUser}
                >
                  <ThemedText style={[styles.menuItemText, styles.menuDangerText]}>
                    {isBlockedUser ? "Unblock user" : "Block user"}
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showReportSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportSheet(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setShowReportSheet(false)}
        >
          <Pressable
            style={[
              styles.reportSheet,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText style={styles.reportTitle}>Report seller</ThemedText>
            <ThemedText
              style={[styles.reportSubtitle, { color: themeColors.text + "99" }]}
            >
              Select the reason that best describes the issue.
            </ThemedText>

            <View style={styles.reportOptions}>
              {reportReasons.map((reason) => {
                const selected = selectedReportReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reportOption,
                      {
                        backgroundColor: selected
                          ? "#FDECEC"
                          : themeColors.background,
                        borderColor: selected
                          ? Colors.reds[500]
                          : themeColors.border,
                      },
                    ]}
                    onPress={() => setSelectedReportReason(reason)}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={[
                        styles.reportOptionText,
                        selected && { color: Colors.reds[500], fontWeight: "700" },
                      ]}
                    >
                      {reason}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.reportActions}>
              <TouchableOpacity
                style={[
                  styles.reportActionSecondary,
                  { borderColor: themeColors.border },
                ]}
                onPress={() => setShowReportSheet(false)}
              >
                <ThemedText style={styles.reportActionSecondaryText}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportActionPrimary,
                  {
                    backgroundColor: selectedReportReason
                      ? Colors.reds[500]
                      : "#F3B7B2",
                    opacity: selectedReportReason ? 1 : 0.8,
                  },
                ]}
                onPress={handleSubmitReport}
                disabled={!selectedReportReason || submittingReport}
              >
                <ThemedText style={styles.reportActionPrimaryText}>
                  {submittingReport ? "Submitting..." : "Submit report"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ActionStatusModal
        visible={reportSuccessVisible}
        hideHeaderTone
        tone="success"
        title="Report submitted"
        description="Thank you. Your report has been sent for review."
        actionLabel="Continue"
        onClose={() => setReportSuccessVisible(false)}
      />

      <FlatList
        data={products}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
        renderItem={renderProductItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText>{t("public_profile.no_posts")}</ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  backBtn: {
    padding: 8,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
  },
  menuCard: {
    position: "absolute",
    top: 58,
    right: 16,
    width: 172,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuDangerText: {
    color: "#DC2626",
  },
  reportSheet: {
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: "auto",
    marginBottom: 24,
    padding: 18,
    width: "92%",
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  reportSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  reportOptions: {
    gap: 10,
  },
  reportOption: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  reportOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  reportActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  reportActionSecondary: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  reportActionSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  reportActionPrimary: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1.2,
    justifyContent: "center",
    paddingVertical: 13,
  },
  reportActionPrimaryText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  blockedStateCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
    padding: 16,
  },
  blockedActionPlaceholder: {
    width: 120,
  },
  blockedStateTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  blockedStateText: {
    fontSize: 14,
    lineHeight: 20,
  },
  unblockBtn: {
    alignItems: "center",
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 12,
  },
  unblockBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userBasicRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "700",
    opacity: 0.3,
  },
  userInfoText: {
    marginLeft: 16,
    flex: 1,
  },
  userNameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedBadgeText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "700",
  },
  userType: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 2,
  },
  bioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  bioText: {
    fontSize: 16,
    opacity: 0.8,
  },
  profileHighlights: {
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  highlightItem: {
    alignItems: "center",
    flex: 1,
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  highlightLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
    textAlign: "center",
  },
  highlightDivider: {
    backgroundColor: "#E5E7EB",
    width: 1,
  },
  editBioBtn: {
    padding: 4,
  },
  statsActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.5,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 24,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: "center",
  },
  actionBtnText: {
    color: Colors.reds[500],
    fontSize: 15,
    fontWeight: "600",
  },
  otherUserActions: {
    flexDirection: "row",
    gap: 6,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  followBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  messageBtn: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewToggle: {
    flexDirection: "row",
    gap: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  gridRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gridItemWrapper: {
    width: (width - 44) / 2,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    padding: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  listImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  listInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  listMetaText: {
    fontSize: 13,
    opacity: 0.5,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
