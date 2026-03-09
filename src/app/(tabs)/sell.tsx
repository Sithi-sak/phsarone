import DynamicPhosphorIcon from "@src/components/shared_components/DynamicPhosphorIcon";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { CATEGORY_MAP } from "@src/constants/CategoryData";
import { useSellDraft } from "@src/context/SellDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const GAP = 8;
const CARD_WIDTH = (width - 32 - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

export default function SellScreen() {
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const router = useRouter();
  const { updateDraft } = useSellDraft();

  const handleCategoryPress = (id: string) => {
    const category = CATEGORY_MAP[id];
    // Clear details when selecting/changing category
    updateDraft("details", {});
    updateDraft("categoryId", id);
    updateDraft("mainCategory", category?.nameKey || "");
    router.push({ pathname: "/sell/subcategory", params: { categoryId: id } });
  };

  const categories = Object.keys(CATEGORY_MAP).map((id) => ({
    id,
    ...CATEGORY_MAP[id],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header Section */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("sellSection.What_are_you_selling?")}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {t("sellSection.category_subtitle")}
        </ThemedText>
      </View>

      <FlatList
        data={categories}
        numColumns={COLUMN_COUNT}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.text + "10",
              },
            ]}
            onPress={() => handleCategoryPress(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <DynamicPhosphorIcon
                name={item.icon}
                size={32}
                color={themeColors.text}
              />
            </View>
            <ThemedText style={styles.cardText} numberOfLines={2}>
              {t(`categories.${item.nameKey}`)}
            </ThemedText>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 10,
    borderCurve: "continuous",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16,
  },
});
