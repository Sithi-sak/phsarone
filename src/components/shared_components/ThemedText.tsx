import useThemeColor from "@src/hooks/useThemeColor";
import { useTranslation } from "react-i18next";
import { Text, TextProps, StyleSheet } from "react-native";
import React from "react";

const KHMER_REGEX = /[\u1780-\u17FF\u19E0-\u19FF]/;
// More aggressive regex to remove ALL zero-width and control characters that might cause tofu
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF\u202A-\u202E\u00AD\u00A0]/g;

function cleanAndDetect(children: React.ReactNode): { cleaned: React.ReactNode, hasKhmer: boolean } {
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
        return React.isValidElement(result) ? React.cloneElement(result, { key: index }) : result;
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
  const { cleaned: cleanedChildren, hasKhmer: hasKhmerContent } = cleanAndDetect(children);
  const useKhmer = isKhmerUI || hasKhmerContent;

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fontWeight = flattenedStyle.fontWeight || "400";

  // Use system font for Khmer (better OS integration), MiSans Latin for others
  let fontFamily = useKhmer ? undefined : "MiSansLatin-Normal";

  if (!useKhmer) {
    if (fontWeight === "bold" || fontWeight === "700" || fontWeight === "800" || fontWeight === "900") {
      fontFamily = "MiSansLatin-Bold";
    } else if (fontWeight === "600") {
      fontFamily = "MiSansLatin-Semibold";
    } else if (fontWeight === "500") {
      fontFamily = "MiSansLatin-Medium";
    }
  }

  // If using MiSans (Latin), we must handle fontWeight manually and set normal to the underlying Text
  // If using system font (Khmer), we let the system handle the fontWeight natively
  const { fontWeight: _fw, ...restStyle } = flattenedStyle;
  const finalFontWeight = useKhmer ? fontWeight : "normal";

  return (
    <Text
      style={[
        { color: themeColors.text },
        useKhmer ? flattenedStyle : restStyle,
        { fontFamily, fontWeight: finalFontWeight },
      ]}
      {...props}
    >
      {cleanedChildren}
    </Text>
  );
}
