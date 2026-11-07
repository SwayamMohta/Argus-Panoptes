import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HEIGHT = 175;
const TILE_SIZE = 256;

// Web Mercator projection mathematics for dynamic tile positioning
const lon2tile = (lon, zoom) => ((lon + 180) / 360) * Math.pow(2, zoom);
const lat2tile = (lat, zoom) => {
  const rad = (lat * Math.PI) / 180;
  const clampedLat = Math.max(Math.min(rad, 1.4844), -1.4844);
  return ((1 - Math.log(Math.tan(clampedLat) + 1 / Math.cos(clampedLat)) / Math.PI) / 2) * Math.pow(2, zoom);
};

// Component for rendering an individual OpenStreetMap dynamic tile with fast fallbacks
const DynamicOsmTile = React.memo(({ z, x, y, left, top, size }) => {
  const [useFallback, setUseFallback] = useState(0);

  const maxTile = Math.pow(2, z);
  const wrappedX = ((x % maxTile) + maxTile) % maxTile;

  if (y < 0 || y >= maxTile) {
    return null;
  }

  const tileUrls = [
    `https://tile.openstreetmap.org/${z}/${wrappedX}/${y}.png`,
    `https://a.tile.openstreetmap.fr/hot/${z}/${wrappedX}/${y}.png`,
    `https://b.tile.openstreetmap.fr/hot/${z}/${wrappedX}/${y}.png`,
  ];
  const currentUri = tileUrls[Math.min(useFallback, tileUrls.length - 1)];

  return (
    <Image
      source={{
        uri: currentUri,
        headers: { 'User-Agent': 'ArgusPanoptesCivicApp/2.0' },
      }}
      style={{
        position: 'absolute',
        left: Math.round(left),
        top: Math.round(top),
        width: Math.ceil(size) + 1,
        height: Math.ceil(size) + 1,
      }}
      resizeMode="cover"
      fadeDuration={0}
      onError={() => setUseFallback((prev) => prev + 1)}
    />
  );
});

// Accurate locality coordinates dictionary
const LOCALITY_COORDS = {
  banjara_hills: { lat: 17.4156, lon: 78.435, coordsStr: '17.4156° N, 78.4350° E' },
  jubilee_hills: { lat: 17.4319, lon: 78.4073, coordsStr: '17.4319° N, 78.4073° E' },
  madhapur: { lat: 17.4483, lon: 78.3915, coordsStr: '17.4483° N, 78.3915° E' },
  gachibowli: { lat: 17.4401, lon: 78.3489, coordsStr: '17.4401° N, 78.3489° E' },
  kondapur: { lat: 17.4699, lon: 78.3578, coordsStr: '17.4699° N, 78.3578° E' },
  begumpet: { lat: 17.4447, lon: 78.4664, coordsStr: '17.4447° N, 78.4664° E' },
  somajiguda: { lat: 17.4265, lon: 78.4589, coordsStr: '17.4265° N, 78.4589° E' },
  secunderabad: { lat: 17.4399, lon: 78.4983, coordsStr: '17.4399° N, 78.4983° E' },
  bahadurpally: { lat: 17.5623, lon: 78.4371, coordsStr: '17.5623° N, 78.4371° E' },
  'ward-44': { lat: 12.9716, lon: 77.6412, coordsStr: '12.9716° N, 77.6412° E' },
  'ward-72': { lat: 12.9609, lon: 77.6387, coordsStr: '12.9609° N, 77.6387° E' },
  'ward-88': { lat: 12.9352, lon: 77.6245, coordsStr: '12.9352° N, 77.6245° E' },
  'ward-112': { lat: 12.9121, lon: 77.6446, coordsStr: '12.9121° N, 77.6446° E' },
  'ward-150': { lat: 12.9304, lon: 77.6784, coordsStr: '12.9304° N, 77.6784° E' },
};

