import useThemeColor from "@src/hooks/useThemeColor";
import { getOptimizedStorageImageUrl } from "@src/utils/storageImage";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface ProductImageGalleryProps {
  photos: string[];
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  photos,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const themeColors = useThemeColor();

  const renderThumbnail = ({
    item,
    index,
  }: {
    item: string;
    index: number;
  }) => (
    <TouchableOpacity
      onPress={() => setSelectedImageIndex(index)}
      style={[
        styles.thumbnail,
        selectedImageIndex === index && {
          borderColor: themeColors.tint,
          borderWidth: 1,
        },
      ]}
    >
      <Image
        source={{ uri: getOptimizedStorageImageUrl(item, "thumb") }}
        style={styles.thumbnailImage}
      />
    </TouchableOpacity>
  );

  const selectedPhoto = photos[selectedImageIndex] || "";

  return (
    <View
      style={[
        styles.imageContainer,
        { backgroundColor: themeColors.background },
      ]}
    >
      <Image
        source={{ uri: getOptimizedStorageImageUrl(selectedPhoto, "detail") }}
        style={styles.mainImage}
        resizeMode="cover"
      />

      {/* Thumbnail Gallery */}
      <View style={styles.thumbnailContainer}>
        <FlatList
          data={photos}
          renderItem={renderThumbnail}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailList}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    width: "100%",
  },
  mainImage: {
    width: "100%",
    height: Dimensions.get("window").width * 0.75,
  },
  thumbnailContainer: {
    marginHorizontal: 6,
    marginVertical: 6,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  thumbnailList: {
    gap: 0,
  },
  thumbnail: {
    width: 80,
    height: 80,
    overflow: "hidden",
    borderWidth: 0,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
});

export default ProductImageGallery;
