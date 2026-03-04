import { ThemedText } from "@src/components/shared_components/ThemedText";
import { getOptimizedStorageImageUrl } from "@src/utils/storageImage";
import {
  CaretDownIcon,
  CaretUpIcon,
  ShoppingBagIcon,
} from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, TouchableOpacity, View } from "react-native";

export default function ProductCard({
  title,
  thumbnail,
  price,
  currency,
  themeColors,
  onPress,
}: any) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  if (!title) return null;
  const hasPrice = price && price !== "0" && price !== "";
  const optimizedThumbnail = thumbnail
    ? getOptimizedStorageImageUrl(thumbnail, "thumb")
    : "";

  if (collapsed) {
    return (
      <TouchableOpacity
        onPress={() => setCollapsed(false)}
        activeOpacity={0.8}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 16,
            marginVertical: 8,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 20,
            borderWidth: 1,
            gap: 7,
          },
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border + "40",
          },
        ]}
      >
        {thumbnail ? (
          <Image
            source={{ uri: optimizedThumbnail }}
            style={{ width: 24, height: 24, borderRadius: 6 }}
          />
        ) : (
          <ShoppingBagIcon
            size={14}
            color={themeColors.primary}
            weight="fill"
          />
        )}
        <ThemedText
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: "600",
            color: themeColors.text,
          }}
          numberOfLines={1}
        >
          {title}
        </ThemedText>
        {hasPrice && (
          <ThemedText
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: themeColors.primary,
            }}
          >
            {currency || "$"} {price}
          </ThemedText>
        )}
        <CaretDownIcon size={14} color={themeColors.primary} weight="bold" />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        { borderBottomWidth: 1 },
        {
          backgroundColor: themeColors.card,
          borderBottomColor: themeColors.border + "25",
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          width: "100%",
          height: 160,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {thumbnail ? (
          <Image
            source={{ uri: optimizedThumbnail }}
            style={{ width: "100%", height: 160 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: 160,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: themeColors.primary + "15",
            }}
          >
            <ShoppingBagIcon
              size={44}
              color={themeColors.primary}
              weight="fill"
            />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "rgba(0,0,0,0.45)",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <ShoppingBagIcon size={11} color="#fff" weight="fill" />
          <ThemedText
            style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}
          >
            {t("chat.listing")}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setCollapsed(true)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 6,
            borderRadius: 20,
          }}
        >
          <CaretUpIcon size={16} color="#fff" weight="bold" />
        </TouchableOpacity>
      </TouchableOpacity>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <ThemedText
            style={{
              fontSize: 15,
              fontWeight: "700",
              lineHeight: 20,
              marginBottom: 6,
              color: themeColors.text,
            }}
            numberOfLines={2}
          >
            {title}
          </ThemedText>
          {hasPrice && (
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: themeColors.primary + "18",
              }}
            >
              <ThemedText
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: themeColors.primary,
                }}
              >
                {currency || "USD"} {Number(price).toLocaleString()}
              </ThemedText>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={onPress}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 20,
            backgroundColor: themeColors.primary,
          }}
          activeOpacity={0.85}
        >
          <ThemedText
            style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}
          >
            {t("chat.view_listing")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
