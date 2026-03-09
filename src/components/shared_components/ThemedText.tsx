import useThemeColor from "@src/hooks/useThemeColor";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TextProps, TextStyle } from "react-native";

const KHMER_REGEX = /[\u1780-\u17FF\u19E0-\u19FF]/;
// More aggressive regex to remove ALL zero-width and control characters that might cause tofu
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF\u202A-\u202E\u00AD\u00A0]/g;

function cleanAndDetect(
  children: React.ReactNode,
): { cleaned: React.ReactNode; hasKhmer: boolean } {
  let hasKhmer = false;

  const process = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      if (KHMER_REGEX.test(node)) hasKhmer = true;
      return node.replace(INVISIBLE_CHARS_REGEX, "");
    }
    if (typeof node === "number") {
      return node.toString();
    }
    if (Array.isArray(node)) {
      return node.map((child, index) => {
        const result = process(child);
        return React.isValidElement(result)
          ? React.cloneElement(result, { key: index })
          : result;
      });
    }
    if (React.isValidElement(node)) {
      // We don't recurse into elements to avoid unexpected behavior,
      // but we do check their children if they are standard Text-like.
      return node;
    }
    return node;
  };

  return { cleaned: process(children), hasKhmer };
}

export function ThemedText({ style, children, ...props }: TextProps) {
  const themeColors = useThemeColor();
  const { i18n } = useTranslation();

  const isKhmerUI = i18n.language === "kh";
  const { cleaned: cleanedChildren, hasKhmer: hasKhmerContent } =
    cleanAndDetect(children);
  const useKhmer = isKhmerUI || hasKhmerContent;

  const flattenedStyle = (StyleSheet.flatten(style) || {}) as TextStyle;
  const incomingWeight = flattenedStyle.fontWeight ?? "400";
  const normalizedWeight =
    typeof incomingWeight === "number"
      ? (`${incomingWeight}` as TextStyle["fontWeight"])
      : incomingWeight;

  let fontFamily = "Geist";
  let resolvedFontWeight: TextStyle["fontWeight"] = normalizedWeight;

  if (useKhmer) {
    if (
      normalizedWeight === "bold" ||
      normalizedWeight === "700" ||
      normalizedWeight === "800" ||
      normalizedWeight === "900"
    ) {
      fontFamily = "KantumruyPro-Bold";
    } else if (normalizedWeight === "600" || normalizedWeight === "500") {
      fontFamily = "KantumruyPro-Semibold";
    } else {
      fontFamily = "KantumruyPro-Regular";
    }

    // Khmer uses explicit static font files, so keep weight normal.
    resolvedFontWeight = "normal";
  }

  return (
    <Text
      style={[
        { color: themeColors.text },
        flattenedStyle,
        { fontFamily, fontWeight: resolvedFontWeight },
      ]}
      {...props}
    >
      {cleanedChildren}
    </Text>
  );
}
