import { ThemedText } from "@src/components/shared_components/ThemedText";
import { SellDraft } from "@src/context/SellDraftContext";
import { TradeDraft } from "@src/context/TradeDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import * as Location from "expo-location";
import { TFunction } from "i18next";
import { CrosshairIcon } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

const DEFAULT_REGION = {
  latitude: 11.5564,
  longitude: 104.9282,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

interface LocationPickerMapProps {
  onConfirmLocation: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  currentDraft: SellDraft | TradeDraft;
  onUpdateDraft: (key: string, value: any) => void;
  themeColors: ReturnType<typeof useThemeColor>;
  t: TFunction<"translation", undefined>;
}

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
}

export default function LocationPickerMap({
  onConfirmLocation,
  currentDraft,
  onUpdateDraft,
}: LocationPickerMapProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColor();
  const mapRef = useRef<MapView>(null);

  const [hasSelectedLocation, setHasSelectedLocation] = useState(
    !!(
      currentDraft.location.latitude &&
      currentDraft.location.latitude !== DEFAULT_REGION.latitude
    ),
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRetracking, setIsRetracking] = useState(false);
  const [markerCoord, setMarkerCoord] = useState(currentDraft.location);

  // Initial location fetch on mount only
  useEffect(() => {
    if (!hasSelectedLocation) {
      fetchCurrentLocation();
    }
  }, []);

  const fetchCurrentLocation = async () => {
    setIsRetracking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      onUpdateDraft("location", newLocation);
      setMarkerCoord(newLocation);
      mapRef.current?.animateToRegion(
        { ...newLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        1000,
      );
      setHasSelectedLocation(true);
      setIsConfirmed(false);
    } catch (error) {
      console.error("Error getting current location:", error);
    } finally {
      setIsRetracking(false);
    }
  };

  const styles = getStyles(themeColors);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${markerCoord.latitude},${markerCoord.longitude}`;

  const CustomButton = ({
    title,
    onPress,
    disabled,
    style,
    textStyle,
  }: CustomButtonProps) => (
    <TouchableOpacity
      style={[styles.customButton, style, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <ThemedText style={[styles.customButtonText, textStyle]}>
        {String(title)}
      </ThemedText>
    </TouchableOpacity>
  );

  const handleTap = (coordinate: { latitude: number; longitude: number }) => {
    if (isConfirmed) return;
    setMarkerCoord(coordinate);
    onUpdateDraft("location", coordinate);
    mapRef.current?.animateToRegion(
      { ...coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500,
    );
    setHasSelectedLocation(true);
    setIsConfirmed(false);
  };

  const handleDragEnd = (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    setMarkerCoord(coordinate);
    onUpdateDraft("location", coordinate);
    setHasSelectedLocation(true);
    setIsConfirmed(false);
  };

  return (
    <>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={
            currentDraft.location.latitude
              ? {
                  ...currentDraft.location,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : DEFAULT_REGION
          }
          onPress={(e) => handleTap(e.nativeEvent.coordinate)}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {hasSelectedLocation && (
            <Marker
              coordinate={markerCoord}
              draggable={!isConfirmed}
              onDragEnd={(e) => handleDragEnd(e.nativeEvent.coordinate)}
            />
          )}
        </MapView>

        {isConfirmed && <View style={styles.mapOverlay} />}

        {/* Re-track location button */}
        {!isConfirmed && (
          <TouchableOpacity
            style={[
              styles.reTrackButton,
              { backgroundColor: themeColors.background },
            ]}
            onPress={fetchCurrentLocation}
            disabled={isRetracking}
          >
            {isRetracking ? (
              <ActivityIndicator size="small" color={themeColors.tint} />
            ) : (
              <CrosshairIcon size={22} color={themeColors.tint} weight="bold" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {!isConfirmed ? (
          <CustomButton
            title={t("sellSection.Confirm_Location")}
            onPress={() => {
              onConfirmLocation(markerCoord);
              setIsConfirmed(true);
            }}
            disabled={!hasSelectedLocation}
          />
        ) : (
          <View style={styles.confirmedContainer}>
            <TouchableOpacity onPress={() => Linking.openURL(mapUrl)}>
              <ThemedText style={styles.linkText}>
                {t("sellSection.Open_on_Google_Maps")}
              </ThemedText>
            </TouchableOpacity>
            <CustomButton
              title={t("sellSection.Change_Location")}
              onPress={() => setIsConfirmed(false)}
              style={styles.changeButton}
              textStyle={styles.changeButtonText}
            />
          </View>
        )}
      </View>
    </>
  );
}

const getStyles = (themeColors: ReturnType<typeof useThemeColor>) =>
  StyleSheet.create({
    locationTitle: { marginTop: 20, fontSize: 16, marginBottom: 10 },
    mapContainer: {
      height: 200,
      borderRadius: 16,
      borderCurve: "continuous",
      marginBottom: 8,
      overflow: "hidden",
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    mapOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.3)",
    },
    reTrackButton: {
      position: "absolute",
      bottom: 12,
      right: 12,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    buttonContainer: {
      marginBottom: 8,
    },
    customButton: {
      backgroundColor: themeColors.tint,
      padding: 12,
      borderRadius: 99,
      alignItems: "center",
    },
    disabledButton: {
      backgroundColor: themeColors.border,
    },
    customButtonText: {
      color: themeColors.primaryButtonText,
      fontSize: 16,
      fontWeight: "500",
    },
    confirmedContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: themeColors.background,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    linkText: {
      color: themeColors.tint,
      textDecorationLine: "underline",
      fontSize: 14,
    },
    changeButton: {
      backgroundColor: themeColors.primary,
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 8,
    },
    changeButtonText: {
      fontSize: 14,
      color: themeColors.primaryButtonText,
      fontWeight: "bold",
    },
  });
