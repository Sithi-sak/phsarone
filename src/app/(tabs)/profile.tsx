import DynamicPhosphorIcon from "@/src/components/shared_components/DynamicPhosphorIcon";
import UpgradePromptModal from "@/src/components/shared_components/UpgradePromptModal";
import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Colors } from "@src/constants/Colors";
import { useTheme } from "@src/context/ThemeContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { getEntitlements } from "@src/lib/entitlements";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useFocusEffect, useRouter } from "expo-router";
import {
  BookmarkSimpleIcon,
  CardholderIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ChartPieSliceIcon,
  ClockCountdownIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  HeadsetIcon,
  MoonIcon,
  Pause,
  PencilSimpleLineIcon,
  PresentationChartIcon,
  SparkleIcon,
  StorefrontIcon,
  SunIcon,
  TagIcon,
  TagSimpleIcon,
  UserCircleIcon,
} from "phosphor-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user: clerkUser } = useUser();
  const { userId, getToken } = useAuth();
  const { i18n, t } = useTranslation();
  const { theme, setMode } = useTheme();
  const themeColors = useThemeColor();
  const router = useRouter();

  const [dbUser, setDbUser] = useState<any>(null);
  const [upgradePrompt, setUpgradePrompt] = useState<{
    description: string;
    recommendedPlan: "starter" | "business";
    title: string;
    visible: boolean;
  }>({
    description: "",
    recommendedPlan: "starter",
    title: "",
    visible: false,
  });

  const scrollAnim = useRef(new Animated.Value(0)).current;
  const headerOpacityAnim = useRef(new Animated.Value(1)).current;
  const isFetchingProfileRef = useRef(false);
  const PROFILE_CACHE_KEY = "profile:cached_user";

  useEffect(() => {
    const hydrateCachedProfile = async () => {
      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (!cached) return;
        const parsed = JSON.parse(cached);
        if (parsed?.id === userId) {
          setDbUser(parsed);
        }
      } catch (error) {
        console.warn("Profile cache hydrate warning:", error);
      }
    };

    if (userId) {
      hydrateCachedProfile();
    }
  }, [userId]);

  // Fetch/Refresh user data from Supabase whenever this tab is focused
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchSupabaseUser();
      }
    }, [userId]),
  );

  const fetchSupabaseUser = async () => {
    if (!userId || isFetchingProfileRef.current) return;
    try {
      isFetchingProfileRef.current = true;
      const token = await getAuthToken(getToken, "profile tab fetch", {
        timeoutMs: 45000,
        retries: 2,
      });
      const authSupabase = createClerkSupabaseClient(token);
      const { data, error } = await authSupabase
        .from("users")
        .select("*")
        .eq("id", userId as string)
        .single();
      if (error) throw error;
      setDbUser(data);
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Profile fetch warning:", error);
    } finally {
      isFetchingProfileRef.current = false;
    }
  };

  // Use DB data first, fallback to Clerk data
  const dbDisplayName = dbUser
    ? `${dbUser.first_name || ""} ${dbUser.last_name || ""}`.trim()
    : "";
  const clerkDisplayName = clerkUser?.fullName?.includes("@")
    ? ""
    : (clerkUser?.fullName ?? "").trim();
  const displayName = dbDisplayName || clerkDisplayName || "User";

  const avatarUrl = dbUser?.avatar_url || clerkUser?.imageUrl;

  const accountType = String(dbUser?.user_type || "regular").toLowerCase();
  const accountEntitlements = getEntitlements({
    fallbackUserType: accountType,
  });
  const accountTypeLabel =
    accountType === "starter"
      ? `${t("subscription_screen.starter")} Plan`
      : accountType === "pro"
        ? `${t("subscription_screen.pro")} Plan`
        : accountType === "business"
          ? `${t("subscription_screen.business")} Plan`
          : t("user_actions.regular_account");

  const toggleTheme = () => {
    setMode(theme === "light" ? "dark" : "light");
  };

  const toggleLanguage = async () => {
    const nextLanguage = i18n.language === "kh" ? "en" : "kh";
    await i18n.changeLanguage(nextLanguage);
    await AsyncStorage.setItem("user-language", nextLanguage);
  };

  const openAnalyticsScreen = (
    pathname: Href,
    options: {
      title: string;
      requiresBusiness?: boolean;
    },
  ) => {
    const hasAccess = options.requiresBusiness
      ? accountEntitlements.hasAdvancedAnalytics
      : accountEntitlements.hasBasicAnalytics;

    if (hasAccess) {
      router.push(pathname);
      return;
    }

    setUpgradePrompt({
      description: options.requiresBusiness
        ? `${options.title} is available on the Business plan.`
        : `${options.title} is available on Starter, Pro, and Business plans.`,
      recommendedPlan: options.requiresBusiness ? "business" : "starter",
      title: "Upgrade required",
      visible: true,
    });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollAnim } } }],
    { useNativeDriver: false },
  );

  useEffect(() => {
    const listener = scrollAnim.addListener(({ value }) => {
      const opacity = Math.max(0, 1 - value / 100);
      headerOpacityAnim.setValue(opacity);
    });

    return () => scrollAnim.removeListener(listener);
  }, [scrollAnim, headerOpacityAnim]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <UpgradePromptModal
        visible={upgradePrompt.visible}
        title={upgradePrompt.title}
        description={upgradePrompt.description}
        onClose={() =>
          setUpgradePrompt((current) => ({ ...current, visible: false }))
        }
        onConfirm={() => {
          const recommendedPlan = upgradePrompt.recommendedPlan;
          setUpgradePrompt((current) => ({ ...current, visible: false }));
          router.push(`/subscription?plan=${recommendedPlan}` as Href);
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Animated.View
          style={{
            opacity: headerOpacityAnim,
            transform: [
              {
                scale: scrollAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0.9],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          <View style={styles.topActions}>
            <TouchableOpacity
              onPress={() => router.push("/subscription" as Href)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#E73121", "#8B1D14"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.upgradeBtn}
              >
                <View style={styles.upgradeContent}>
                  <ThemedText style={styles.upgradeText}>
                    {t("user_actions.upgrade")}
                  </ThemedText>
                  <SparkleIcon
                    size={16}
                    weight="fill"
                    color="#FFD230"
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.rightIcons}>
              <TouchableOpacity
                style={styles.languageIcon}
                onPress={toggleLanguage}
              >
                <DynamicPhosphorIcon
                  name="GlobeSimple"
                  size={24}
                  color={themeColors.text}
                />
                <ThemedText style={styles.languageTitle}>
                  {t("navigation.toggle_language")}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleTheme}>
                {theme === "light" ? (
                  <MoonIcon size={24} color={themeColors.text} />
                ) : (
                  <SunIcon size={24} color={themeColors.text} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/settings" as Href)}
              >
                <GearSixIcon size={28} color={themeColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.userInfo}>
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: themeColors.card },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <UserCircleIcon
                  size={60}
                  color={themeColors.text}
                  weight="fill"
                />
              )}
            </View>
            <View style={styles.userTextContainer}>
              <View style={styles.userNameRow}>
                <ThemedText
                  style={styles.userName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {displayName}
                </ThemedText>
                {accountEntitlements.hasVerifiedBadge ? (
                  <View style={styles.verifiedBadge}>
                    <CheckCircleIcon
                      size={14}
                      color="#15803D"
                      weight="fill"
                    />
                    <ThemedText style={styles.verifiedBadgeText}>
                      Verified
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText style={styles.userType}>
                {accountTypeLabel}
              </ThemedText>
              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => userId && router.push(`/user/${userId}` as Href)}
              >
                <ThemedText style={styles.viewProfileText}>
                  {t("productDetail.viewProfile")}
                </ThemedText>
                <CaretRightIcon
                  size={14}
                  color={Colors.reds[500]}
                  weight="bold"
                />
              </TouchableOpacity>
            </View>
          </View>

          <ProfileSection title={t("user_actions.myLists")}>
            <GridItem
              icon={<TagIcon color={Colors.reds[500]} weight="fill" />}
              label={t("user_actions.active")}
              onPress={() =>
                router.push("/user/listings?status=active" as Href)
              }
            />
            <GridItem
              icon={<Pause color={Colors.reds[500]} weight="fill" />}
              label={t("user_actions.pause")}
              onPress={() => router.push("/user/listings?status=sold" as Href)}
            />
            <GridItem
              icon={
                <PencilSimpleLineIcon color={Colors.reds[500]} weight="fill" />
              }
              label={t("user_actions.drafts")}
              onPress={() => router.push("/user/listings?status=draft" as Href)}
            />
            <GridItem
              icon={
                <ClockCountdownIcon color={Colors.reds[500]} weight="fill" />
              }
              label={t("user_actions.expired")}
              onPress={() =>
                router.push("/user/listings?status=expired" as Href)
              }
            />
          </ProfileSection>

          <ProfileSection title={t("user_actions.dashboard")}>
            <GridItem
              icon={<ChartPieSliceIcon size={24} color={themeColors.text} />}
              label={t("user_actions.overview")}
              onPress={() =>
                openAnalyticsScreen("/user/dashboard/overview" as Href, {
                  title: "Overview analytics",
                })
              }
            />
            <GridItem
              icon={<ChartBarIcon size={24} color={themeColors.text} />}
              label={t("user_actions.insight")}
              onPress={() =>
                openAnalyticsScreen("/user/dashboard/insight" as Href, {
                  title: "Insights",
                  requiresBusiness: true,
                })
              }
            />
            <GridItem
              icon={<TagSimpleIcon size={24} color={themeColors.text} />}
              label={t("user_actions.myTrade")}
              onPress={() => router.push("/user/dashboard/my-trades" as Href)}
            />
            <GridItem
              icon={
                <PresentationChartIcon size={24} color={themeColors.text} />
              }
              label={t("user_actions.performance")}
              onPress={() =>
                openAnalyticsScreen("/user/dashboard/performance" as Href, {
                  title: "Performance analytics",
                })
              }
            />
          </ProfileSection>

          <View
            style={[styles.footerGrid, { backgroundColor: themeColors.card }]}
          >
            <GridItem
              icon={<StorefrontIcon size={24} color={themeColors.text} />}
              label={t("user_actions.following")}
              compact
              onPress={() =>
                userId &&
                router.push({
                  pathname: "/user/following",
                  params: { id: userId, type: "following" },
                } as any)
              }
            />
            <GridItem
              icon={
                <ClockCounterClockwiseIcon size={24} color={themeColors.text} />
              }
              label={t("user_actions.history")}
              compact
              onPress={() => router.push("/user/history" as Href)}
            />
            <GridItem
              icon={<BookmarkSimpleIcon size={24} color={themeColors.text} />}
              label={t("user_actions.bookMark")}
              compact
              onPress={() => router.push("/user/bookmarks" as Href)}
            />
            <GridItem
              icon={<CardholderIcon size={24} color={themeColors.text} />}
              label={t("subscription_screen.subscriptions")}
              compact
              onPress={() => router.push("/settings/subscription" as Href)}
            />
            <GridItem
              icon={<HeadsetIcon size={24} color={themeColors.text} />}
              label={t("user_actions.helpCenter")}
              compact
              onPress={() => router.push("/settings/help-feedback" as Href)}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const themeColors = useThemeColor();
  return (
    <View style={[styles.section, { backgroundColor: themeColors.card }]}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={styles.gridRow}>{children}</View>
    </View>
  );
}

function GridItem({
  icon,
  label,
  onPress,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.gridItem, compact && styles.compactGridItem]}
      onPress={onPress}
    >
      {icon}
      <ThemedText
        style={[styles.gridLabel, compact && styles.compactGridLabel]}
        numberOfLines={2}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  languageIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    paddingVertical: 4,
  },
  languageTitle: {
    marginLeft: 5,
    fontSize: 12,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  upgradeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  upgradeText: {
    color: "#FFF",
    fontWeight: "500",
    fontSize: 14,
  },
  rightIcons: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userTextContainer: {
    flex: 1,
    marginLeft: 15,
    minWidth: 0,
  },
  userNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  userName: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: "bold",
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
    fontSize: 10,
    fontWeight: "700",
  },
  userType: {
    fontSize: 14,
    opacity: 0.6,
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  viewProfileText: {
    fontSize: 14,
    color: Colors.reds[500],
    fontWeight: "600",
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    paddingVertical: 15,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  gridItem: {
    alignItems: "center",
    flex: 1,
  },
  compactGridItem: {
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  gridLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  compactGridLabel: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 6,
  },
  footerGrid: {
    marginHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
});
