import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Image,
  Dimensions,
  Platform,
  LayoutAnimation,
  UIManager,
  PanResponder,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { MAP_ATTRIBUTION, MAP_TILE_URLS, tileUri } from '../constants/mapTiles';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { IssueDetailScreen } from './IssueDetailScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Top Map Viewport is 42% of the screen
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.42);
const TILE_SIZE = 256;
const MIN_ZOOM = 3.5;
const MAX_ZOOM = 18.5;

// Web Mercator projection mathematics for dynamic tile positioning at ANY zoom level
const lon2tile = (lon, zoom) => ((lon + 180) / 360) * Math.pow(2, zoom);
const lat2tile = (lat, zoom) => {
  const rad = (lat * Math.PI) / 180;
  const clampedLat = Math.max(Math.min(rad, 1.4844), -1.4844);
  return ((1 - Math.log(Math.tan(clampedLat) + 1 / Math.cos(clampedLat)) / Math.PI) / 2) * Math.pow(2, zoom);
};

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const BOUNDARY_ZOOM = 12;

const haversineKm = (from, lat, lon) => {
  if (!from || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat - from.lat);
  const dLon = toRad(lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const SECTOR_BY_CATEGORY = {
  roads: 'Roads & Works',
  transit: 'Public Transit & Stops',
  health: 'Healthcare & Clinics',
  ration: 'PDS & Food Security',
  water: 'Water Works & Supply',
  sanitation: 'Sanitation & Waste',
  power: 'Power Grid & Electrical',
  drainage: 'Storm Drainage',
};

const normalizeWardName = (name) => {
  const stripped = (name || '').replace(/^\d+\s*-\s*/, '');
  return stripped
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const featureToWard = (feature) => {
  const properties = feature.properties || {};
  const rawName = properties.name || 'Ward';
  const numberMatch = rawName.match(/^(\d+)\s*-\s*/);
  const center = properties.center || {};
  return {
    id: properties.id,
    name: normalizeWardName(rawName),
    fullName: rawName,
    wardNumber: numberMatch ? numberMatch[1] : '',
    zone: properties.zone || 'Hyderabad',
    circle: properties.circle || '',
    distance: '',
    distanceKm: null,
    coverage: null,
    healthScore: null,
    openFlags: properties.openIssueCount || 0,
    badgeText: '',
    coordinates: Number.isFinite(center.lat)
      ? `${center.lat.toFixed(4)}° N, ${center.lon.toFixed(4)}° E`
      : '',
    lat: center.lat,
    lon: center.lon,
    assets: [],
    boundary: feature.geometry,
  };
};

const geometryPolygons = (geometry) => {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
};

// Fixed tile-pixel path at BOUNDARY_ZOOM; the map pan/zoom is applied as an SVG transform.
const boundaryToPath = (geometry) => {
  const parts = [];
  for (const polygon of geometryPolygons(geometry)) {
    for (const ring of polygon) {
      if (!ring || ring.length < 3) continue;
      ring.forEach(([lon, lat], index) => {
        const x = lon2tile(lon, BOUNDARY_ZOOM) * TILE_SIZE;
        const y = lat2tile(lat, BOUNDARY_ZOOM) * TILE_SIZE;
        parts.push(`${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
      });
      parts.push('Z');
    }
  }
  return parts.join(' ');
};

// Screen-space path for the fixed-zoom mini map.
const boundaryToScreenPath = (geometry, centerLat, centerLon, zoom, width, height) => {
  const centerX = lon2tile(centerLon, zoom);
  const centerY = lat2tile(centerLat, zoom);
  const parts = [];
  for (const polygon of geometryPolygons(geometry)) {
    for (const ring of polygon) {
      if (!ring || ring.length < 3) continue;
      ring.forEach(([lon, lat], index) => {
        const x = width / 2 + (lon2tile(lon, zoom) - centerX) * TILE_SIZE;
        const y = height / 2 + (lat2tile(lat, zoom) - centerY) * TILE_SIZE;
        parts.push(`${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
      });
      parts.push('Z');
    }
  }
  return parts.join(' ');
};

// Renders one raster map tile from the configured provider.
const DynamicMapTile = React.memo(({ z, x, y, left, top, size }) => {
  const [useFallback, setUseFallback] = useState(0);

  const maxTile = Math.pow(2, z);
  const wrappedX = ((x % maxTile) + maxTile) % maxTile;

  if (y < 0 || y >= maxTile || MAP_TILE_URLS.length === 0) {
    return null;
  }

  const currentUri = tileUri(
    MAP_TILE_URLS[Math.min(useFallback, MAP_TILE_URLS.length - 1)],
    z,
    wrappedX,
    y
  );

  return (
    <Image
      source={{ uri: currentUri }}
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

// =========================================================================
// REAL MINI-MAP PREVIEW FOR SKETCH HEADER (RIGHT COLUMN)
// Renders real live OpenStreetMap tiles centered on the selected ward
// =========================================================================
const RealMiniMapPreview = React.memo(({ ward }) => {
  const PREVIEW_WIDTH = 120;
  const PREVIEW_HEIGHT = 115;
  const zoom = 15.0;
  const z = Math.floor(zoom);
  const scale = Math.pow(2, zoom - z);
  const scaledTileSize = TILE_SIZE * scale;

  const centerTileX = lon2tile(ward.lon, z);
  const centerTileY = lat2tile(ward.lat, z);

  const halfW = PREVIEW_WIDTH / 2;
  const halfH = PREVIEW_HEIGHT / 2;

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
        id: `minimap-${z}-${x}-${y}`,
        z,
        x,
        y,
        left,
        top,
        size: scaledTileSize,
      });
    }
  }

  return (
    <View style={styles.sketchMiniMapCard}>
      {/* Real OpenStreetMap Dynamic Slippy Tiles */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {tiles.map((tile) => (
          <DynamicMapTile
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

      {/* Selected GHMC ward boundary */}
      {ward.boundary && (
        <Svg
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Path
            d={boundaryToScreenPath(
              ward.boundary,
              ward.lat,
              ward.lon,
              z,
              PREVIEW_WIDTH,
              PREVIEW_HEIGHT
            )}
            fill="rgba(22, 163, 74, 0.18)"
            stroke="#15803D"
            strokeWidth={1.5}
            fillRule="evenodd"
          />
        </Svg>
      )}

      {/* Geotag Marker Pin in Center with Pulse */}
      <View style={styles.miniMapCenterPin} pointerEvents="none">
        <View style={styles.miniMapPinPulse} />
        <View style={styles.miniMapPinDot} />
        <View style={styles.miniMapPinCore} />
      </View>
    </View>
  );
});

// =========================================================================
// CIVIC PROBLEM FILTER & SORT CATEGORIES (AMAZON-STYLE PANEL OPTIONS)
// =========================================================================
export const FILTER_SORT_OPTIONS = [
  { id: 'urgency', label: 'Urgency' },
  { id: 'recent', label: 'Recent' },
  { id: 'category', label: 'Category' },
];

export const FILTER_SECTOR_OPTIONS = [
  { id: 'Roads & Works', label: 'Roads' },
  { id: 'Power Grid & Electrical', label: 'Power' },
  { id: 'Sanitation & Waste', label: 'Sanitation' },
  { id: 'Storm Drainage', label: 'Drainage' },
  { id: 'Water Works & Supply', label: 'Water' },
  { id: 'Healthcare & Clinics', label: 'Health' },
  { id: 'PDS & Food Security', label: 'PDS' },
  { id: 'Public Transit & Stops', label: 'Transit' },
];

export const FILTER_SEVERITY_OPTIONS = [
  { id: 'Critical Defect', label: 'Critical' },
  { id: 'High Severity', label: 'High' },
  { id: 'Moderate', label: 'Moderate' },
  { id: 'Compliant', label: 'Compliant' },
];

export const FILTER_STATUS_OPTIONS = [
  { id: 'Action Required', label: 'Action' },
  { id: 'Needs Review', label: 'Review' },
  { id: 'Verified', label: 'Verified' },
];

export const WARD_FILTER_SORT_OPTIONS = [
  { id: 'distance', label: 'Nearest First', subtitle: 'Use the locate button to enable distance' },
  { id: 'flags_high', label: 'Most Open Issues', subtitle: 'Wards with the most unresolved reports' },
  { id: 'name', label: 'Ward Name (A-Z)', subtitle: 'Alphabetical order' },
];

export const WARD_FILTER_RISK_OPTIONS = [
  { id: 'critical', label: 'High Priority', subtitle: 'Requires urgent civic intervention', color: '#DC2626' },
  { id: 'moderate', label: 'Under Review', subtitle: 'Scheduled for routine inspection', color: '#EA580C' },
  { id: 'clear', label: 'Resolved / Normal', subtitle: 'No active critical issues', color: '#16A34A' },
];

export const WARD_FILTER_DISTANCE_OPTIONS = [
  { id: 'any', label: 'Any Distance', subtitle: 'Include national hubs' },
  { id: '2', label: 'Within 2 km', subtitle: 'Immediate neighborhood' },
  { id: '5', label: 'Within 5 km', subtitle: 'Local constituency' },
  { id: '10', label: 'Within 10 km', subtitle: 'Greater urban district' },
];

export const WARD_FILTER_ZONE_OPTIONS = [
  { id: 'KUKATPALLY ZONE', label: 'Kukatpally Zone', subtitle: '22 GHMC wards' },
  { id: 'SECUNDERABAD ZONE', label: 'Secunderabad Zone', subtitle: '27 GHMC wards' },
  { id: 'SERILINGAMPALLY ZONE', label: 'Serilingampally Zone', subtitle: '15 GHMC wards' },
  { id: 'L.B.NAGAR ZONE', label: 'L.B. Nagar Zone', subtitle: '23 GHMC wards' },
  { id: 'CHARMINAR ZONE', label: 'Charminar Zone', subtitle: '36 GHMC wards' },
  { id: 'KHAIRATHABAD ZONE', label: 'Khairathabad Zone', subtitle: '27 GHMC wards' },
  { id: 'CANTONMENT AREA', label: 'Cantonment Area', subtitle: '1 ward' },
  { id: 'GRAMPANCHAYAT PEERZADIGUDA', label: 'Peerzadiguda GP', subtitle: '1 ward' },
  { id: 'KALAVANCHA GRAMPANCHAYATH', label: 'Kalavancha GP', subtitle: '1 ward' },
  { id: 'OU', label: 'Osmania University', subtitle: '1 ward' },
  { id: 'BANDLAGUDA', label: 'Bandlaguda', subtitle: '1 ward' },
];

export const WARD_FILTER_SECTOR_OPTIONS = [
  { id: 'Drainage', label: 'Drainage & Culverts', icon: 'water-outline' },
  { id: 'Roads & Works', label: 'Roads & Footpaths', icon: 'car-outline' },
  { id: 'Sanitation', label: 'Sanitation & SWM', icon: 'trash-outline' },
  { id: 'Power Grid', label: 'Power & Feeder Lines', icon: 'flash-outline' },
  { id: 'Water Works', label: 'Water Supply Network', icon: 'water-outline' },
  { id: 'Healthcare', label: 'Primary Health Centers', icon: 'medical-outline' },
  { id: 'Food & PDS', label: 'Fair Price / PDS', icon: 'basket-outline' },
];


export const GeoMapScreen = ({ initialArea = null, onAreaConsumed }) => {
  // Navigation / Selection State
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaAssets, setAreaAssets] = useState([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const initialHandledRef = useRef(false);
  const [highlightedWardId, setHighlightedWardId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const DEFAULT_WARD_FILTERS = {
    sortBy: 'distance',
    riskLevels: [],
    maxDistance: 'any',
    zones: [],
    sectors: [],
  };

  const [appliedWardFilters, setAppliedWardFilters] = useState(DEFAULT_WARD_FILTERS);
  const [draftWardFilters, setDraftWardFilters] = useState(DEFAULT_WARD_FILTERS);
  const [wardFilterActiveTab, setWardFilterActiveTab] = useState('sortBy');
  const [wardFilterModalVisible, setWardFilterModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterActiveTab, setFilterActiveTab] = useState('sortBy'); // 'sortBy' | 'sectors' | 'severities' | 'statuses'
  const [appliedFilters, setAppliedFilters] = useState({
    sortBy: 'urgency',
    sectors: [],
    severities: [],
    statuses: [],
  });
  const [draftFilters, setDraftFilters] = useState({
    sortBy: 'urgency',
    sectors: [],
    severities: [],
    statuses: [],
  });
  const [selectedAssetModal, setSelectedAssetModal] = useState(null);

  // Dynamic Map State: Center Coordinate & Zoom level
  const [mapCenter, setMapCenter] = useState({ lat: 17.385, lon: 78.4867 });
  const [mapZoom, setMapZoom] = useState(11);
  const [wardFeatures, setWardFeatures] = useState([]);
  const [wardLoadState, setWardLoadState] = useState('loading');

  const wards = useMemo(
    () =>
      wardFeatures.map(featureToWard).map((ward) => {
        const distanceKm = haversineKm(userLocation, ward.lat, ward.lon);
        return distanceKm == null
          ? ward
          : {
              ...ward,
              distanceKm,
              distance: `${distanceKm.toFixed(1)} km`,
            };
      }),
    [wardFeatures, userLocation]
  );
  const zoneOptions = useMemo(() => {
    const counts = {};
    wards.forEach((ward) => {
      if (ward.zone) counts[ward.zone] = (counts[ward.zone] || 0) + 1;
    });
    return Object.keys(counts)
      .sort()
      .map((zone) => ({
        id: zone,
        label: zone,
        subtitle: `${counts[zone]} GHMC ward${counts[zone] === 1 ? '' : 's'}`,
      }));
  }, [wards]);
  const wardPaths = useMemo(
    () => Object.fromEntries(wards.map((ward) => [ward.id, boundaryToPath(ward.boundary)])),
    [wards]
  );

  useEffect(() => {
    if (__DEV__) console.log('[map] tile provider:', MAP_TILE_URLS[0]);
    api
      .categories()
      .then((rows) => setCategories(rows || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedArea?.id) {
      setAreaAssets([]);
      return undefined;
    }
    let active = true;
    setAreaLoading(true);
    api
      .issues({ areaId: selectedArea.id, limit: 50, sortBy: 'new' })
      .then((page) => {
        if (!active) return;
        setAreaAssets(
          (page.items || []).map((issue) => {
            const category = categories.find((item) => item.id === issue.categoryId);
            return {
              id: issue.id,
              issueId: issue.id,
              categoryId: issue.categoryId,
              title: issue.title,
              problemSummary: issue.description,
              notes: issue.description,
              sector: SECTOR_BY_CATEGORY[issue.categoryId] || category?.name || 'Civic',
              sectorIcon: category?.icon || 'business-outline',
              severity:
                issue.status === 'resolved'
                  ? 'Compliant'
                  : issue.priority === 'safety_hazard'
                    ? 'Critical Defect'
                    : issue.priority === 'urgent'
                      ? 'High Severity'
                      : 'Moderate',
              status:
                issue.status === 'resolved'
                  ? 'Verified'
                  : issue.status === 'under_review'
                    ? 'Needs Review'
                    : 'Action Required',
              rawStatus: issue.status,
              statusLabel: issue.statusLabel,
              address: issue.location,
              coordinates: issue.area || selectedArea.name,
              lastAudit: timeAgo(issue.createdAt),
              auditedBy: issue.author,
              actionRequired: issue.status === 'resolved' ? '' : 'Review the reported issue.',
              upvotes: issue.upvotes,
              confirmationsCount: issue.confirmationsCount,
              imageUri: null,
            };
          })
        );
      })
      .catch(() => {
        if (active) setAreaAssets([]);
      })
      .finally(() => {
        if (active) setAreaLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedArea?.id, categories, selectedArea?.name]);

  useEffect(() => {
    if (!API_BASE_URL) {
      setWardLoadState('unconfigured');
      return undefined;
    }
    let cancelled = false;
    const loadWards = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/wards/boundaries?tolerance=0.0005`
        );
        if (!response.ok) throw new Error(`Ward API ${response.status}`);
        const data = await response.json();
        if (cancelled) return;
        setWardFeatures(Array.isArray(data.features) ? data.features : []);
        setWardLoadState('ready');
      } catch (error) {
        if (!cancelled) setWardLoadState('error');
      }
    };
    loadWards();
    return () => {
      cancelled = true;
    };
  }, []);

  // High performance gesture tracking refs
  const centerRef = useRef({ lat: 17.385, lon: 78.4867 });
  const zoomRef = useRef(11);
  const startCenterRef = useRef({ lat: 17.385, lon: 78.4867 });
  const initialPinchDistRef = useRef(null);
  const startPinchZoomRef = useRef(11);
  const lastTapRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    centerRef.current = mapCenter;
  }, [mapCenter]);

  useEffect(() => {
    zoomRef.current = mapZoom;
  }, [mapZoom]);

  // Smooth animated transition to any coordinate and zoom
  const flyTo = (targetLat, targetLon, targetZoom = null) => {
    const startLat = centerRef.current.lat;
    const startLon = centerRef.current.lon;
    const startZ = zoomRef.current;
    const destZ = targetZoom !== null ? targetZoom : startZ;
    const startTime = Date.now();
    const duration = 400;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentLat = startLat + (targetLat - startLat) * ease;
      const currentLon = startLon + (targetLon - startLon) * ease;
      const currentZ = startZ + (destZ - startZ) * ease;

      centerRef.current = { lat: currentLat, lon: currentLon };
      zoomRef.current = currentZ;
      setMapCenter({ lat: currentLat, lon: currentLon });
      setMapZoom(currentZ);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleZoomIn = () => {
    const nextZ = Math.min(zoomRef.current + 1.2, MAX_ZOOM);
    flyTo(centerRef.current.lat, centerRef.current.lon, nextZ);
  };

  const handleZoomOut = () => {
    const nextZ = Math.max(zoomRef.current - 1.2, MIN_ZOOM);
    flyTo(centerRef.current.lat, centerRef.current.lon, nextZ);
  };

  const handleViewCity = () => {
    flyTo(17.385, 78.4867, 10.8);
  };

  const centerMapOnWard = (ward) => {
    setHighlightedWardId(ward.id);
    const targetZoom = zoomRef.current < 13 ? 14.5 : zoomRef.current;
    flyTo(ward.lat, ward.lon, targetZoom);
  };

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location is required to sort wards by distance.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      setUserLocation(point);
      flyTo(point.lat, point.lon, 13);
    } catch (error) {
      Alert.alert('Location Unavailable', error.message || 'Could not read your location.');
    }
  };

  // PanResponder for Main Map
  const mapPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          evt.nativeEvent.touches.length === 2 ||
          Math.abs(gestureState.dx) > 2 ||
          Math.abs(gestureState.dy) > 2
        );
      },
      onPanResponderGrant: (evt) => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        const touches = evt.nativeEvent.touches;
        if (touches && touches.length === 2) {
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          initialPinchDistRef.current = dist > 0 ? dist : 1;
          startPinchZoomRef.current = zoomRef.current;
        } else {
          initialPinchDistRef.current = null;
        }

        startCenterRef.current = { ...centerRef.current };

        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          handleZoomIn();
        }
        lastTapRef.current = now;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length === 2 && initialPinchDistRef.current) {
          const currentDist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          const factor = currentDist / initialPinchDistRef.current;
          const newZoom = Math.min(
            Math.max(startPinchZoomRef.current + Math.log2(factor), MIN_ZOOM),
            MAX_ZOOM
          );
          zoomRef.current = newZoom;
          setMapZoom(newZoom);
          return;
        }

        const z = zoomRef.current;
        const scale = Math.pow(2, z);
        const degPerPixelX = 360 / (TILE_SIZE * scale);
        const degPerPixelY = 180 / (TILE_SIZE * scale);

        const newLon = startCenterRef.current.lon - gestureState.dx * degPerPixelX;
        const newLat = Math.max(
          Math.min(startCenterRef.current.lat + gestureState.dy * degPerPixelY, 80),
          -80
        );

        centerRef.current = { lat: newLat, lon: newLon };
        setMapCenter({ lat: newLat, lon: newLon });
      },
      onPanResponderRelease: () => {
        initialPinchDistRef.current = null;
      },
      onPanResponderTerminate: () => {
        initialPinchDistRef.current = null;
      },
    })
  ).current;

  // Transition to Area Detail View
  const handleSelectArea = (area) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedArea(area);
    setHighlightedWardId(area.id);
    setAreaAssets([]);
    setSelectedIssueId(null);
    const initialFilters = {
      sortBy: 'urgency',
      sectors: [],
      severities: [],
      statuses: [],
    };
    setAppliedFilters(initialFilters);
    setDraftFilters(initialFilters);
  };

  // Transition back to Map Discovery View
  const handleBackToMap = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedArea(null);
  };

  // Home can deep-link the map to a specific ward.
  useEffect(() => {
    if (initialHandledRef.current || !initialArea || wards.length === 0) return;
    const targetName = (initialArea.name || '').toUpperCase();
    const match = wards.find(
      (ward) =>
        ward.id === initialArea.id ||
        ward.fullName === initialArea.wardName ||
        ward.name.toUpperCase() === targetName
    );
    if (match) {
      initialHandledRef.current = true;
      handleSelectArea(match);
      onAreaConsumed?.();
    }
  }, [initialArea, wards]);

  const handleOpenWardFilterModal = () => {
    setDraftWardFilters({ ...appliedWardFilters });
    setWardFilterModalVisible(true);
  };

  const handleApplyWardFilterModal = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAppliedWardFilters({ ...draftWardFilters });
    setWardFilterModalVisible(false);
  };

  const handleResetDraftWardFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDraftWardFilters({
      sortBy: 'distance',
      riskLevels: [],
      maxDistance: 'any',
      zones: [],
      sectors: [],
    });
  };

  const handleClearAllAppliedWardFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const reset = {
      sortBy: 'distance',
      riskLevels: [],
      maxDistance: 'any',
      zones: [],
      sectors: [],
    };
    setAppliedWardFilters(reset);
    setDraftWardFilters(reset);
  };

  const handleRemoveSingleWardFilter = (type, value) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (type === 'sortBy') {
      setAppliedWardFilters((prev) => ({ ...prev, sortBy: 'distance' }));
    } else if (type === 'maxDistance') {
      setAppliedWardFilters((prev) => ({ ...prev, maxDistance: 'any' }));
    } else {
      setAppliedWardFilters((prev) => ({
        ...prev,
        [type]: prev[type].filter((item) => item !== value),
      }));
    }
  };

  const toggleDraftWardArrayItem = (type, value) => {
    setDraftWardFilters((prev) => {
      const exists = prev[type].includes(value);
      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((item) => item !== value)
          : [...prev[type], value],
      };
    });
  };

  // Active applied ward filter count (excluding default distance sort)
  const activeWardFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedWardFilters.sortBy !== 'distance') count += 1;
    count += appliedWardFilters.riskLevels.length;
    if (appliedWardFilters.maxDistance !== 'any') count += 1;
    count += appliedWardFilters.zones.length;
    count += appliedWardFilters.sectors.length;
    return count;
  }, [appliedWardFilters]);

  // Dynamic preview match count inside Ward Filter Modal
  const draftWardMatchCount = useMemo(() => {
    let list = wards.filter((ward) => {
      if (draftWardFilters.riskLevels.length > 0) {
        const flags = ward.openFlags || 0;
        const matchesRisk = draftWardFilters.riskLevels.some((risk) => {
          if (risk === 'critical') return flags > 2;
          if (risk === 'moderate') return flags >= 1 && flags <= 2;
          if (risk === 'clear') return flags === 0;
          return false;
        });
        if (!matchesRisk) return false;
      }

      if (draftWardFilters.zones.length > 0) {
        const wardZoneLower = (ward.zone || '').toLowerCase();
        const matchesZone = draftWardFilters.zones.some((z) => wardZoneLower.includes(z.toLowerCase()));
        if (!matchesZone) return false;
      }

      if (draftWardFilters.maxDistance !== 'any') {
        const maxDist = parseFloat(draftWardFilters.maxDistance);
        if (ward.distanceKm != null && ward.distanceKm > maxDist) return false;
      }

      if (draftWardFilters.sectors.length > 0) {
        const wardSectors = (ward.assets || []).map((a) => a.sector);
        const hasSector = draftWardFilters.sectors.some((s) => wardSectors.includes(s));
        if (!hasSector) return false;
      }

      return true;
    });
    return list.length;
  }, [draftWardFilters, wards]);

  // Filtered wards for Discovery view
  const filteredWards = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    let list = wards.filter((ward) => {
      if (query) {
        const matchesName = (ward.name || '').toLowerCase().includes(query);
        const matchesNum = (ward.wardNumber || '').toLowerCase().includes(query);
        const matchesZone = (ward.zone || '').toLowerCase().includes(query);
        const matchesAsset = (ward.assets || []).some(
          (a) => (a.title || '').toLowerCase().includes(query) || (a.sector || '').toLowerCase().includes(query)
        );
        if (!matchesName && !matchesNum && !matchesZone && !matchesAsset) return false;
      }

      if (appliedWardFilters.riskLevels.length > 0) {
        const flags = ward.openFlags || 0;
        const matchesRisk = appliedWardFilters.riskLevels.some((risk) => {
          if (risk === 'critical') return flags > 2;
          if (risk === 'moderate') return flags >= 1 && flags <= 2;
          if (risk === 'clear') return flags === 0;
          return false;
        });
        if (!matchesRisk) return false;
      }

      if (appliedWardFilters.zones.length > 0) {
        const wardZoneLower = (ward.zone || '').toLowerCase();
        const matchesZone = appliedWardFilters.zones.some((z) => wardZoneLower.includes(z.toLowerCase()));
        if (!matchesZone) return false;
      }

      if (appliedWardFilters.maxDistance !== 'any') {
        const maxDist = parseFloat(appliedWardFilters.maxDistance);
        if (ward.distanceKm != null && ward.distanceKm > maxDist) return false;
      }

      if (appliedWardFilters.sectors.length > 0) {
        const wardSectors = (ward.assets || []).map((a) => a.sector);
        const hasSector = appliedWardFilters.sectors.some((s) => wardSectors.includes(s));
        if (!hasSector) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (appliedWardFilters.sortBy === 'distance') {
        const distA = a.distanceKm;
        const distB = b.distanceKm;
        if (distA == null && distB == null) return (a.name || '').localeCompare(b.name || '');
        if (distA == null) return 1;
        if (distB == null) return -1;
        return distA - distB;
      }
      if (appliedWardFilters.sortBy === 'flags_high') {
        return (b.openFlags || 0) - (a.openFlags || 0);
      }
      if (appliedWardFilters.sortBy === 'health_low') {
        return (a.healthScore || 0) - (b.healthScore || 0);
      }
      if (appliedWardFilters.sortBy === 'health_high') {
        return (b.healthScore || 0) - (a.healthScore || 0);
      }
      if (appliedWardFilters.sortBy === 'coverage') {
        const covA = parseFloat(a.coverage || 0);
        const covB = parseFloat(b.coverage || 0);
        return covB - covA;
      }
      if (appliedWardFilters.sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [searchQuery, appliedWardFilters, wards]);

  // Active applied filter count (excluding default urgency sort)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.sortBy !== 'urgency') count += 1;
    count += appliedFilters.sectors.length;
    count += appliedFilters.severities.length;
    count += appliedFilters.statuses.length;
    return count;
  }, [appliedFilters]);

  // Filtered and sorted assets/problems in Selected Area view
  const currentAssets = useMemo(() => {
    if (!selectedArea) return [];
    let list = [...areaAssets];

    // 1. Sector/Category Filter
    if (appliedFilters.sectors.length > 0) {
      list = list.filter((a) => appliedFilters.sectors.includes(a.sector));
    }

    // 2. Severity Level Filter
    if (appliedFilters.severities.length > 0) {
      list = list.filter((a) => appliedFilters.severities.includes(a.severity));
    }

    // 3. Status Filter
    if (appliedFilters.statuses.length > 0) {
      list = list.filter((a) => appliedFilters.statuses.includes(a.status));
    }

    // 4. Sort
    return list.sort((a, b) => {
      if (appliedFilters.sortBy === 'urgency') {
        const severityRank = {
          'Critical Defect': 4,
          'High Severity': 3,
          Moderate: 2,
          Compliant: 1,
        };
        const statusRank = {
          'Action Required': 3,
          'Needs Review': 2,
          Verified: 1,
        };
        const diffStatus =
          (statusRank[b.status] || 0) - (statusRank[a.status] || 0);
        if (diffStatus !== 0) return diffStatus;
        return (
          (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
        );
      }
      if (appliedFilters.sortBy === 'category') {
        return (a.sector || '').localeCompare(b.sector || '');
      }
      return 0; // Default / Recent order
    });
  }, [selectedArea, areaAssets, appliedFilters]);

  // Draft preview results count inside filter modal
  const draftPreviewCount = useMemo(() => {
    if (!selectedArea) return 0;
    let list = [...areaAssets];
    if (draftFilters.sectors.length > 0) {
      list = list.filter((a) => draftFilters.sectors.includes(a.sector));
    }
    if (draftFilters.severities.length > 0) {
      list = list.filter((a) => draftFilters.severities.includes(a.severity));
    }
    if (draftFilters.statuses.length > 0) {
      list = list.filter((a) => draftFilters.statuses.includes(a.status));
    }
    return list.length;
  }, [selectedArea, areaAssets, draftFilters]);

  // Filter Modal Actions
  const handleOpenFilterModal = () => {
    setDraftFilters({ ...appliedFilters });
    setFilterModalVisible(true);
  };

  const handleApplyFilterModal = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAppliedFilters({ ...draftFilters });
    setFilterModalVisible(false);
  };

  const handleResetDraftFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDraftFilters({
      sortBy: 'urgency',
      sectors: [],
      severities: [],
      statuses: [],
    });
  };

  const handleClearAllAppliedFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const reset = {
      sortBy: 'urgency',
      sectors: [],
      severities: [],
      statuses: [],
    };
    setAppliedFilters(reset);
    setDraftFilters(reset);
  };

  const handleRemoveSingleFilter = (type, value) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (type === 'sortBy') {
      setAppliedFilters((prev) => ({ ...prev, sortBy: 'urgency' }));
    } else {
      setAppliedFilters((prev) => ({
        ...prev,
        [type]: prev[type].filter((item) => item !== value),
      }));
    }
  };

  const toggleDraftArrayItem = (type, value) => {
    setDraftFilters((prev) => {
      const exists = prev[type].includes(value);
      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((item) => item !== value)
          : [...prev[type], value],
      };
    });
  };

  // Compute visible dynamic map tiles for discovery map
  const visibleTiles = useMemo(() => {
    const z = Math.min(Math.max(Math.floor(mapZoom), Math.floor(MIN_ZOOM)), Math.floor(MAX_ZOOM));
    const scale = Math.pow(2, mapZoom - z);
    const scaledTileSize = TILE_SIZE * scale;

    const centerTileX = lon2tile(mapCenter.lon, z);
    const centerTileY = lat2tile(mapCenter.lat, z);

    const halfW = SCREEN_WIDTH / 2;
    const halfH = MAP_HEIGHT / 2;

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
          id: `tile-${z}-${x}-${y}`,
          z,
          x,
          y,
          left,
          top,
          size: scaledTileSize,
        });
      }
    }
    return tiles;
  }, [mapCenter.lat, mapCenter.lon, mapZoom]);


  // =========================================================================
  // RENDER 1: 42% DYNAMIC REAL MAP ON TOP + 58% SURROUNDING AREAS LIST ON BOTTOM
  // =========================================================================
  if (selectedIssueId) {
    const asset = areaAssets.find((item) => item.issueId === selectedIssueId);
    const category =
      categories.find((item) => item.id === asset?.categoryId) || {
        id: asset?.categoryId || 'civic',
        name: 'Civic Issue',
        shortName: 'Civic',
        icon: 'alert-circle-outline',
        color: COLORS.brandGreen,
        checkpoints: [],
      };
    return (
      <IssueDetailScreen
        issueId={selectedIssueId}
        category={category}
        onBack={() => setSelectedIssueId(null)}
      />
    );
  }

  if (!selectedArea) {
    const z = Math.min(Math.max(Math.floor(mapZoom), Math.floor(MIN_ZOOM)), Math.floor(MAX_ZOOM));
    const scale = Math.pow(2, mapZoom - z);
    const scaledTileSize = TILE_SIZE * scale;
    const centerTileX = lon2tile(mapCenter.lon, z);
    const centerTileY = lat2tile(mapCenter.lat, z);
    const halfW = SCREEN_WIDTH / 2;
    const halfH = MAP_HEIGHT / 2;
    const overlayScale = Math.pow(2, mapZoom - BOUNDARY_ZOOM);
    const overlayTx = halfW - lon2tile(mapCenter.lon, BOUNDARY_ZOOM) * TILE_SIZE * overlayScale;
    const overlayTy = halfH - lat2tile(mapCenter.lat, BOUNDARY_ZOOM) * TILE_SIZE * overlayScale;

    return (
      <View style={styles.container}>
        {/* Top of Screen: Dynamic Multi-Level Real Map */}
        <View style={styles.topMapContainer} {...mapPanResponder.panHandlers}>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {visibleTiles.map((tile) => (
              <DynamicMapTile
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

          {/* GHMC ward boundaries (155 wards) */}
          {wards.length > 0 && (
            <Svg
              style={StyleSheet.absoluteFillObject}
              width={SCREEN_WIDTH}
              height={MAP_HEIGHT}
              pointerEvents="none"
            >
              <G transform={`translate(${overlayTx} ${overlayTy}) scale(${overlayScale})`}>
                {filteredWards.map((ward) => {
                  const path = wardPaths[ward.id];
                  if (!path) return null;
                  const isSelected = highlightedWardId === ward.id;
                  return (
                    <Path
                      key={`boundary-${ward.id}`}
                      d={path}
                      fill={isSelected ? 'rgba(22, 163, 74, 0.22)' : 'rgba(22, 163, 74, 0.06)'}
                      stroke={isSelected ? '#15803D' : 'rgba(21, 128, 61, 0.45)'}
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                      fillRule="evenodd"
                    />
                  );
                })}
              </G>
            </Svg>
          )}

          {/* Markers on Discovery Map */}
          {filteredWards.map((ward) => {
            const isSelected = highlightedWardId === ward.id;
            if (!isSelected && filteredWards.length > 40) return null;
            const wardTileX = lon2tile(ward.lon, z);
            const wardTileY = lat2tile(ward.lat, z);
            const screenX = halfW + (wardTileX - centerTileX) * scaledTileSize;
            const screenY = halfH + (wardTileY - centerTileY) * scaledTileSize;

            if (
              screenX < -100 ||
              screenX > SCREEN_WIDTH + 100 ||
              screenY < -100 ||
              screenY > MAP_HEIGHT + 100
            ) {
              return null;
            }

            return (
              <TouchableOpacity
                key={ward.id}
                style={[
                  styles.mapPinAnchor,
                  {
                    left: Math.round(screenX),
                    top: Math.round(screenY),
                  },
                ]}
                onPress={() => {
                  centerMapOnWard(ward);
                  handleSelectArea(ward);
                }}
                activeOpacity={0.8}
              >
                {isSelected && <View style={styles.mapPinPulseRing} />}

                <View
                  style={[
                    styles.mapPinPill,
                    isSelected && styles.mapPinPillSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.mapPinDot,
                      isSelected && styles.mapPinDotSelected,
                      ward.openFlags > 2 && { backgroundColor: '#DC2626' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.mapPinText,
                      isSelected && styles.mapPinTextSelected,
                    ]}
                  >
                    {ward.wardNumber ? `W-${ward.wardNumber} ` : ''}{ward.name}
                  </Text>
                  {ward.openFlags > 0 && (
                    <View style={styles.mapPinFlagsPill}>
                      <Text style={styles.mapPinFlagsText}>{ward.openFlags}</Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.mapPinTriangle,
                    isSelected && styles.mapPinTriangleSelected,
                  ]}
                />
              </TouchableOpacity>
            );
          })}


          {wardLoadState !== 'ready' && (
            <View style={styles.mapWardStatus} pointerEvents="none">
              <Text style={styles.mapWardStatusText}>
                {wardLoadState === 'loading' && 'Loading Hyderabad wards…'}
                {wardLoadState === 'error' && 'Could not load Hyderabad wards from the API'}
                {wardLoadState === 'unconfigured' &&
                  'Set EXPO_PUBLIC_API_URL to load Hyderabad wards'}
              </Text>
            </View>
          )}

          <Text style={styles.mapAttribution} pointerEvents="none">
            {MAP_ATTRIBUTION}
          </Text>

          {/* Floating Top Left Controls (Hyderabad) */}
          <View style={styles.mapFloatingTopLeft}>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={handleViewCity}
              activeOpacity={0.7}
              accessibilityLabel="View Hyderabad"
            >
              <Ionicons name="globe-outline" size={18} color={COLORS.charcoal} />
            </TouchableOpacity>
          </View>

          {/* Floating Map Controls */}
          <View style={styles.mapFloatingControls}>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={19} color={COLORS.charcoal} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={19} color={COLORS.charcoal} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={handleRecenter}
              activeOpacity={0.7}
            >
              <Ionicons name="locate" size={18} color={COLORS.brandGreen} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Sheet: Surrounding Areas List */}
        <View style={styles.bottomSheetContainer}>
          <View style={styles.sheetHandleBar} />

          {/* Unified Controls Row: [ Search Bar (flex: 1) ] [ Filter Icon Button ] */}
          <View style={styles.discoveryHeaderRow}>
            {/* Search Bar (Takes remaining available width) */}
            <View style={styles.rowSearchBarWrapper}>
              <Ionicons
                name="search"
                size={16}
                color="#9CA3AF"
                style={styles.rowSearchIcon}
              />
              <TextInput
                style={styles.rowSearchInput}
                placeholder="Search ward name, number, or zone..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
                onSubmitEditing={() => {
                  if (filteredWards.length) {
                    centerMapOnWard(filteredWards[0]);
                    handleSelectArea(filteredWards[0]);
                  }
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Icon Button */}
            <TouchableOpacity
              style={[
                styles.rowFilterIconButton,
                activeWardFiltersCount > 0 && styles.rowFilterIconButtonActive,
              ]}
              onPress={handleOpenWardFilterModal}
              activeOpacity={0.75}
              accessibilityLabel="Filter Wards"
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={activeWardFiltersCount > 0 ? '#FFFFFF' : COLORS.charcoal}
              />
              {activeWardFiltersCount > 0 && (
                <View style={styles.rowFilterCountBadge}>
                  <Text style={styles.rowFilterCountText}>{activeWardFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Active Filter Chips / Tags Bar (Tap to dismiss individual filter) */}
          {activeWardFiltersCount > 0 && (
            <View style={styles.activeWardFilterTagsRow}>
              {appliedWardFilters.sortBy !== 'distance' && (
                <TouchableOpacity
                  style={styles.activeFilterTag}
                  onPress={() => handleRemoveSingleWardFilter('sortBy', null)}
                >
                  <Text style={styles.activeFilterTagText}>
                    Sort: {WARD_FILTER_SORT_OPTIONS.find((o) => o.id === appliedWardFilters.sortBy)?.label}
                  </Text>
                  <Ionicons name="close" size={12} color="#64748B" />
                </TouchableOpacity>
              )}
              {appliedWardFilters.riskLevels.map((risk) => {
                const label = WARD_FILTER_RISK_OPTIONS.find((o) => o.id === risk)?.label || risk;
                return (
                  <TouchableOpacity
                    key={risk}
                    style={styles.activeFilterTag}
                    onPress={() => handleRemoveSingleWardFilter('riskLevels', risk)}
                  >
                    <Text style={styles.activeFilterTagText}>{label}</Text>
                    <Ionicons name="close" size={12} color="#64748B" />
                  </TouchableOpacity>
                );
              })}
              {appliedWardFilters.maxDistance !== 'any' && (
                <TouchableOpacity
                  style={styles.activeFilterTag}
                  onPress={() => handleRemoveSingleWardFilter('maxDistance', null)}
                >
                  <Text style={styles.activeFilterTagText}>
                    Distance: ≤ {appliedWardFilters.maxDistance} km
                  </Text>
                  <Ionicons name="close" size={12} color="#64748B" />
                </TouchableOpacity>
              )}
              {appliedWardFilters.zones.map((zone) => {
                return (
                  <TouchableOpacity
                    key={zone}
                    style={styles.activeFilterTag}
                    onPress={() => handleRemoveSingleWardFilter('zones', zone)}
                  >
                    <Text style={styles.activeFilterTagText}>{zone}</Text>
                    <Ionicons name="close" size={12} color="#64748B" />
                  </TouchableOpacity>
                );
              })}
              {appliedWardFilters.sectors.map((sec) => {
                return (
                  <TouchableOpacity
                    key={sec}
                    style={styles.activeFilterTag}
                    onPress={() => handleRemoveSingleWardFilter('sectors', sec)}
                  >
                    <Text style={styles.activeFilterTagText}>{sec}</Text>
                    <Ionicons name="close" size={12} color="#64748B" />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.clearAllTagsBtn}
                onPress={handleClearAllAppliedWardFilters}
              >
                <Text style={styles.clearAllTagsText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Ward List */}
          <FlatList
            data={filteredWards}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.wardListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = highlightedWardId === item.id;

              return (
                <TouchableOpacity
                  style={[styles.wardCard, isSelected && styles.wardCardSelected]}
                  onPress={() => {
                    centerMapOnWard(item);
                    handleSelectArea(item);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.wardCardTopRow}>
                    <View style={styles.wardNumberBadge}>
                      <Text style={styles.wardNumberText}>W-{item.wardNumber}</Text>
                    </View>
                    <View style={styles.wardCardTitleBlock}>
                      <Text style={styles.wardCardTitle}>{item.name}</Text>
                      <Text style={styles.wardCardZone}>{item.zone}</Text>
                    </View>
                    <View style={styles.healthScorePill}>
                      <Ionicons name="shield-checkmark" size={13} color={COLORS.brandGreen} />
                      <Text style={styles.healthScoreText}>
                        {item.healthScore == null ? '—' : `${item.healthScore}%`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.wardCardDivider} />

                  <View style={styles.wardCardBottomRow}>
                    <View style={styles.wardMetaItem}>
                      <Ionicons name="location-outline" size={14} color={COLORS.subtext} />
                      <Text style={styles.wardMetaText}>{item.distance || 'Hyderabad'}</Text>
                    </View>

                    <View style={styles.wardMetaItem}>
                      <Ionicons name="business-outline" size={14} color={COLORS.subtext} />
                      <Text style={styles.wardMetaText}>{(item.assets || []).length} Nodes</Text>
                    </View>

                    {item.openFlags > 0 ? (
                      <View style={styles.wardBadgeIcon}>
                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        <View style={styles.badgeCountDot}>
                          <Text style={styles.badgeCountText}>{item.openFlags}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.wardBadgeIcon}>
                        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                      </View>
                    )}

                    <Ionicons name="chevron-forward" size={16} color={COLORS.muted} style={styles.chevron} />
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={38} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>No matching wards found</Text>
                <Text style={styles.emptySubtitle}>
                  Try relaxing your risk, zone, or distance filters.
                </Text>
                {activeWardFiltersCount > 0 && (
                  <TouchableOpacity
                    style={[styles.amazonApplyBottomBtn, { marginTop: 14, paddingHorizontal: 20, height: 40 }]}
                    onPress={handleClearAllAppliedWardFilters}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
                    <Text style={[styles.amazonApplyBottomBtnText, { fontSize: 13 }]}>Reset All Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        </View>

        {/* ===================================================================
            WARD FILTER & SORT MODAL (PROFESSIONAL TWO-COLUMN PANEL)
           =================================================================== */}
        <Modal
          visible={wardFilterModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setWardFilterModalVisible(false)}
        >
          <View style={styles.amazonModalOverlay}>
            <View style={styles.amazonFilterSheet}>
              {/* Modal Header */}
              <View style={styles.amazonModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="options-outline" size={20} color={COLORS.charcoal} />
                  <Text style={styles.amazonModalTitle}>Filter Wards</Text>
                </View>
                <TouchableOpacity
                  style={styles.amazonCloseBtn}
                  onPress={() => setWardFilterModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={COLORS.charcoal} />
                </TouchableOpacity>
              </View>

              {/* Two-Column Amazon-Style Layout */}
              <View style={styles.amazonTwoColumnContainer}>
                {/* LEFT COLUMN: INDEX TABS */}
                <View style={styles.amazonIndexColumn}>
                  {[
                    {
                      id: 'sortBy',
                      label: 'Sort',
                      badgeCount: draftWardFilters.sortBy !== 'distance' ? 1 : 0,
                    },
                    {
                      id: 'risk',
                      label: 'Risk Level',
                      badgeCount: draftWardFilters.riskLevels.length,
                    },
                    {
                      id: 'distance',
                      label: 'Distance',
                      badgeCount: draftWardFilters.maxDistance !== 'any' ? 1 : 0,
                    },
                    {
                      id: 'zones',
                      label: 'Zones',
                      badgeCount: draftWardFilters.zones.length,
                    },
                  ].map((tab) => {
                    const isActive = wardFilterActiveTab === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={[
                          styles.amazonIndexTab,
                          isActive && styles.amazonIndexTabActive,
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setWardFilterActiveTab(tab.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.amazonIndexTabContent}>
                          <Text
                            style={[
                              styles.amazonIndexTabText,
                              isActive && styles.amazonIndexTabTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {tab.label}
                          </Text>
                        </View>
                        {tab.badgeCount > 0 && (
                          <View style={styles.amazonIndexBadge}>
                            <Text style={styles.amazonIndexBadgeText}>{tab.badgeCount}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* RIGHT COLUMN: OPTIONS VIEW */}
                <View style={styles.amazonOptionsColumn}>
                  <ScrollView
                    style={styles.amazonOptionsScroll}
                    contentContainerStyle={styles.amazonOptionsScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* TAB 1: SORT BY OPTIONS */}
                    {wardFilterActiveTab === 'sortBy' && (
                      <View style={styles.amazonOptionsSection}>
                        <Text style={styles.amazonOptionsHeading}>SORT WARDS BY</Text>
                        <View style={styles.amazonOptionsList}>
                          {WARD_FILTER_SORT_OPTIONS.map((opt) => {
                            const isSelected = draftWardFilters.sortBy === opt.id;
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[
                                  styles.amazonOptionRow,
                                  isSelected && styles.amazonOptionRowSelected,
                                ]}
                                onPress={() =>
                                  setDraftWardFilters((prev) => ({ ...prev, sortBy: opt.id }))
                                }
                                activeOpacity={0.7}
                              >
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <Text
                                    style={[
                                      styles.amazonOptionLabel,
                                      isSelected && styles.amazonOptionLabelSelected,
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                  <Text style={styles.wardOptionSubtitle}>
                                    {opt.subtitle}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.amazonRadioOuterCircle,
                                    isSelected && styles.amazonRadioOuterSelected,
                                  ]}
                                >
                                  {isSelected && <View style={styles.amazonRadioInnerDot} />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* TAB 2: RISK LEVEL */}
                    {wardFilterActiveTab === 'risk' && (
                      <View style={styles.amazonOptionsSection}>
                        <View style={styles.amazonOptionsHeaderRow}>
                          <Text style={styles.amazonOptionsHeading}>AUDIT RISK LEVEL</Text>
                          {draftWardFilters.riskLevels.length > 0 && (
                            <TouchableOpacity
                              onPress={() =>
                                setDraftWardFilters((prev) => ({ ...prev, riskLevels: [] }))
                              }
                            >
                              <Text style={styles.amazonQuickActionText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.amazonOptionsList}>
                          {WARD_FILTER_RISK_OPTIONS.map((opt) => {
                            const isChecked = draftWardFilters.riskLevels.includes(opt.id);
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[
                                  styles.amazonOptionRow,
                                  isChecked && styles.amazonOptionRowSelected,
                                ]}
                                onPress={() => toggleDraftWardArrayItem('riskLevels', opt.id)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: opt.color }} />
                                    <Text
                                      style={[
                                        styles.amazonOptionLabel,
                                        isChecked && styles.amazonOptionLabelSelected,
                                      ]}
                                    >
                                      {opt.label}
                                    </Text>
                                  </View>
                                  <Text style={styles.wardOptionSubtitle}>
                                    {opt.subtitle}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.amazonCheckboxSquare,
                                    isChecked && styles.amazonCheckboxSquareChecked,
                                  ]}
                                >
                                  {isChecked && (
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* TAB 3: DISTANCE RADIUS */}
                    {wardFilterActiveTab === 'distance' && (
                      <View style={styles.amazonOptionsSection}>
                        <Text style={styles.amazonOptionsHeading}>MAX DISTANCE RADIUS</Text>
                        <View style={styles.amazonOptionsList}>
                          {WARD_FILTER_DISTANCE_OPTIONS.map((opt) => {
                            const isSelected = draftWardFilters.maxDistance === opt.id;
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[
                                  styles.amazonOptionRow,
                                  isSelected && styles.amazonOptionRowSelected,
                                ]}
                                onPress={() =>
                                  setDraftWardFilters((prev) => ({ ...prev, maxDistance: opt.id }))
                                }
                                activeOpacity={0.7}
                              >
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <Text
                                    style={[
                                      styles.amazonOptionLabel,
                                      isSelected && styles.amazonOptionLabelSelected,
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                  <Text style={styles.wardOptionSubtitle}>
                                    {opt.subtitle}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.amazonRadioOuterCircle,
                                    isSelected && styles.amazonRadioOuterSelected,
                                  ]}
                                >
                                  {isSelected && <View style={styles.amazonRadioInnerDot} />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* TAB 4: ZONES */}
                    {wardFilterActiveTab === 'zones' && (
                      <View style={styles.amazonOptionsSection}>
                        <View style={styles.amazonOptionsHeaderRow}>
                          <Text style={styles.amazonOptionsHeading}>JURISDICTION ZONE</Text>
                          {draftWardFilters.zones.length > 0 && (
                            <TouchableOpacity
                              onPress={() =>
                                setDraftWardFilters((prev) => ({ ...prev, zones: [] }))
                              }
                            >
                              <Text style={styles.amazonQuickActionText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.amazonOptionsList}>
                          {zoneOptions.map((opt) => {
                            const isChecked = draftWardFilters.zones.includes(opt.id);
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[
                                  styles.amazonOptionRow,
                                  isChecked && styles.amazonOptionRowSelected,
                                ]}
                                onPress={() => toggleDraftWardArrayItem('zones', opt.id)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <Text
                                    style={[
                                      styles.amazonOptionLabel,
                                      isChecked && styles.amazonOptionLabelSelected,
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                  <Text style={styles.wardOptionSubtitle}>
                                    {opt.subtitle}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.amazonCheckboxSquare,
                                    isChecked && styles.amazonCheckboxSquareChecked,
                                  ]}
                                >
                                  {isChecked && (
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* TAB 5: SECTORS */}
                    {wardFilterActiveTab === 'sectors' && (
                      <View style={styles.amazonOptionsSection}>
                        <View style={styles.amazonOptionsHeaderRow}>
                          <Text style={styles.amazonOptionsHeading}>INFRASTRUCTURE DEFECTS</Text>
                          {draftWardFilters.sectors.length > 0 && (
                            <TouchableOpacity
                              onPress={() =>
                                setDraftWardFilters((prev) => ({ ...prev, sectors: [] }))
                              }
                            >
                              <Text style={styles.amazonQuickActionText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.amazonOptionsList}>
                          {WARD_FILTER_SECTOR_OPTIONS.map((opt) => {
                            const isChecked = draftWardFilters.sectors.includes(opt.id);
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[
                                  styles.amazonOptionRow,
                                  isChecked && styles.amazonOptionRowSelected,
                                ]}
                                onPress={() => toggleDraftWardArrayItem('sectors', opt.id)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
                                  <Ionicons name={opt.icon} size={16} color={COLORS.charcoal} />
                                  <Text
                                    style={[
                                      styles.amazonOptionLabel,
                                      isChecked && styles.amazonOptionLabelSelected,
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.amazonCheckboxSquare,
                                    isChecked && styles.amazonCheckboxSquareChecked,
                                  ]}
                                >
                                  {isChecked && (
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>

              {/* Sticky Bottom Action Bar */}
              <View style={styles.amazonModalBottomBar}>
                <TouchableOpacity
                  style={styles.amazonClearBottomBtn}
                  onPress={handleResetDraftWardFilters}
                  activeOpacity={0.7}
                >
                  <Text style={styles.amazonClearBottomBtnText}>Clear All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.amazonApplyBottomBtn}
                  onPress={handleApplyWardFilterModal}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-sharp" size={17} color="#FFFFFF" />
                  <Text style={styles.amazonApplyBottomBtnText}>
                    Apply ({draftWardMatchCount} {draftWardMatchCount === 1 ? 'Ward' : 'Wards'})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // =========================================================================
  // RENDER 2: SELECTED AREA VIEW (EXACT MATCH TO USER'S HAND-DRAWN SKETCH)
  // [ AREA NAME + HATCHED BOX ] vs [ MAP + REAL OSM MINI-MAP ]
  // [ DIVIDER LINE ]
  // [ SUMMARY BANNER STRIP ]
  // [ DOWNWARD SCROLLABLE LIST OF AUDITED PROBLEM CARDS ]
  // =========================================================================
  return (
    <View style={styles.container}>
      {/* Top Bar with Switch/Back button */}
      <View style={styles.sketchTopNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToMap}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.charcoal} />
          <Text style={styles.backButtonText}>Back to Map</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.sketchScrollView}
        contentContainerStyle={styles.sketchScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================================================================
            SECTION 1: TOP SPLIT HEADER
            [ AREA TITLE + INFO ]   vs   [ REAL MINI-MAP ]
           =================================================================== */}
        <View style={styles.sketchSplitHeader}>
          {/* LEFT COLUMN: Area Name & Clean Subtitles */}
          <View style={styles.sketchHeaderLeftCol}>
            <Text style={styles.sketchAreaTitle}>{selectedArea.name}</Text>
            <Text style={styles.sketchWardSubtitle}>Ward {selectedArea.wardNumber || '—'} • {selectedArea.zone}</Text>

            {/* Quick Informative Badges */}
            <View style={styles.cleanStatsRow}>
              <View style={styles.cleanStatPill}>
                <Ionicons name="shield-checkmark" size={13} color={COLORS.brandGreen} />
                <Text style={styles.cleanStatText}>
                  {selectedArea.healthScore == null ? '—' : `${selectedArea.healthScore}%`} Health
                </Text>
              </View>
              <View style={styles.cleanStatPill}>
                <Ionicons name="business-outline" size={13} color={COLORS.charcoal} />
                <Text style={styles.cleanStatText}>{areaAssets.length} Reports</Text>
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN: Real Live OSM Mini-Map Preview Widget */}
          <View style={styles.sketchHeaderRightCol}>
            <RealMiniMapPreview ward={selectedArea} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.sketchDividerLine} />

        {/* ===================================================================
            SECTION 2: SCROLLABLE LIST OF AUDITED PROBLEM CARDS
           =================================================================== */}
        {/* Title & Amazon-style Filter/Sort Trigger Button */}
        <View style={styles.sketchListHeaderRow}>
          <View style={styles.sketchListHeaderLeft}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.brandGreen} />
            <Text style={styles.sketchListHeaderTitle} numberOfLines={1}>
              REPORTED ISSUES ({currentAssets.length})
            </Text>
          </View>

          {/* Filter Action Button */}
          <TouchableOpacity
            style={[
              styles.amazonFilterButton,
              activeFiltersCount > 0 && styles.amazonFilterButtonActive,
            ]}
            onPress={handleOpenFilterModal}
            activeOpacity={0.75}
          >
            <Ionicons
              name="options-outline"
              size={13}
              color={COLORS.charcoal}
            />
            <Text style={styles.amazonFilterButtonText}>
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips / Tags Bar (Tap to dismiss individual filter) */}
        {activeFiltersCount > 0 && (
          <View style={styles.activeFilterTagsRow}>
            {appliedFilters.sortBy !== 'urgency' && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => handleRemoveSingleFilter('sortBy', null)}
              >
                <Text style={styles.activeFilterTagText}>
                  Sort: {FILTER_SORT_OPTIONS.find((o) => o.id === appliedFilters.sortBy)?.label || appliedFilters.sortBy}
                </Text>
                <Ionicons name="close" size={12} color={COLORS.charcoal} />
              </TouchableOpacity>
            )}
            {appliedFilters.sectors.map((sector) => {
              const label = FILTER_SECTOR_OPTIONS.find((o) => o.id === sector)?.label || sector;
              return (
                <TouchableOpacity
                  key={sector}
                  style={styles.activeFilterTag}
                  onPress={() => handleRemoveSingleFilter('sectors', sector)}
                >
                  <Text style={styles.activeFilterTagText}>{label}</Text>
                  <Ionicons name="close" size={12} color={COLORS.charcoal} />
                </TouchableOpacity>
              );
            })}
            {appliedFilters.severities.map((sev) => {
              const label = FILTER_SEVERITY_OPTIONS.find((o) => o.id === sev)?.label || sev;
              return (
                <TouchableOpacity
                  key={sev}
                  style={styles.activeFilterTag}
                  onPress={() => handleRemoveSingleFilter('severities', sev)}
                >
                  <Text style={styles.activeFilterTagText}>{label}</Text>
                  <Ionicons name="close" size={12} color={COLORS.charcoal} />
                </TouchableOpacity>
              );
            })}
            {appliedFilters.statuses.map((st) => {
              const label = FILTER_STATUS_OPTIONS.find((o) => o.id === st)?.label || st;
              return (
                <TouchableOpacity
                  key={st}
                  style={styles.activeFilterTag}
                  onPress={() => handleRemoveSingleFilter('statuses', st)}
                >
                  <Text style={styles.activeFilterTagText}>{label}</Text>
                  <Ionicons name="close" size={12} color={COLORS.charcoal} />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.clearAllTagsBtn}
              onPress={handleClearAllAppliedFilters}
            >
              <Text style={styles.clearAllTagsText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {areaLoading && (
          <ActivityIndicator color={COLORS.brandGreen} style={{ marginVertical: 20 }} />
        )}

        {/* Problem Cards List or Empty Filter View */}
        {!areaLoading && currentAssets.length === 0 ? (
          <View style={styles.emptyFilterContainer}>
            <Ionicons name="filter-outline" size={32} color={COLORS.muted} />
            <Text style={styles.emptyFilterTitle}>No problems match your active filters</Text>
            <TouchableOpacity
              style={styles.emptyFilterResetBtn}
              onPress={handleClearAllAppliedFilters}
              activeOpacity={0.75}
            >
              <Text style={styles.emptyFilterResetText}>
                Reset All Filters ({areaAssets.length})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sketchAssetCardsContainer}>
            {currentAssets.map((asset) => {
              const isVerified = asset.status === 'Verified';
              const isActionRequired = asset.status === 'Action Required';

              return (
                <TouchableOpacity
                  key={asset.id}
                  style={styles.sketchAssetCard}
                  onPress={() => setSelectedAssetModal(asset)}
                  activeOpacity={0.85}
                >
                  {/* Left Side: Square Compressed Uploaded Image Preview */}
                  <View style={styles.problemSquareImageWrapper}>
                    {asset.imageUri ? (
                      <Image
                        source={{ uri: asset.imageUri }}
                        style={styles.problemSquareImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.problemSquareFallback,
                          isVerified && styles.assetIconVerified,
                          isActionRequired && styles.assetIconAction,
                        ]}
                      >
                        <Ionicons
                          name={asset.sectorIcon || 'business-outline'}
                          size={20}
                          color={
                            isVerified
                              ? COLORS.brandGreen
                              : isActionRequired
                                ? '#DC2626'
                                : '#D97706'
                          }
                        />
                      </View>
                    )}
                    {/* Mini Sector Indicator on bottom corner */}
                    <View style={styles.squareImageSectorPill}>
                      <Ionicons
                        name={asset.sectorIcon || 'business-outline'}
                        size={9}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>

                  {/* Middle Info */}
                  <View style={styles.assetCardInfoBlock}>
                    <View style={styles.assetTitleRow}>
                      <Text style={styles.assetTitle} numberOfLines={1}>
                        {asset.title}
                      </Text>
                    </View>

                    <Text style={styles.assetAddress} numberOfLines={1}>
                      {asset.address}
                    </Text>

                    <View style={styles.assetMetaRow}>
                      <View style={styles.assetSectorPill}>
                        <Text style={styles.assetSectorText}>
                          {(asset.sector || 'CIVIC').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.assetAuditTime}>• {asset.lastAudit || 'Recently'}</Text>
                    </View>
                  </View>

                  {/* Right Urgency Indicator Dot & Chevron */}
                  <View style={styles.assetCardRightCol}>
                    {isActionRequired && (
                      <View style={styles.urgencyDot} />
                    )}
                    <Ionicons name="chevron-forward" size={16} color={COLORS.muted} style={styles.assetChevron} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ===================================================================
          MODAL 1: AMAZON-STYLE FILTER & SORT PANEL
         =================================================================== */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.amazonModalOverlay}>
          <View style={styles.amazonFilterSheet}>
            {/* Modal Header */}
            <View style={styles.amazonModalHeader}>
              <Text style={styles.amazonModalTitle}>Filter</Text>
              <TouchableOpacity
                style={styles.amazonCloseBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>

            {/* Two-Column Amazon/Flipkart-style Filter Layout */}
            <View style={styles.amazonTwoColumnContainer}>
              {/* LEFT COLUMN: INDEX TABS */}
              <View style={styles.amazonIndexColumn}>
                {[
                  {
                    id: 'sortBy',
                    label: 'Sort',
                    badgeCount: draftFilters.sortBy !== 'urgency' ? 1 : 0,
                  },
                  {
                    id: 'sectors',
                    label: 'Category',
                    badgeCount: draftFilters.sectors.length,
                  },
                  {
                    id: 'severities',
                    label: 'Severity',
                    badgeCount: draftFilters.severities.length,
                  },
                  {
                    id: 'statuses',
                    label: 'Status',
                    badgeCount: draftFilters.statuses.length,
                  },
                ].map((tab) => {
                  const isActive = filterActiveTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[
                        styles.amazonIndexTab,
                        isActive && styles.amazonIndexTabActive,
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setFilterActiveTab(tab.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.amazonIndexTabContent}>
                        <Text
                          style={[
                            styles.amazonIndexTabText,
                            isActive && styles.amazonIndexTabTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {tab.label}
                        </Text>
                      </View>
                      {tab.badgeCount > 0 && (
                        <View style={styles.amazonIndexBadge}>
                          <Text style={styles.amazonIndexBadgeText}>{tab.badgeCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* RIGHT COLUMN: OPTIONS VIEW */}
              <View style={styles.amazonOptionsColumn}>
                <ScrollView
                  style={styles.amazonOptionsScroll}
                  contentContainerStyle={styles.amazonOptionsScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* TAB 1: SORT BY OPTIONS */}
                  {filterActiveTab === 'sortBy' && (
                    <View style={styles.amazonOptionsSection}>
                      <Text style={styles.amazonOptionsHeading}>SORT BY</Text>
                      <View style={styles.amazonOptionsList}>
                        {FILTER_SORT_OPTIONS.map((opt) => {
                          const isSelected = draftFilters.sortBy === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[
                                styles.amazonOptionRow,
                                isSelected && styles.amazonOptionRowSelected,
                              ]}
                              onPress={() =>
                                setDraftFilters((prev) => ({ ...prev, sortBy: opt.id }))
                              }
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.amazonOptionLabel,
                                  isSelected && styles.amazonOptionLabelSelected,
                                ]}
                              >
                                {opt.label}
                              </Text>
                              <View
                                style={[
                                  styles.amazonRadioOuterCircle,
                                  isSelected && styles.amazonRadioOuterSelected,
                                ]}
                              >
                                {isSelected && <View style={styles.amazonRadioInnerDot} />}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* TAB 2: PROBLEM CATEGORY / SECTOR OPTIONS */}
                  {filterActiveTab === 'sectors' && (
                    <View style={styles.amazonOptionsSection}>
                      <View style={styles.amazonOptionsHeaderRow}>
                        <Text style={styles.amazonOptionsHeading}>CATEGORY</Text>
                        {draftFilters.sectors.length > 0 && (
                          <TouchableOpacity
                            onPress={() =>
                              setDraftFilters((prev) => ({ ...prev, sectors: [] }))
                            }
                          >
                            <Text style={styles.amazonQuickActionText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.amazonOptionsList}>
                        {FILTER_SECTOR_OPTIONS.map((opt) => {
                          const isChecked = draftFilters.sectors.includes(opt.id);
                          const wardCount = (selectedArea?.assets || []).filter(
                            (a) => a.sector === opt.id
                          ).length;

                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[
                                styles.amazonOptionRow,
                                isChecked && styles.amazonOptionRowSelected,
                              ]}
                              onPress={() => toggleDraftArrayItem('sectors', opt.id)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.amazonOptionLeft}>
                                <View
                                  style={[
                                    styles.amazonCheckboxSquare,
                                    isChecked && styles.amazonCheckboxSquareChecked,
                                  ]}
                                >
                                  {isChecked && (
                                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.amazonOptionLabel,
                                    isChecked && styles.amazonOptionLabelSelected,
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </View>
                              <Text style={styles.amazonOptionCountText}>({wardCount})</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* TAB 3: SEVERITY LEVEL OPTIONS */}
                  {filterActiveTab === 'severities' && (
                    <View style={styles.amazonOptionsSection}>
                      <View style={styles.amazonOptionsHeaderRow}>
                        <Text style={styles.amazonOptionsHeading}>SEVERITY</Text>
                        {draftFilters.severities.length > 0 && (
                          <TouchableOpacity
                            onPress={() =>
                              setDraftFilters((prev) => ({ ...prev, severities: [] }))
                            }
                          >
                            <Text style={styles.amazonQuickActionText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.amazonOptionsList}>
                        {FILTER_SEVERITY_OPTIONS.map((opt) => {
                          const isChecked = draftFilters.severities.includes(opt.id);
                          const count = (selectedArea?.assets || []).filter(
                            (a) => a.severity === opt.id
                          ).length;

                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[
                                styles.amazonOptionRow,
                                isChecked && styles.amazonOptionRowSelected,
                              ]}
                              onPress={() => toggleDraftArrayItem('severities', opt.id)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.amazonOptionLeft}>
                                <View
                                  style={[
                                    styles.amazonCheckboxSquare,
                                    isChecked && styles.amazonCheckboxSquareChecked,
                                  ]}
                                >
                                  {isChecked && (
                                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.amazonOptionLabel,
                                    isChecked && styles.amazonOptionLabelSelected,
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </View>
                              <Text style={styles.amazonOptionCountText}>({count})</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* TAB 4: AUDIT STATUS OPTIONS */}
                  {filterActiveTab === 'statuses' && (
                    <View style={styles.amazonOptionsSection}>
                      <View style={styles.amazonOptionsHeaderRow}>
                        <Text style={styles.amazonOptionsHeading}>STATUS</Text>
                        {draftFilters.statuses.length > 0 && (
                          <TouchableOpacity
                            onPress={() =>
                              setDraftFilters((prev) => ({ ...prev, statuses: [] }))
                            }
                          >
                            <Text style={styles.amazonQuickActionText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.amazonOptionsList}>
                        {FILTER_STATUS_OPTIONS.map((opt) => {
                          const isChecked = draftFilters.statuses.includes(opt.id);
                          const count = (selectedArea?.assets || []).filter(
                            (a) => a.status === opt.id
                          ).length;

                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[
                                styles.amazonOptionRow,
                                isChecked && styles.amazonOptionRowSelected,
                              ]}
                              onPress={() => toggleDraftArrayItem('statuses', opt.id)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.amazonOptionLeft}>
                                <View
                                  style={[
                                    styles.amazonCheckboxSquare,
                                    isChecked && styles.amazonCheckboxSquareChecked,
                                  ]}
                                >
                                  {isChecked && (
                                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.amazonOptionLabel,
                                    isChecked && styles.amazonOptionLabelSelected,
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </View>
                              <Text style={styles.amazonOptionCountText}>({count})</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* Sticky Bottom Action Bar */}
            <View style={styles.amazonModalBottomBar}>
              <TouchableOpacity
                style={styles.amazonClearBottomBtn}
                onPress={handleResetDraftFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.amazonClearBottomBtnText}>Clear All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.amazonApplyBottomBtn}
                onPress={handleApplyFilterModal}
                activeOpacity={0.85}
              >
                <Text style={styles.amazonApplyBottomBtnText}>
                  Show {draftPreviewCount} Problems
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL 2: ASSET AUDIT & GEOTAG DETAILS
         =================================================================== */}
      <Modal
        visible={!!selectedAssetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAssetModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAssetModal && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalHeaderTitleBlock}>
                    <Text style={styles.modalSectorBadge}>
                      {(selectedAssetModal.sector || 'CIVIC').toUpperCase()}
                    </Text>
                    <Text style={styles.modalTitle}>{selectedAssetModal.title}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedAssetModal(null)}
                  >
                    <Ionicons name="close" size={20} color={COLORS.charcoal} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDetailsCard}>
                  {/* Uploaded Problem Photo in Modal */}
                  {selectedAssetModal.imageUri && (
                    <View style={styles.modalImageHeroWrapper}>
                      <Image
                        source={{ uri: selectedAssetModal.imageUri }}
                        style={styles.modalImageHero}
                        resizeMode="cover"
                      />
                      <View style={styles.modalImageHeroTag}>
                        <Ionicons name="camera" size={11} color="#FFFFFF" />
                        <Text style={styles.modalImageHeroTagText}>UPLOADED AUDIT PHOTO</Text>
                      </View>
                    </View>
                  )}

                  {/* Problem Summary / Description in Modal */}
                  {selectedAssetModal.problemSummary && (
                    <View style={styles.modalProblemSummaryBlock}>
                      <Text style={styles.modalProblemSummaryLabel}>PROBLEM SUMMARY:</Text>
                      <Text style={styles.modalProblemSummaryText}>{selectedAssetModal.problemSummary}</Text>
                    </View>
                  )}

                  <View style={styles.modalDetailRow}>
                    <Ionicons name="location" size={17} color={COLORS.brandGreen} />
                    <View style={styles.modalDetailTextBlock}>
                      <Text style={styles.modalDetailLabel}>Address & Location</Text>
                      <Text style={styles.modalDetailValue}>{selectedAssetModal.address}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Ionicons name="navigate-circle" size={17} color={COLORS.charcoal} />
                    <View style={styles.modalDetailTextBlock}>
                      <Text style={styles.modalDetailLabel}>Coordinates</Text>
                      <Text style={styles.modalDetailValue}>{selectedAssetModal.coordinates}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Ionicons name="time" size={17} color={COLORS.subtext} />
                    <View style={styles.modalDetailTextBlock}>
                      <Text style={styles.modalDetailLabel}>Last Inspected</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedAssetModal.lastAudit} • {selectedAssetModal.auditedBy || 'Ward Auditor'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalNotesBlock}>
                    <Text style={styles.modalNotesLabel}>FIELD AUDITOR LOG:</Text>
                    <Text style={styles.modalNotesText}>{selectedAssetModal.notes}</Text>
                  </View>

                  {selectedAssetModal.actionRequired && (
                    <View style={styles.modalActionBlock}>
                      <Text style={styles.modalActionLabel}>REQUIRED REMEDIATION DIRECTIVE:</Text>
                      <Text style={styles.modalActionText}>{selectedAssetModal.actionRequired}</Text>
                    </View>
                  )}
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={() => {
                    const issueId = selectedAssetModal.issueId;
                    setSelectedAssetModal(null);
                    if (issueId) setSelectedIssueId(issueId);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={19} color={COLORS.white} />
                  <Text style={styles.modalPrimaryButtonText}>View Full Civic Report</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// =========================================================================
// STYLES
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  /* =========================================================================
     TOP 40% REAL MAP STYLES
     ========================================================================= */
  topMapContainer: {
    width: '100%',
    height: MAP_HEIGHT,
    backgroundColor: '#E8F1EC',
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapPinAnchor: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -40 }, { translateY: -32 }],
    zIndex: 10,
  },
  mapPinPulseRing: {
    position: 'absolute',
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(38, 135, 85, 0.35)',
    borderWidth: 1.5,
    borderColor: COLORS.brandGreen,
  },
  mapPinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  mapPinPillSelected: {
    backgroundColor: '#1E2328',
    borderColor: COLORS.brandGreen,
    borderWidth: 2,
    shadowOpacity: 0.35,
    elevation: 8,
  },
  mapPinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
  },
  mapPinDotSelected: {
    backgroundColor: '#4ADE80',
  },
  mapPinText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  mapPinTextSelected: {
    color: COLORS.white,
    fontWeight: '800',
  },
  mapPinFlagsPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mapPinFlagsText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
  },
  mapPinTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -1,
  },
  mapPinTriangleSelected: {
    borderTopColor: '#1E2328',
  },

  /* Floating Map Overlays */
  mapWardStatus: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  mapWardStatusText: {
    fontSize: 11,
    color: COLORS.charcoal,
    textAlign: 'center',
  },
  mapAttribution: {
    position: 'absolute',
    left: 8,
    bottom: 6,
    fontSize: 9,
    color: 'rgba(15, 23, 42, 0.65)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  mapFloatingTopLeft: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 10,
  },
  mapFloatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 8,
    zIndex: 10,
  },
  mapControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },

  /* =========================================================================
     BOTTOM 58% SHEET STYLES
     ========================================================================= */
  bottomSheetContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -12,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 8,
  },

  /* UNIFIED DISCOVERY HEADER ROW: [ Search Bar (flex:1) ] [ Filter Icon Button ] */
  discoveryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
  },
  rowSearchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowSearchIcon: {
    marginRight: 8,
  },
  rowSearchInput: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.charcoal,
    fontWeight: '400',
    paddingVertical: 0,
    height: '100%',
  },
  rowFilterIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rowFilterIconButtonActive: {
    backgroundColor: '#1E2328',
    borderColor: '#1E2328',
  },
  rowFilterActiveBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.brandGreen,
  },

  /* Ward Filter Modal & Tag Styles */
  rowFilterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  rowFilterCountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  activeWardFilterTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  wardOptionSubtitle: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 2,
  },

  /* Ward List Content */
  wardListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  wardCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  wardCardSelected: {
    borderColor: '#0F172A',
    borderWidth: 1.5,
    backgroundColor: '#F8FAFC',
  },
  wardCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wardNumberBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  wardNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  wardCardTitleBlock: {
    flex: 1,
  },
  wardCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  wardCardZone: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 1,
  },
  healthScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  healthScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  wardCardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  wardCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wardMetaText: {
    fontSize: 11,
    color: COLORS.subtext,
    fontWeight: '500',
  },
  wardBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCountDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeCountText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chevron: {
    marginLeft: 4,
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.charcoal,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 3,
    textAlign: 'center',
  },

  /* =========================================================================
     SKETCH STATE STYLES (MATCHING USER'S HAND-DRAWN SKETCH EXACTLY)
     ========================================================================= */
  sketchTopNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.charcoal,
  },
  activeJurisdictionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  activeJurisdictionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: 0.5,
  },

  sketchScrollView: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  sketchScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },

  /* SECTION 1: SPLIT HEADER FROM SKETCH */
  sketchSplitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  sketchHeaderLeftCol: {
    flex: 1,
    justifyContent: 'center',
  },
  sketchLabelSmall: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sketchAreaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: -0.3,
  },
  sketchWardSubtitle: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '500',
    marginTop: 3,
    marginBottom: 6,
  },

  /* Clean Stats Badges Row under Area Name */
  cleanStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cleanStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cleanStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.charcoal,
  },

  /* RIGHT COLUMN: MAP */
  sketchHeaderRightCol: {
    alignItems: 'center',
  },
  sketchMapLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sketchMiniMapCard: {
    width: 120,
    height: 115,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#E8F1EC',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  miniMapCenterPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  miniMapPinPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  miniMapPinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  miniMapPinCore: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  /* Divider */
  sketchDividerLine: {
    height: 8,
    backgroundColor: COLORS.divider,
    marginVertical: 16,
  },

  /* SECTION: ASSET CARDS FEED & FILTER/SORT BUTTON */
  sketchListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sketchListHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  sketchListHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  amazonFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amazonFilterButtonActive: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  amazonFilterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.charcoal,
  },

  /* Active Filter Tags Row (Dismissible) */
  activeFilterTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeFilterTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  clearAllTagsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllTagsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    textDecorationLine: 'underline',
  },

  emptyFilterContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 6,
    gap: 8,
  },
  emptyFilterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.subtext,
    textAlign: 'center',
  },
  emptyFilterResetBtn: {
    backgroundColor: '#1E2328',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  emptyFilterResetText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },

  /* =========================================================================
     AMAZON-STYLE FILTER & SORT MODAL STYLES
     ========================================================================= */
  amazonModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  amazonFilterSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: Math.round(SCREEN_HEIGHT * 0.72),
    maxHeight: Math.round(SCREEN_HEIGHT * 0.85),
    display: 'flex',
    flexDirection: 'column',
  },
  amazonModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  amazonModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  amazonCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 2-Column Split Amazon/Flipkart-style Filter Layout */
  amazonTwoColumnContainer: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  /* LEFT INDEX COLUMN */
  amazonIndexColumn: {
    width: 130,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  amazonIndexTab: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  amazonIndexTabActive: {
    backgroundColor: COLORS.white,
    borderBottomColor: '#E5E7EB',
  },
  amazonIndexTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  amazonIndexTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  amazonIndexTabTextActive: {
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  amazonIndexBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  amazonIndexBadgeText: {
    color: COLORS.charcoal,
    fontSize: 10,
    fontWeight: '700',
  },

  /* RIGHT OPTIONS COLUMN */
  amazonOptionsColumn: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  amazonOptionsScroll: {
    flex: 1,
  },
  amazonOptionsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  amazonOptionsSection: {
    gap: 12,
  },
  amazonOptionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  amazonOptionsHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amazonQuickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  amazonOptionsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  amazonOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  amazonOptionRowSelected: {
    backgroundColor: '#F3F4F6',
  },
  amazonOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  amazonOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.charcoal,
    flex: 1,
  },
  amazonOptionLabelSelected: {
    fontWeight: '700',
    color: COLORS.charcoal,
  },

  /* Radio Circles */
  amazonRadioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amazonRadioOuterSelected: {
    borderColor: '#4B5563',
  },
  amazonRadioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4B5563',
  },

  /* Checkbox Squares */
  amazonCheckboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amazonCheckboxSquareChecked: {
    backgroundColor: '#4B5563',
    borderColor: '#4B5563',
  },
  amazonOptionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.subtext,
    marginLeft: 6,
  },

  /* Sticky Bottom Action Bar */
  amazonModalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: COLORS.white,
    gap: 12,
  },
  amazonClearBottomBtn: {
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  amazonClearBottomBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  amazonApplyBottomBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  amazonApplyBottomBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  sketchAssetCardsContainer: {
    gap: 12,
  },
  sketchAssetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  problemSquareImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexShrink: 0,
  },
  problemSquareImage: {
    width: '100%',
    height: '100%',
  },
  problemSquareFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  squareImageSectorPill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(30, 35, 40, 0.75)',
    borderRadius: 4,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetSectorIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assetIconVerified: {
    backgroundColor: '#F1F5F9',
  },
  assetIconAction: {
    backgroundColor: '#F1F5F9',
  },
  assetCardInfoBlock: {
    flex: 1,
    marginRight: 6,
    justifyContent: 'center',
  },
  assetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.charcoal,
    lineHeight: 18,
  },
  assetAddress: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
    fontWeight: '500',
  },
  assetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  assetSectorPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  assetSectorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  assetAuditTime: {
    fontSize: 10.5,
    color: COLORS.muted,
    fontWeight: '500',
  },

  assetCardRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  assetChevron: {
    marginLeft: 2,
  },

  /* Modal Details */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderTitleBlock: {
    flex: 1,
  },
  modalSectorBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandGreen,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  modalDetailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  modalImageHeroWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalImageHero: {
    width: '100%',
    height: '100%',
  },
  modalImageHeroTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalImageHeroTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalProblemSummaryBlock: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 4,
  },
  modalProblemSummaryLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  modalProblemSummaryText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '500',
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalDetailTextBlock: {
    flex: 1,
  },
  modalDetailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.charcoal,
    marginTop: 1,
  },
  modalNotesBlock: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  modalNotesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandGreen,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalNotesText: {
    fontSize: 12,
    color: COLORS.charcoal,
    lineHeight: 18,
  },
  modalActionBlock: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 2,
  },
  modalActionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalActionText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  modalPrimaryButton: {
    backgroundColor: '#1E2328',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  modalPrimaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
