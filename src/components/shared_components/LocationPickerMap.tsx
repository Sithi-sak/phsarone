import { ThemedText } from "@src/components/shared_components/ThemedText";
import { SellDraft } from "@src/context/SellDraftContext";
import { TradeDraft } from "@src/context/TradeDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { buildOpenStreetMapUrl } from "@src/lib/maps";
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
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { WebView } from "react-native-webview";

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

function buildLeafletHtml(
  latitude: number,
  longitude: number,
  locked: boolean,
) {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #f8fafc; }
      .leaflet-container { font-family: sans-serif; }
      .leaflet-bottom.leaflet-right { margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const initial = {
        latitude: ${latitude},
        longitude: ${longitude},
        zoom: 16,
      };
      let isLocked = ${locked ? "true" : "false"};
      const map = L.map("map", {
        zoomControl: true,
        attributionControl: false,
      }).setView([initial.latitude, initial.longitude], initial.zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initial.latitude, initial.longitude], {
        draggable: !isLocked,
      }).addTo(map);

      function postSelection(lat, lng) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "locationSelected",
          latitude: lat,
          longitude: lng,
        }));
      }

      function updateMarker(lat, lng, zoom, lockedValue) {
        isLocked = !!lockedValue;
        marker.setLatLng([lat, lng]);
        marker.dragging[isLocked ? "disable" : "enable"]();
        if (zoom) {
          map.setView([lat, lng], zoom, { animate: true });
        }
      }

      map.on("click", function (e) {
        if (isLocked) return;
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        marker.setLatLng([lat, lng]);
        postSelection(lat, lng);
      });

      marker.on("dragend", function () {
        if (isLocked) return;
        const pos = marker.getLatLng();
        postSelection(pos.lat, pos.lng);
      });

      function handleMessage(raw) {
        try {
          const data = JSON.parse(raw);
          if (data.type === "setMarker") {
            updateMarker(data.latitude, data.longitude, data.zoom, data.locked);
          }
        } catch {}
      }

      document.addEventListener("message", function (event) {
        handleMessage(event.data);
      });
      window.addEventListener("message", function (event) {
        handleMessage(event.data);
      });
    </script>
  </body>
