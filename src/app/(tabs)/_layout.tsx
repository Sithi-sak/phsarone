import { Colors } from "@src/constants/Colors";
import useThemeColor from "@src/hooks/useThemeColor";
import { Tabs } from "expo-router";
import {
    ArrowsClockwiseIcon,
    ChatCircleIcon,
    HouseIcon,
    PlusCircleIcon,
    UserIcon,
} from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Image, Text } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const themeColors = useThemeColor();
  const { i18n, t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const activeFont = i18n.language === "kh" ? "khmer-regular" : null;
  const iconSize = {
    home: 26,
    trade: 26,
    sell: 26,
    chat: 26,
    profile: 26,
  };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.reds[500],
        tabBarIconStyle: {
          marginTop: 6,
          marginBottom: 0,
        },
        tabBarStyle: {
          position: "absolute",
          elevation: 1,
          marginHorizontal: 20,
          backgroundColor: themeColors.navbg,
          borderRadius: 90,
          borderCurve: "continuous",
          height: 66,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          borderTopWidth: 0,
          bottom: 20,
          paddingVertical: 16,
          paddingHorizontal: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navigation.home"),
          tabBarIcon: ({ focused, color }) =>
            focused ? (
              <Image
                source={require("@src/assets/icons/Main-logo-24.png")}
                style={{ width: 32, height: 32, marginTop: 10 }}
              />
            ) : (
              <HouseIcon size={iconSize.home} color={color} />
            ),
          tabBarLabel: ({ focused, color: labelColor }) =>
            focused ? null : (
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: activeFont ?? undefined,
                  color: labelColor,
                }}
              >
                {t("navigation.home")}
              </Text>
            ),
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: t("navigation.trade"),
          tabBarIcon: ({ focused, color }) =>
            focused ? (
              <ArrowsClockwiseIcon
                size={iconSize.trade}
                color={color}
                weight="fill"
              />
            ) : (
              <ArrowsClockwiseIcon size={iconSize.trade} color={color} />
            ),
          tabBarLabel: ({ color: labelColor }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: activeFont ?? undefined,
                color: labelColor,
              }}
            >
              {t("navigation.trade")}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t("navigation.sell"),
          tabBarIcon: ({ focused, color, size }) =>
            focused ? (
              <PlusCircleIcon
                size={iconSize.sell}
                color={color}
                weight="fill"
              />
            ) : (
              <PlusCircleIcon size={iconSize.sell} color={color} />
            ),
          tabBarLabel: ({ color: labelColor }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: activeFont ?? undefined,
                color: labelColor,
              }}
            >
              {t("navigation.sell")}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("navigation.chat"),
          tabBarIcon: ({ focused, color, size }) =>
            focused ? (
              <ChatCircleIcon
                size={iconSize.chat}
                color={color}
                weight="fill"
              />
            ) : (
              <ChatCircleIcon size={iconSize.chat} color={color} />
            ),
          tabBarLabel: ({ color: labelColor }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: activeFont ?? undefined,
                color: labelColor,
              }}
            >
              {t("navigation.chat")}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("navigation.profile"),
          tabBarIcon: ({ focused, color, size }) =>
            focused ? (
              <UserIcon
                size={iconSize.profile}
                color={color}
                weight="fill"
              />
            ) : (
              <UserIcon size={iconSize.profile} color={color} />
            ),
          tabBarLabel: ({ color: labelColor }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: activeFont ?? undefined,
                color: labelColor,
              }}
            >
              {t("navigation.profile")}
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}

