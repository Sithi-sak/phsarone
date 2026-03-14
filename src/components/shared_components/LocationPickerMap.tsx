import { ThemedText } from "@src/components/shared_components/ThemedText";
import { SellDraft } from "@src/context/SellDraftContext";
import { TradeDraft } from "@src/context/TradeDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import * as Location from "expo-location";
import { TFunction } from "i18next";
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CrosshairIcon,
  MapPinIcon,
  NavigationArrowIcon,
} from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
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
  icon?: React.ReactNode;
}

export default function LocationPickerMap({
  onConfirmLocation,
  currentDraft,
  onUpdateDraft,
}: LocationPickerMapProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColor();
  const mapRef = useRef<MapView>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [hasSelectedLocation, setHasSelectedLocation] = useState(
    !!(
      currentDraft.location.latitude &&
      currentDraft.location.latitude !== DEFAULT_REGION.latitude
    ),
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRetracking, setIsRetracking] = useState(false);
  const [markerCoord, setMarkerCoord] = useState(currentDraft.location);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedAccuracy, setSelectedAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!hasSelectedLocation) {
      fetchCurrentLocation();
    }
  }, []);

  // Pulse animation for retracking
  useEffect(() => {
    if (isRetracking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRetracking]);

  // Fade in detail card
  useEffect(() => {
    if (hasSelectedLocation) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [hasSelectedLocation]);

  const tx = (key: string, fallback: string) => {
    const value = t(key as any);
    return !value || value === key ? fallback : String(value);
  };

  const formatAddress = (geo: Location.LocationGeocodedAddress | undefined) => {
    if (!geo) return "";
    return [geo.street, geo.city || geo.subregion || geo.region, geo.country]
      .filter(Boolean)
      .join(", ");
  };

  const refreshLocationDetails = async (
    latitude: number,
    longitude: number,
    accuracy?: number,
  ) => {
    if (typeof accuracy === "number") {
      setSelectedAccuracy(accuracy);
    }
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      setSelectedAddress(formatAddress(geo));
    } catch {
      setSelectedAddress("");
    }
  };

  const getBestTrackedLocation = async (): Promise<Location.LocationObject> => {
    const seed = await Location.getCurrentPositionAsync({
      accuracy:
        Platform.OS === "android"
          ? Location.Accuracy.Highest
          : Location.Accuracy.High,
    });

    return await new Promise((resolve) => {
      let best = seed;
      let settled = false;
      let sub: Location.LocationSubscription | null = null;

      const finish = (loc: Location.LocationObject) => {
        if (settled) return;
        settled = true;
        sub?.remove();
        resolve(loc);
      };

      const timer = setTimeout(() => finish(best), 6000);

      Location.watchPositionAsync(
        {
          accuracy:
            Platform.OS === "android"
              ? Location.Accuracy.Highest
              : Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (update) => {
          const bestAcc = best.coords.accuracy ?? Number.POSITIVE_INFINITY;
          const nextAcc = update.coords.accuracy ?? Number.POSITIVE_INFINITY;
          if (nextAcc < bestAcc) best = update;
          if (nextAcc <= 25) {
            clearTimeout(timer);
            finish(best);
          }
        },
      )
        .then((watcher) => {
          sub = watcher;
        })
        .catch(() => {
          clearTimeout(timer);
          finish(best);
        });
    });
  };

  const fetchCurrentLocation = async () => {
    setIsRetracking(true);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          tx("error", "Error"),
          tx(
            "chat.location_services_off",
            "Location services are off. Please enable GPS and try again.",
          ),
        );
        return;
      }

      const existingPermission = await Location.getForegroundPermissionsAsync();
      const { status } = existingPermission.granted
        ? existingPermission
        : await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          tx("error", "Error"),
          tx(
            "chat.permission_location",
            "Permission to access location was denied.",
          ),
        );
        return;
      }

      if (Platform.OS === "android") {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // User may dismiss the high-accuracy prompt.
        }
      }

      const currentLocation = await getBestTrackedLocation();
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
      setPreviewFailed(false);
      await refreshLocationDetails(
        newLocation.latitude,
        newLocation.longitude,
        currentLocation.coords.accuracy ?? undefined,
      );
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        tx("error", "Error"),
        tx("chat.get_location_failed", "Failed to get location."),
      );
    } finally {
      setIsRetracking(false);
    }
  };

  const styles = getStyles(themeColors);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${markerCoord.latitude},${markerCoord.longitude}`;
  const previewCoord = hasSelectedLocation ? markerCoord : DEFAULT_REGION;
  const hasAndroidMapsKey =
    Platform.OS !== "android" ||
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
  const staticMapUrl =
    `https://staticmap.openstreetmap.de/staticmap.php?center=` +
    `${previewCoord.latitude},${previewCoord.longitude}` +
    `&zoom=15&size=800x320&markers=${previewCoord.latitude},${previewCoord.longitude},red-pushpin`;

  const CustomButton = ({
    title,
    onPress,
    disabled,
    style,
    textStyle,
    icon,
  }: CustomButtonProps) => (
    <TouchableOpacity
      style={[styles.customButton, style, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && <View style={styles.buttonIcon}>{icon}</View>}
      <ThemedText style={[styles.customButtonText, textStyle]}>
        {String(title)}
      </ThemedText>
    </TouchableOpacity>
  );

  const handleTap = (coordinate: { latitude: number; longitude: number }) => {
    if (isConfirmed) return;
    setMarkerCoord(coordinate);
    setSelectedAccuracy(null);
    onUpdateDraft("location", coordinate);
    mapRef.current?.animateToRegion(
      { ...coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500,
    );
    setHasSelectedLocation(true);
    setIsConfirmed(false);
    refreshLocationDetails(coordinate.latitude, coordinate.longitude);
  };

  const handleDragEnd = (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    setMarkerCoord(coordinate);
    setSelectedAccuracy(null);
    onUpdateDraft("location", coordinate);
    setHasSelectedLocation(true);
    setIsConfirmed(false);
    refreshLocationDetails(coordinate.latitude, coordinate.longitude);
  };

  const accuracyColor =
    selectedAccuracy === null
      ? themeColors.text + "60"
      : selectedAccuracy <= 10
        ? "#22c55e"
        : selectedAccuracy <= 30
          ? "#f59e0b"
          : "#ef4444";

  return (
    <>
      {/* ── Map area ── */}
      <View
        style={[
          styles.mapContainer,
          !hasAndroidMapsKey && styles.mapContainerFallback,
        ]}
      >
        {hasAndroidMapsKey ? (
          <>
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

            {!isConfirmed && (
              <TouchableOpacity
                style={[
                  styles.retrackBtn,
                  isRetracking && styles.retrackBtnDisabled,
                  { backgroundColor: themeColors.background + "F5" },
                ]}
                onPress={fetchCurrentLocation}
                disabled={isRetracking}
                activeOpacity={0.85}
              >
                <Animated.View style={{ opacity: pulseAnim }}>
                  {isRetracking ? (
                    <ActivityIndicator size="small" color={themeColors.tint} />
                  ) : (
                    <NavigationArrowIcon
                      size={16}
                      color={themeColors.tint}
                      weight="fill"
                    />
                  )}
                </Animated.View>
                <ThemedText
                  style={[styles.retrackBtnText, { color: themeColors.tint }]}
                >
                  {tx("sellSection.Retrack_Current_Location", "My location")}
                </ThemedText>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* ── Android fallback: static map preview ── */
          <View
            style={[styles.mapFallback, { backgroundColor: themeColors.card }]}
          >
            {/* Header row */}
            <View style={styles.fallbackHeader}>
              <View style={styles.fallbackHeaderLeft}>
                <MapPinIcon size={14} color={themeColors.tint} weight="fill" />
                <ThemedText
                  style={[styles.fallbackTitle, { color: themeColors.text }]}
                >
                  {tx("sellSection.location_preview_title", "Location Preview")}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[
                  styles.openMapBtn,
                  { borderColor: themeColors.tint + "40" },
                ]}
                onPress={() => Linking.openURL(mapUrl)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[styles.openMapBtnText, { color: themeColors.tint }]}
                >
                  {tx("sellSection.open_map", "Open in Maps")}
                </ThemedText>
                <ArrowSquareOutIcon
                  size={12}
                  color={themeColors.tint}
                  weight="bold"
                />
              </TouchableOpacity>
            </View>

            {/* Map preview image */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => Linking.openURL(mapUrl)}
              style={[
                styles.previewWrapper,
                { borderColor: themeColors.border },
              ]}
            >
              {!previewFailed ? (
                <>
                  <Image
                    source={{ uri: staticMapUrl }}
                    style={styles.previewImage}
                    resizeMode="cover"
                    onError={() => setPreviewFailed(true)}
                  />
                  {/* Coordinate badge bottom-left */}
                  <View style={styles.coordBadge}>
                    <ThemedText style={styles.coordBadgeText}>
                      {previewCoord.latitude.toFixed(5)},{" "}
                      {previewCoord.longitude.toFixed(5)}
                    </ThemedText>
                  </View>
                  {/* Tap hint top-right */}
                  <View
                    style={[
                      styles.tapHint,
                      { backgroundColor: themeColors.tint + "22" },
                    ]}
                  >
                    <ArrowSquareOutIcon
                      size={11}
                      color={themeColors.tint}
                      weight="bold"
                    />
                    <ThemedText
                      style={[styles.tapHintText, { color: themeColors.tint }]}
                    >
                      Open
                    </ThemedText>
                  </View>
                </>
              ) : (
                <View
                  style={[
                    styles.previewEmpty,
                    {
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <MapPinIcon
                    size={32}
                    color={themeColors.tint}
                    weight="fill"
                  />
                  <ThemedText
                    style={[
                      styles.previewEmptyTitle,
                      { color: themeColors.text },
                    ]}
                  >
                    {tx("sellSection.tap_to_open_map", "Tap to open map")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.previewEmptyCoord,
                      { color: themeColors.text + "80" },
                    ]}
                  >
                    {previewCoord.latitude.toFixed(6)},{" "}
                    {previewCoord.longitude.toFixed(6)}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>

            {/* GPS accuracy note */}
            <ThemedText
              style={[styles.gpsNote, { color: themeColors.text + "60" }]}
            >
              {tx(
                "sellSection.gps_preview_hint",
                "GPS coordinates are accurate even if map preview is unavailable.",
              )}
            </ThemedText>

            {/* Retrack button */}
            <TouchableOpacity
              style={[
                styles.retrackChipFull,
                {
                  borderColor: themeColors.tint + "50",
                  backgroundColor: themeColors.tint + "0D",
                },
                isRetracking && styles.retrackChipDisabled,
              ]}
              onPress={fetchCurrentLocation}
              disabled={isRetracking}
              activeOpacity={0.75}
            >
              <Animated.View style={{ opacity: pulseAnim }}>
                {isRetracking ? (
                  <ActivityIndicator size="small" color={themeColors.tint} />
                ) : (
                  <CrosshairIcon
                    size={15}
                    color={themeColors.tint}
                    weight="bold"
                  />
                )}
              </Animated.View>
              <ThemedText
                style={[
                  styles.retrackChipFullText,
                  { color: themeColors.tint },
                ]}
              >
                {tx(
                  "sellSection.Retrack_Current_Location",
                  "Use current location",
                )}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Location detail card ── */}
      {hasSelectedLocation && (
        <Animated.View
          style={[
            styles.detailCard,
            {
              opacity: fadeAnim,
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          {/* Header row */}
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <View
                style={[styles.pinDot, { backgroundColor: themeColors.tint }]}
              />
              <ThemedText
                style={[styles.detailTitle, { color: themeColors.text }]}
              >
                {tx(
                  "sellSection.selected_location_details",
                  "Selected Location",
                )}
              </ThemedText>
            </View>
            {selectedAccuracy !== null && (
              <View
                style={[
                  styles.accuracyBadge,
                  { backgroundColor: accuracyColor + "18" },
                ]}
              >
                <View
                  style={[
                    styles.accuracyDot,
                    { backgroundColor: accuracyColor },
                  ]}
                />
                <ThemedText
                  style={[styles.accuracyBadgeText, { color: accuracyColor }]}
                >
                  ±{Math.round(selectedAccuracy)} m
                </ThemedText>
              </View>
            )}
          </View>

          {/* Address */}
          <ThemedText
            style={[styles.detailAddress, { color: themeColors.text + "CC" }]}
            numberOfLines={2}
          >
            {selectedAddress ||
              tx(
                "sellSection.address_preview_not_available",
                "Fetching address…",
              )}
          </ThemedText>

          {/* Coordinates row */}
          <View
            style={[
              styles.coordRow,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.coordItem}>
              <ThemedText
                style={[styles.coordLabel, { color: themeColors.text + "60" }]}
              >
                LAT
              </ThemedText>
              <ThemedText
                style={[styles.coordValue, { color: themeColors.text }]}
              >
                {markerCoord.latitude.toFixed(6)}
              </ThemedText>
            </View>
            <View
              style={[
                styles.coordDivider,
                { backgroundColor: themeColors.border },
              ]}
            />
            <View style={styles.coordItem}>
              <ThemedText
                style={[styles.coordLabel, { color: themeColors.text + "60" }]}
              >
                LNG
              </ThemedText>
              <ThemedText
                style={[styles.coordValue, { color: themeColors.text }]}
              >
                {markerCoord.longitude.toFixed(6)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Action buttons ── */}
      <View style={styles.buttonContainer}>
        {!isConfirmed ? (
          <CustomButton
            title={tx("sellSection.Confirm_Location", "Confirm Location")}
            onPress={() => {
              onConfirmLocation(markerCoord);
              setIsConfirmed(true);
            }}
            disabled={!hasSelectedLocation}
            icon={
              hasSelectedLocation ? (
                <MapPinIcon
                  size={18}
                  color={themeColors.primaryButtonText}
                  weight="fill"
                />
              ) : undefined
            }
          />
        ) : (
          <View
            style={[
              styles.confirmedContainer,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.confirmedLeft}>
              <CheckCircleIcon size={18} color="#22c55e" weight="fill" />
              <ThemedText style={[styles.confirmedLabel, { color: "#22c55e" }]}>
                {tx("sellSection.location_confirmed", "Location confirmed")}
              </ThemedText>
            </View>
            <View style={styles.confirmedActions}>
              <TouchableOpacity
                onPress={() => Linking.openURL(mapUrl)}
                style={[styles.mapLinkBtn, { borderColor: themeColors.border }]}
                activeOpacity={0.7}
              >
                <ArrowSquareOutIcon
                  size={14}
                  color={themeColors.tint}
                  weight="bold"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsConfirmed(false)}
                style={[
                  styles.changeBtn,
                  { backgroundColor: themeColors.tint },
                ]}
                activeOpacity={0.8}
              >
                <ThemedText
                  style={[
                    styles.changeBtnText,
                    { color: themeColors.primaryButtonText },
                  ]}
                >
                  {tx("sellSection.Change_Location", "Change")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const getStyles = (themeColors: ReturnType<typeof useThemeColor>) =>
  StyleSheet.create({
    // ── Map container ──
    mapContainer: {
      height: 220,
      borderRadius: 18,
      marginBottom: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    mapContainerFallback: {
      height: "auto" as any,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    mapOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    // ── Retrack button (on top of native map) ──
    retrackBtn: {
      position: "absolute",
      right: 10,
      bottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: themeColors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
    },
    retrackBtnDisabled: { opacity: 0.55 },
    retrackBtnText: {
      fontSize: 12,
      fontWeight: "600",
    },

    // ── Android fallback ──
    mapFallback: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 10,
      borderRadius: 18,
    },
    fallbackHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    fallbackHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    fallbackTitle: {
      fontSize: 13,
      fontWeight: "700",
    },
    openMapBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    openMapBtnText: {
      fontSize: 11,
      fontWeight: "600",
    },
    previewWrapper: {
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
    },
    previewImage: {
      width: "100%",
      height: 130,
    },
    coordBadge: {
      position: "absolute",
      left: 8,
      bottom: 8,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    coordBadgeText: {
      color: "#fff",
      fontSize: 10.5,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    tapHint: {
      position: "absolute",
      top: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    tapHintText: {
      fontSize: 10,
      fontWeight: "700",
    },
    previewEmpty: {
      width: "100%",
      height: 130,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderStyle: "dashed" as any,
    },
    previewEmptyTitle: {
      fontSize: 13,
      fontWeight: "600",
    },
    previewEmptyCoord: {
      fontSize: 11,
    },
    gpsNote: {
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
    },
    retrackChipFull: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    retrackChipDisabled: { opacity: 0.55 },
    retrackChipFullText: {
      fontSize: 13,
      fontWeight: "600",
    },

    // ── Detail card ──
    detailCard: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 6,
      marginBottom: 8,
    },
    detailHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    detailHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    pinDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    detailTitle: {
      fontSize: 13,
      fontWeight: "700",
    },
    accuracyBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    accuracyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    accuracyBadgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    detailAddress: {
      fontSize: 12.5,
      lineHeight: 18,
    },
    coordRow: {
      flexDirection: "row",
      borderRadius: 10,
      borderWidth: 1,
      overflow: "hidden",
      marginTop: 2,
    },
    coordItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 7,
      gap: 2,
    },
    coordDivider: {
      width: 1,
    },
    coordLabel: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1,
    },
    coordValue: {
      fontSize: 12,
      fontWeight: "600",
    },

    // ── Buttons ──
    buttonContainer: {
      marginTop: 4,
      marginBottom: 8,
    },
    customButton: {
      backgroundColor: themeColors.tint,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    disabledButton: {
      backgroundColor: themeColors.border,
    },
    buttonIcon: {
      marginRight: 2,
    },
    customButtonText: {
      color: themeColors.primaryButtonText,
      fontSize: 15,
      fontWeight: "600",
    },
    confirmedContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    confirmedLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    confirmedLabel: {
      fontSize: 13,
      fontWeight: "700",
    },
    confirmedActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    mapLinkBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    changeBtn: {
      borderRadius: 10,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    changeBtnText: {
      fontSize: 13,
      fontWeight: "700",
    },
  });
