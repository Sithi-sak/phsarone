import DynamicPhosphorIcon from "@src/components/shared_components/DynamicPhosphorIcon";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { CATEGORY_MAP } from "@src/constants/CategoryData";
import { useSellDraft } from "@src/context/SellDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon, CaretRightIcon } from "phosphor-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SubcategoryScreen() {
  const { draft, updateDraft } = useSellDraft();
  const { t } = useTranslation();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { categoryId: paramCategoryId } = useLocalSearchParams();

  useEffect(() => {
    if (paramCategoryId && draft.categoryId !== paramCategoryId) {
      updateDraft("categoryId", paramCategoryId as string);
    }
  }, [paramCategoryId]);

  const currentCategoryId = (paramCategoryId || draft.categoryId) as string;
  const categoryData = CATEGORY_MAP[currentCategoryId];

  const subCategoryData = Object.entries(categoryData?.sub || {}).map(
    ([name, icon]) => ({
      name,
      icon,
    }),
  );

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View
        style={[styles.header, { backgroundColor: themeColors.background }]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        {/* Category Info */}
        <View
          style={[
            styles.categoryInfo,
            { backgroundColor: themeColors.background },
          ]}
        >
          <View
            style={[
              styles.categoryIconContainer,
              { backgroundColor: themeColors.background },
            ]}
          >
            <DynamicPhosphorIcon
              name={categoryData?.icon || "Shapes"}
              size={32}
              color={themeColors.text}
              weight="fill"
            />
          </View>
          <View>
            <ThemedText style={styles.categoryTitle}>
              {t(`categories.${categoryData?.nameKey}`)}
            </ThemedText>
            <ThemedText style={styles.categorySubtitle}>
              {t("sellSection.Choose_Subcategory") || "Pick your subcategory"}
            </ThemedText>
          </View>
        </View>

        <FlatList
          data={subCategoryData}
          keyExtractor={(item) => item.name}
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.listItem,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.text + "10",
                },
              ]}
              onPress={() => {
                // Clear details when switching subcategory
                updateDraft("details", {});
                updateDraft("subCategory", item.name);
                router.push("/sell/details");
              }}
            >
              <View style={styles.listItemLeft}>
                <View style={styles.subIconContainer}>
                  <DynamicPhosphorIcon
                    name={item.icon}
                    size={24}
                    color={themeColors.text}
                  />
                </View>
                <ThemedText style={styles.listItemText}>
                  {t(`subcategories.${item.name}`)}
                </ThemedText>
              </View>
              <CaretRightIcon size={20} color={themeColors.text} />
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 8,
  },
  categoryInfo: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#f5f5f5", // Light placeholder bg like Figma
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: "600",
  },
  categorySubtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  listContent: {
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    borderCurve: "continuous",
    borderWidth: 1,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