</html>`;
}

export default function LocationPickerMap({
  onConfirmLocation,
  currentDraft,
  onUpdateDraft,
}: LocationPickerMapProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColor();
  const mapRef = useRef<MapView>(null);
  const previewMapRef = useRef<WebView>(null);
  const expandedMapRef = useRef<WebView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const initialCoord =
    currentDraft.location.latitude && currentDraft.location.longitude
      ? currentDraft.location
      : {
          latitude: DEFAULT_REGION.latitude,
          longitude: DEFAULT_REGION.longitude,
        };

  const [hasSelectedLocation, setHasSelectedLocation] = useState(
    !!(
      currentDraft.location.latitude &&
      currentDraft.location.latitude !== DEFAULT_REGION.latitude
    ),
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRetracking, setIsRetracking] = useState(false);
  const [markerCoord, setMarkerCoord] = useState(initialCoord);
  const [draftMarkerCoord, setDraftMarkerCoord] = useState(initialCoord);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedAccuracy, setSelectedAccuracy] = useState<number | null>(null);
  const [showExpandedMap, setShowExpandedMap] = useState(false);

  const hasAndroidMapsKey =
    Platform.OS !== "android" ||
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
  const mapUrl = buildOpenStreetMapUrl(
    markerCoord.latitude,
    markerCoord.longitude,
  );

  useEffect(() => {
    if (!hasSelectedLocation) {
      fetchCurrentLocation();
    } else {
      refreshLocationDetails(markerCoord.latitude, markerCoord.longitude);
    }
  }, []);

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

  useEffect(() => {
    if (hasSelectedLocation) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [hasSelectedLocation]);

  useEffect(() => {
    if (!hasAndroidMapsKey && hasSelectedLocation) {
      syncPreviewMapMarker(markerCoord.latitude, markerCoord.longitude);
    }
  }, [
    hasAndroidMapsKey,
    hasSelectedLocation,
    isConfirmed,
    markerCoord.latitude,
    markerCoord.longitude,
  ]);

  useEffect(() => {
    if (!hasAndroidMapsKey && showExpandedMap) {
      syncExpandedMapMarker(draftMarkerCoord.latitude, draftMarkerCoord.longitude);
    }
  }, [
    hasAndroidMapsKey,
    showExpandedMap,
    draftMarkerCoord.latitude,
    draftMarkerCoord.longitude,
  ]);

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

  const syncPreviewMapMarker = (
    latitude: number,
    longitude: number,
    zoom = 16,
  ) => {
    previewMapRef.current?.postMessage(
      JSON.stringify({
        type: "setMarker",
        latitude,
        longitude,
        zoom,
        locked: isConfirmed,
      }),
    );
  };

  const syncExpandedMapMarker = (
    latitude: number,
    longitude: number,
    zoom = 16,
  ) => {
    expandedMapRef.current?.postMessage(
      JSON.stringify({
        type: "setMarker",
        latitude,
        longitude,
        zoom,
        locked: false,
      }),
    );
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
          // User may dismiss the prompt.
        }
      }

      const currentLocation = await getBestTrackedLocation();
      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      if (showExpandedMap) {
        setDraftMarkerCoord(newLocation);
        syncExpandedMapMarker(newLocation.latitude, newLocation.longitude);
      } else {
        onUpdateDraft("location", newLocation);
        setMarkerCoord(newLocation);
        setDraftMarkerCoord(newLocation);
        mapRef.current?.animateToRegion(
          { ...newLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          1000,
        );
        syncPreviewMapMarker(newLocation.latitude, newLocation.longitude);
        setHasSelectedLocation(true);
        setIsConfirmed(false);
      }

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

  const applySelectedLocation = (
    coordinate: { latitude: number; longitude: number },
    options?: { keepConfirmed?: boolean },
  ) => {
    setMarkerCoord(coordinate);
    setSelectedAccuracy(null);
    onUpdateDraft("location", coordinate);
    mapRef.current?.animateToRegion(
      { ...coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500,
    );
    setHasSelectedLocation(true);
    setIsConfirmed(options?.keepConfirmed ?? false);
    refreshLocationDetails(coordinate.latitude, coordinate.longitude);
  };

  const handleTap = (coordinate: { latitude: number; longitude: number }) => {
    if (isConfirmed) return;
    applySelectedLocation(coordinate);
  };

  const handleDragEnd = (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    applySelectedLocation(coordinate);
  };

  const handlePreviewMapMessage = (event: {
    nativeEvent: { data: string };
  }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type !== "locationSelected") return;
      if (isConfirmed) return;
      applySelectedLocation({
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    } catch {
      // Ignore malformed messages.
    }
  };

  const handleExpandedMapMessage = (event: {
    nativeEvent: { data: string };
  }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type !== "locationSelected") return;
      setDraftMarkerCoord({
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    } catch {
      // Ignore malformed messages.
    }
  };

  const accuracyColor =
    selectedAccuracy === null
      ? themeColors.text + "60"
      : selectedAccuracy <= 10
        ? "#22c55e"
        : selectedAccuracy <= 30
          ? "#f59e0b"
          : "#ef4444";

  const previewMapHtml = buildLeafletHtml(
    markerCoord.latitude || DEFAULT_REGION.latitude,
    markerCoord.longitude || DEFAULT_REGION.longitude,
    isConfirmed,
  );
  const expandedMapHtml = buildLeafletHtml(
    draftMarkerCoord.latitude || markerCoord.latitude || DEFAULT_REGION.latitude,
    draftMarkerCoord.longitude ||
      markerCoord.longitude ||
      DEFAULT_REGION.longitude,
    false,
  );

  const openExpandedMap = () => {
    setDraftMarkerCoord(markerCoord);
    setShowExpandedMap(true);
  };

  const saveExpandedMap = () => {
    applySelectedLocation(draftMarkerCoord);
    setShowExpandedMap(false);
  };

  return (
    <>
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
          <View
            style={[styles.mapFallback, { backgroundColor: themeColors.card }]}
          >
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
                onPress={openExpandedMap}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[styles.openMapBtnText, { color: themeColors.tint }]}
                >
                  {tx("sellSection.open_map", "Open Map")}
                </ThemedText>
                <ArrowSquareOutIcon
                  size={12}
                  color={themeColors.tint}
                  weight="bold"
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.previewWrapper,
                { borderColor: themeColors.border },
              ]}
            >
              <WebView
                ref={previewMapRef}
                originWhitelist={["*"]}
                source={{ html: previewMapHtml }}
                onMessage={handlePreviewMapMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                nestedScrollEnabled={false}
                style={styles.previewMapWebView}
              />
            </View>

            <ThemedText
              style={[styles.gpsNote, { color: themeColors.text + "60" }]}
            >
            </ThemedText>

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
                  "Selected Location Details",
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

          <ThemedText
            style={[styles.detailAddress, { color: themeColors.text + "CC" }]}
            numberOfLines={2}
          >
            {selectedAddress ||
              tx(
                "sellSection.address_preview_not_available",
                "Address preview not available yet.",
              )}
          </ThemedText>
        </Animated.View>
      )}

      <View style={styles.buttonContainer}>
        {!isConfirmed ? (
          <CustomButton
            title={tx("sellSection.Confirm_Location", "Confirm Location")}
            onPress={() => {
              onConfirmLocation(markerCoord);
              setIsConfirmed(true);
              syncPreviewMapMarker(markerCoord.latitude, markerCoord.longitude);
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
                onPress={openExpandedMap}
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

      {!hasAndroidMapsKey && (
        <Modal
          visible={showExpandedMap}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowExpandedMap(false)}
        >
          <View
            style={[
              styles.expandedMapScreen,
              { backgroundColor: themeColors.background },
            ]}
          >
            <View
              style={[
                styles.expandedMapHeader,
                {
                  backgroundColor: themeColors.card,
                  borderBottomColor: themeColors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => setShowExpandedMap(false)}
                style={styles.expandedMapHeaderSide}
              >
                <ThemedText style={styles.expandedMapHeaderAction}>
                  {tx("common.cancel", "Cancel")}
                </ThemedText>
              </Pressable>

              <ThemedText style={styles.expandedMapHeaderTitle}>
                {tx("sellSection.set_map", "Set Map")}
              </ThemedText>

              <Pressable
                onPress={saveExpandedMap}
                style={styles.expandedMapHeaderSide}
              >
                <ThemedText
                  style={[
                    styles.expandedMapHeaderAction,
                    { color: themeColors.primary },
                  ]}
                >
                  {tx("common.save", "Save")}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.expandedMapBody}>
              <WebView
                ref={expandedMapRef}
                originWhitelist={["*"]}
                source={{ html: expandedMapHtml }}
                onMessage={handleExpandedMapMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                style={styles.expandedMapWebView}
              />
            </View>

            <View
              style={[
                styles.expandedMapFooter,
                {
                  backgroundColor: themeColors.background + "F2",
                  borderTopColor: themeColors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.retrackChipFull,
                  styles.expandedCurrentLocationBtn,
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

              <TouchableOpacity
                style={[
                  styles.expandedSaveBtn,
                  { backgroundColor: themeColors.primary },
                ]}
                onPress={saveExpandedMap}
                activeOpacity={0.85}
              >
                <ThemedText style={styles.expandedSaveBtnText}>
                  {tx("common.save", "Save")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const getStyles = (themeColors: ReturnType<typeof useThemeColor>) =>
  StyleSheet.create({
    mapContainer: {
      height: 220,
      borderRadius: 16,
      marginBottom: 8,
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
    mapFallback: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 10,
      borderRadius: 16,
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
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 0,
    },
    previewMapWebView: {
      width: "100%",
      height: 220,
      backgroundColor: themeColors.background,
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
      marginTop: -24,
      borderWidth: 1,
      borderRadius: 99,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    retrackChipDisabled: { opacity: 0.55 },
    retrackChipFullText: {
      fontSize: 13,
      fontWeight: "600",
    },
    detailCard: {
      borderWidth: 1,
      borderRadius: 16,
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
      flex: 1,
      minWidth: 0,
    },
    pinDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    detailTitle: {
      fontSize: 13,
      fontWeight: "700",
      flexShrink: 1,
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
    buttonContainer: {
      marginTop: 4,
      marginBottom: 8,
    },
    customButton: {
      backgroundColor: themeColors.tint,
      paddingVertical: 10,
      borderRadius: 99,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      minHeight: 44,
      width: "100%",
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
      flexShrink: 1,
      textAlign: "center",
    },
    confirmedContainer: {
      marginTop: -4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 99,
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    confirmedLeft: {
      marginLeft: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    confirmedLabel: {
      fontSize: 12,
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
      borderRadius: 99,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    changeBtn: {
      borderRadius: 99,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    changeBtnText: {
      fontSize: 12,
      fontWeight: "700",
    },
    expandedMapScreen: {
      flex: 1,
    },
    expandedMapHeader: {
      height: 60,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    expandedMapHeaderSide: {
      minWidth: 64,
    },
    expandedMapHeaderTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    expandedMapHeaderAction: {
      fontSize: 15,
      fontWeight: "600",
    },
    expandedMapBody: {
      flex: 1,
    },
    expandedMapWebView: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    expandedMapFooter: {
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
    },
    expandedCurrentLocationBtn: {
      width: "100%",
    },
    expandedSaveBtn: {
      borderRadius: 999,
      paddingVertical: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    expandedSaveBtnText: {
      color: themeColors.primaryButtonText,
      fontSize: 16,
      fontWeight: "700",
    },
  });