export const WardAtAGlance = ({ locality, issues = [], onNavigateToMap }) => {
  const [cardWidth, setCardWidth] = useState(SCREEN_WIDTH - 32);

  // Radar pulse animation for the central geolocation marker
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 2.3,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, pulseOpacity]);

  // Determine coordinate telemetry for current locality
  const centerCoords =
    (locality?.lat && locality?.lon && {
      lat: locality.lat,
      lon: locality.lon,
      coordsStr: `${locality.lat.toFixed(4)}° N, ${locality.lon.toFixed(4)}° E`,
    }) ||
    LOCALITY_COORDS[locality?.id] ||
    LOCALITY_COORDS.banjara_hills;

  // Compute map tiles centered on current ward
  const zoom = 15.0;
  const z = Math.floor(zoom);
  const scale = Math.pow(2, zoom - z);
  const scaledTileSize = TILE_SIZE * scale;

  const centerTileX = lon2tile(centerCoords.lon, z);
  const centerTileY = lat2tile(centerCoords.lat, z);

  const halfW = cardWidth / 2;
  const halfH = CARD_HEIGHT / 2;

  const minTileX = Math.floor(centerTileX - halfW / scaledTileSize) - 1;
  const maxTileX = Math.ceil(centerTileX + halfW / scaledTileSize) + 1;
  const minTileY = Math.floor(centerTileY - halfH / scaledTileSize) - 1;
  const maxTileY = Math.ceil(centerTileY + halfH / scaledTileSize) + 1;

  const tiles = [];
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      const left = halfW + (x - centerTileX) * scaledTileSize;
      const top = halfH + (y - centerTileY) * scaledTileSize;
      tiles.push({
        id: `wardmap-${z}-${x}-${y}`,
        z,
        x,
        y,
        left,
        top,
        size: scaledTileSize,
      });
    }
  }

  // Count active nearby reports to highlight in the telemetry overlay
  const activeCount = issues.filter((i) => i.status !== 'resolved').length;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>WARD AT A GLANCE</Text>
        <Text style={styles.wardLabel} numberOfLines={1}>
          {locality?.ward ? `${locality.ward}` : 'Ward'}
          {locality?.name ? ` · ${locality.name}` : ''}
        </Text>
      </View>

      {/* Cartographic Interactive Mini-Map Widget Linking to GeoMap */}
      <TouchableOpacity
        style={styles.mapWidgetCard}
        onPress={onNavigateToMap}
        activeOpacity={0.92}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          if (width > 0 && Math.abs(width - cardWidth) > 2) {
            setCardWidth(width);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Open Ward GeoMap"
      >
        {/* Real OpenStreetMap Dynamic Slippy Tiles */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {tiles.map((tile) => (
            <DynamicOsmTile
              key={tile.id}
              z={tile.z}
              x={tile.x}
              y={tile.y}
              left={tile.left}
              top={tile.top}
              size={tile.size}
            />
          ))}
        </View>

        {/* Subtle Map Contrast Mask */}
        <View style={styles.mapOverlayTint} pointerEvents="none" />

        {/* Scattered Surrounding Monitored Pin Indicators */}
        <View
          style={[styles.nearbyPinWrapper, { left: halfW - 55, top: halfH - 26 }]}
          pointerEvents="none"
        >
          <View style={styles.nearbyPinDot} />
        </View>
        <View
          style={[styles.nearbyPinWrapper, { left: halfW + 62, top: halfH - 18 }]}
          pointerEvents="none"
        >
          <View style={[styles.nearbyPinDot, { backgroundColor: '#DC2626' }]} />
        </View>
        <View
          style={[styles.nearbyPinWrapper, { left: halfW - 75, top: halfH + 18 }]}
          pointerEvents="none"
        >
          <View style={[styles.nearbyPinDot, { backgroundColor: '#D97706' }]} />
        </View>

        {/* Center Geotag Marker Pin with Radar Pulse */}
        <View
          style={[styles.centerPinContainer, { left: halfW - 14, top: halfH - 24 }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.pinPulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={styles.pinBubble}>
            <View style={styles.pinBubbleCore} />
          </View>
          <View style={styles.pinStem} />
        </View>

        {/* Top Header Floating Telemetry Badges */}
        <View style={styles.topHudRow} pointerEvents="none">
          <View style={styles.telemetryBadge}>
            <View style={styles.telemetryDot} />
            <Text style={styles.telemetryText}>
              {locality?.ward || 'WARD'} · {centerCoords.coordsStr}
            </Text>
          </View>

          <View style={styles.gridLayerBadge}>
            <Ionicons name="location" size={11} color="#334155" />
            <Text style={styles.gridLayerText}>
              {activeCount > 0 ? `${activeCount} nearby` : 'Active'}
            </Text>
          </View>
        </View>

        {/* Bottom Interactive HUD Action Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfoCol}>
            <Text style={styles.bottomTitle} numberOfLines={1}>
              {locality?.name || 'Local Ward'}
            </Text>
            <Text style={styles.bottomSubtext} numberOfLines={1}>
              {locality?.zone || 'Municipal Sector'} · Surrounding Geo-Grid
            </Text>
          </View>

          {/* Solid Dark Neutral Action Button (Strictly following AGENTS.md rules) */}
          <View style={styles.openMapButton}>
            <Text style={styles.openMapButtonText}>Open Map</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  wardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    maxWidth: '55%',
    textAlign: 'right',
  },

  // Map Widget Container
  mapWidgetCard: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#E8F1EC',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  mapOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
  },

  // Top Telemetry Badges
  topHudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    zIndex: 10,
  },
  telemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  telemetryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  telemetryText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: 0.2,
  },
  gridLayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4.5,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gridLayerText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
  },

  // Center Marker Pin & Radar
  centerPinContainer: {
    position: 'absolute',
    width: 28,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  pinPulseRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 35, 40, 0.16)',
    top: 1,
  },
  pinBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E2328',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pinBubbleCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pinStem: {
    width: 2,
    height: 5,
    backgroundColor: '#1E2328',
    borderRadius: 1,
  },

  // Scattered nearby indicators
  nearbyPinWrapper: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  nearbyPinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },

  // Bottom HUD Action Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    zIndex: 10,
  },
  bottomInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  bottomTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  bottomSubtext: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2328',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  openMapButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
