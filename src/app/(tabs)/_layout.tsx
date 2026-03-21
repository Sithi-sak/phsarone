import { Colors } from "@src/constants/Colors";
import { useProfileOnboardingStatus } from "@src/hooks/useProfileOnboardingStatus";
import useThemeColor from "@src/hooks/useThemeColor";
import { Redirect, Tabs } from "expo-router";
import {
  ArrowsClockwiseIcon,
  ChatCircleIcon,
  HouseIcon,
  PlusCircleIcon,
  UserIcon,
} from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function AnimatedTabIcon({
  focused,
  color,
  children,
}: {
  focused: boolean;
  color: string;
  children: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.65)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: focused ? 1.15 : 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.65,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(colorAnim, {
        toValue: focused ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused, scaleAnim, opacityAnim, colorAnim]);

  const animatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.gray[500], Colors.reds[500]],
  });

  const renderChild = () => {
    if (
      typeof children === "object" &&
      children !== null &&
      "props" in children
    ) {
      if (children.type === Image) {
        const child = children as React.ReactElement<{
          source: any;
          style: any;
        }>;
        return (
          <Animated.Image
            source={require("@src/assets/icons/Main-logo-24.png")}
            style={{ width: 26, height: 26 }}
          />
        );
      } else {
        return (
          <Animated.View style={{ opacity: opacityAnim }}>
            {(children as any).type({
              color: animatedColor,
              ...(children.props as object),
            })}
          </Animated.View>
        );
      }
    }
    return children;
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      {renderChild()}
    </Animated.View>
  );
}

function AnimatedTabLabel({
  focused,
  color,
  label,
  activeFont,
}: {
  focused: boolean;
  color: string;
  label: string;
  activeFont: string | null;
}) {
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(colorAnim, {
      toValue: focused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [focused, colorAnim]);

  const animatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.gray[500], Colors.reds[500]],
  });

  return (
    <Animated.Text
      style={{
        fontSize: 11,
        fontFamily: activeFont ?? undefined,
        color: animatedColor,
        fontWeight: focused ? "600" : "400",
      }}
    >
      {label}
    </Animated.Text>
  );
}

export default function TabLayout() {
  const { checked, needsOnboarding } = useProfileOnboardingStatus();
  const themeColors = useThemeColor();
  const { i18n, t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const activeFont =
    i18n.language === "kh" ? "KantumruyPro-Regular" : "Geist";
  const iconSize = { home: 26, trade: 26, sell: 26, chat: 26, profile: 26 };

  if (checked && needsOnboarding) {
    return <Redirect href="/onboarding/profile" />;
  }

  if (!checked) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.reds[500],
        tabBarInactiveTintColor: Colors.gray[500],
        tabBarIconStyle: {
          marginTop: 8,
          marginBottom: 2,
        },
        tabBarStyle: {
          position: "absolute",
          elevation: 2,
          marginHorizontal: 16,
          backgroundColor: themeColors.navbg,
          borderRadius: 100,
          borderCurve: "continuous",
          height: 70,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          borderTopWidth: 0,
          bottom: 16,
          paddingVertical: 12,
          paddingHorizontal: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navigation.home"),
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon focused={focused} color={color}>
              {focused ? (
                <Image
                  source={require("@src/assets/icons/Main-logo-24.png")}
                  style={{ width: 26, height: 26 }}
                />
              ) : (
                <HouseIcon size={iconSize.home} color={color} weight="regular" />
              )}
            </AnimatedTabIcon>
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel
              focused={focused}
              color={color}
              label={t("navigation.home")}
              activeFont={activeFont}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: t("navigation.trade"),
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon focused={focused} color={color}>
              <ArrowsClockwiseIcon
                size={iconSize.trade}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel
              focused={focused}
              color={color}
              label={t("navigation.trade")}
              activeFont={activeFont}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t("navigation.sell"),
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon focused={focused} color={color}>
              <PlusCircleIcon
                size={iconSize.sell}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel
              focused={focused}
              color={color}
              label={t("navigation.sell")}
              activeFont={activeFont}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("navigation.chat"),
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon focused={focused} color={color}>
              <ChatCircleIcon
                size={iconSize.chat}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel
              focused={focused}
              color={color}
              label={t("navigation.chat")}
              activeFont={activeFont}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("navigation.profile"),
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon focused={focused} color={color}>
              <UserIcon
                size={iconSize.profile}
                color={color}
                weight={focused ? "fill" : "regular"}
              />
            </AnimatedTabIcon>
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel
              focused={focused}
              color={color}
              label={t("navigation.profile")}
              activeFont={activeFont}
            />
          ),
        }}
      />
    </Tabs>
  );
}
