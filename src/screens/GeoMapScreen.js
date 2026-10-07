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
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

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
  { id: 'Power Grid', label: 'Power' },
  { id: 'Sanitation', label: 'Sanitation' },
  { id: 'Drainage', label: 'Drainage' },
  { id: 'Water Works', label: 'Water' },
  { id: 'Healthcare', label: 'Health' },
  { id: 'Food & PDS', label: 'PDS' },
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

// =========================================================================
// REALISTIC CIVIC AUDIT DATA FOR SURROUNDING WARDS & AUDITED PROBLEMS
// =========================================================================
const SURROUNDING_WARDS = [
  {
    id: 'ward-44',
    name: 'Indiranagar',
    wardNumber: '44',
    zone: 'East Zone • Bengaluru',
    distance: '0.8 km away',
    coverage: '94%',
    healthScore: 88,
    openFlags: 2,
    badgeText: 'Active Civic Audit • High Priority',
    coordinates: '12.9716° N, 77.6412° E',
    lat: 12.9716,
    lon: 77.6412,
    assets: [
      {
        id: 'ast-1',
        title: 'Stormwater Drain Siltation & Cable Blockage',
        problemSummary: 'Secondary stormwater culvert choked with silt and unauthorized fiber cables.',
        sector: 'Drainage',
        sectorIcon: 'water-outline',
        severity: 'Critical Defect',
        severityColor: '#DC2626',
        status: 'Action Required',
        statusColor: '#DC2626',
        imageUri: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?w=300&auto=format&fit=crop&q=80',
        address: '12th Main, HAL 2nd Stage (Near BDA Complex)',
        coordinates: '12.9695° N, 77.6390° E',
        lat: 12.9695,
        lon: 77.6390,
        auditedBy: 'Er. S. Rao, BBMP Works Div',
        lastAudit: 'Today, 11:30 AM',
        notes: 'Culvert flow capacity reduced by ~70% due to plastic waste silt and illegal fiber ducting. High risk of road waterlogging during upcoming rains.',
        actionRequired: 'Issue contractor directive for desilting and remove encroaching cables within 48h.',
        sla: '48h SLA',
      },
      {
        id: 'ast-2',
        title: 'Pothole Crater & Road Subsidence',
        problemSummary: '1.2m wide pavement subsidence causing traffic slowdown and two-wheeler hazard.',
        sector: 'Roads & Works',
        sectorIcon: 'car-outline',
        severity: 'High Severity',
        severityColor: '#EA580C',
        status: 'Action Required',
        statusColor: '#DC2626',
        imageUri: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=300&auto=format&fit=crop&q=80',
        address: '100ft Road & 4th Cross Intersection',
        coordinates: '12.9740° N, 77.6430° E',
        lat: 12.9740,
        lon: 77.6430,
        auditedBy: 'Nodal Inspector K. Gowda',
        lastAudit: 'Yesterday, 04:15 PM',
        notes: 'Asphalt top layer sheared off after water pipe repair. Requires base compaction and bitumen resurfacing.',
        actionRequired: 'Temporary cold-mix patching scheduled; full overlay sanctioned.',
        sla: '24h SLA',
      },
      {
        id: 'ast-3',
        title: 'Urban Primary Health Clinic',
        problemSummary: 'Vaccine cold chain storage operational; entrance ramp handrail needs repair.',
        sector: 'Healthcare',
        sectorIcon: 'medical-outline',
        severity: 'Moderate',
        severityColor: '#F59E0B',
        status: 'Needs Review',
        statusColor: '#D97706',
        imageUri: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=300&auto=format&fit=crop&q=80',
        address: '80ft Road, 4th Cross, Indiranagar',
        coordinates: '12.9752° N, 77.6425° E',
        lat: 12.9752,
        lon: 77.6425,
        auditedBy: 'Dr. V. Shastry, Health Officer',
        lastAudit: 'Yesterday, 02:00 PM',
        notes: 'Vaccine storage temperature maintained at +3.8°C. Ramp accessibility railing loose at entrance step 3.',
        actionRequired: 'Weld handrail support bracket.',
        sla: '5 Days',
      },
      {
        id: 'ast-4',
        title: 'PDS Ration Distribution Center #12',
        problemSummary: 'Electronic PoS biometric terminal verified with physical grain stock.',
        sector: 'Food & PDS',
        sectorIcon: 'basket-outline',
        severity: 'Compliant',
        severityColor: '#16A34A',
        status: 'Verified',
        statusColor: '#16A34A',
        imageUri: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=300&auto=format&fit=crop&q=80',
        address: '100ft Road, Near BDA Complex',
        coordinates: '12.9721° N, 77.6405° E',
        lat: 12.9721,
        lon: 77.6405,
        auditedBy: 'Inspector T. Narayanan',
        lastAudit: 'Today, 09:30 AM',
        notes: 'Grain stock verified with biometric point-of-sale active. Electronic weighing scales calibrated.',
        actionRequired: 'No immediate action required.',
        sla: 'Compliant',
      },
      {
        id: 'ast-5',
        title: 'Solid Waste Aggregation Point #04',
        problemSummary: 'Secondary compactor operational; daily wet/dry segregation verified.',
        sector: 'Sanitation',
        sectorIcon: 'trash-outline',
        severity: 'Compliant',
        severityColor: '#16A34A',
        status: 'Verified',
        statusColor: '#16A34A',
        imageUri: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=300&auto=format&fit=crop&q=80',
        address: '6th Main, Defense Colony',
        coordinates: '12.9710° N, 77.6450° E',
        lat: 12.9710,
        lon: 77.6450,
        auditedBy: 'SWM Supervisor M. Anthony',
        lastAudit: '2 days ago',
        notes: 'Wet/Dry segregation compliant; daily clearance on schedule to compost facility.',
        actionRequired: 'Maintain daily manifest logging.',
        sla: 'Compliant',
      },
      {
        id: 'ast-6',
        title: 'BESCOM Transformer Enclosure',
        problemSummary: 'Vegetation overgrowth near 11kV distribution feeder lines.',
        sector: 'Power Grid',
        sectorIcon: 'flash-outline',
        severity: 'Moderate',
        severityColor: '#F59E0B',
        status: 'Needs Review',
        statusColor: '#D97706',
        imageUri: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=300&auto=format&fit=crop&q=80',
        address: '9th Cross, HAL Stage 1',
        coordinates: '12.9680° N, 77.6420° E',
        lat: 12.9680,
        lon: 77.6420,
        auditedBy: 'BESCOM Sub-Div Engineer',
        lastAudit: '3 days ago',
        notes: 'Tree branches within 0.6m of primary 11kV drop-out fuse. Risk of flashover during high winds.',
        actionRequired: 'Tree trimming unit scheduled for weekend maintenance shutdown.',
        sla: '3 Days',
      },
    ],
  },
  {
    id: 'ward-72',
    name: 'Domlur',
    wardNumber: '72',
    zone: 'East Zone • Bengaluru',
    distance: '1.9 km away',
    coverage: '89%',
    healthScore: 82,
    openFlags: 3,
    badgeText: 'Routine Audit • Mixed Commercial',
    coordinates: '12.9609° N, 77.6387° E',
    lat: 12.9609,
    lon: 77.6387,
    assets: [
      {
        id: 'ast-21',
        title: 'Flyover Drainage Grate Choking',
        problemSummary: 'Rainwater drain gratings covered by heavy plastic debris and construction runoff.',
        sector: 'Drainage',
        sectorIcon: 'water-outline',
        severity: 'Critical Defect',
        severityColor: '#DC2626',
        status: 'Action Required',
        statusColor: '#DC2626',
        imageUri: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80',
        address: 'Intermediate Ring Road Junction',
        coordinates: '12.9590° N, 77.6370° E',
        lat: 12.9590,
        lon: 77.6370,
        auditedBy: 'Er. P. Venkatesh, BBMP',
        lastAudit: 'Today, 08:45 AM',
        notes: 'Rainwater drain gratings covered by debris. Water stagnation observed during morning rains spanning 40m.',
        actionRequired: 'Deploy jetting suction vehicle for immediate grating clearance.',
        sla: '24h SLA',
      },
      {
        id: 'ast-22',
        title: 'Exposed Electrical Cable Trench',
        problemSummary: 'Uncovered cable trench post fiber laying left without warning barricades.',
        sector: 'Power Grid',
        sectorIcon: 'flash-outline',
        severity: 'High Severity',
        severityColor: '#EA580C',
        status: 'Action Required',
        statusColor: '#DC2626',
        imageUri: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=80',
        address: 'Domlur Inner Ring Road Footpath',
        coordinates: '12.9625° N, 77.6398° E',
        lat: 12.9625,
        lon: 77.6398,
        auditedBy: 'Field Officer S. Prabhu',
        lastAudit: 'Yesterday, 03:20 PM',
        notes: 'Trench depth 0.9m with exposed 415V cables near bus shelter.',
        actionRequired: 'Immediate backfilling and concrete slab cover required.',
        sla: '24h SLA',
      },
      {
        id: 'ast-23',
        title: 'Domlur Maternity Hospital',
        problemSummary: 'Hospital facilities, oxygen backup, and staff attendance verified.',
        sector: 'Healthcare',
        sectorIcon: 'medical-outline',
        severity: 'Compliant',
        severityColor: '#16A34A',
        status: 'Verified',
        statusColor: '#16A34A',
        imageUri: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80',
        address: 'Old Airport Road, Domlur',
        coordinates: '12.9615° N, 77.6395° E',
        lat: 12.9615,
        lon: 77.6395,
        auditedBy: 'Dr. R. Meenakshi',
        lastAudit: '2 days ago',
        notes: 'Liquid medical oxygen tank level at 88%. Generator automated switchover operational.',
        actionRequired: 'Compliant.',
        sla: 'Compliant',
      },
    ],
  },
  {
    id: 'ward-88',
    name: 'Koramangala',
    wardNumber: '88',
    zone: 'South Zone • Bengaluru',
    distance: '3.4 km away',
    coverage: '96%',
    healthScore: 91,
    openFlags: 1,
    badgeText: 'Active Civic Audit • High Coverage',
    coordinates: '12.9352° N, 77.6245° E',
    lat: 12.9352,
    lon: 77.6245,
    assets: [
      {
        id: 'ast-31',
        title: 'Broken Footpath Paver Slabs',
        problemSummary: 'Pedestrian footpath damaged over 65 meters with missing storm-drain slab covers.',
        sector: 'Roads & Works',
        sectorIcon: 'footsteps-outline',
        severity: 'Moderate',
        severityColor: '#F59E0B',
        status: 'Needs Review',
        statusColor: '#D97706',
        imageUri: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=300&auto=format&fit=crop&q=80',
        address: '80ft Road, 4th Block, Koramangala',
        coordinates: '12.9360° N, 77.6250° E',
        lat: 12.9360,
        lon: 77.6250,
        auditedBy: 'Er. N. Karthik, BBMP',
        lastAudit: 'Today, 01:20 PM',
        notes: 'Missing RCC cover slabs pose hazard for pedestrians and morning walkers.',
        actionRequired: 'Pre-cast RCC slab replacement work order issued.',
        sla: '48h SLA',
      },
      {
        id: 'ast-32',
        title: 'National Games Village Water Station',
        problemSummary: 'Potable water residual chlorine and pressure telemetry logs verified.',
        sector: 'Water Works',
        sectorIcon: 'water-outline',
        severity: 'Compliant',
        severityColor: '#16A34A',
        status: 'Verified',
        statusColor: '#16A34A',
        imageUri: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80',
        address: 'Koramangala 6th Block (NGV)',
        coordinates: '12.9340° N, 77.6230° E',
        lat: 12.9340,
        lon: 77.6230,
        auditedBy: 'BWSSB QA Unit',
        lastAudit: 'Yesterday, 10:00 AM',
        notes: 'Chlorine residual tested at 0.4 ppm. Dual-grid pumps functioning without error.',
        actionRequired: 'Compliant.',
        sla: 'Compliant',
      },
    ],
  },
  {
    id: 'ward-112',
    name: 'HSR Layout',
    wardNumber: '112',
    zone: 'South Zone • Bengaluru',
    distance: '4.8 km away',
    coverage: '91%',
    healthScore: 85,
    openFlags: 2,
    badgeText: 'Routine Audit • Residential Hub',
    coordinates: '12.9121° N, 77.6446° E',
    lat: 12.9121,
    lon: 77.6446,
    assets: [
      {
        id: 'ast-41',
        title: 'Garbage Vulnerable Point (GVP)',
        problemSummary: 'Illegal dumping of commercial packaging and green waste on 27th Main.',
        sector: 'Sanitation',
        sectorIcon: 'trash-outline',
        severity: 'High Severity',
        severityColor: '#EA580C',
        status: 'Action Required',
        statusColor: '#DC2626',
        imageUri: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=300&auto=format&fit=crop&q=80',
        address: '27th Main, Sector 2, HSR',
        coordinates: '12.9130° N, 77.6455° E',
        lat: 12.9130,
        lon: 77.6455,
        auditedBy: 'SWM Health Inspector G. Ravi',
        lastAudit: 'Today, 07:15 AM',
        notes: 'Over 400kg mixed waste dumped. CCTV installation and continuous marshaling required.',
        actionRequired: 'Deploy Bobcat loader for immediate clearance and install no-dumping signage.',
        sla: '24h SLA',
      },
      {
        id: 'ast-42',
        title: 'HSR Dry Waste Collection Center',
        problemSummary: 'Plastic bailing machinery and worker safety gear verified.',
        sector: 'Sanitation',
        sectorIcon: 'trash-outline',
        severity: 'Compliant',
        severityColor: '#16A34A',
        status: 'Verified',
        statusColor: '#16A34A',
        imageUri: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=300&auto=format&fit=crop&q=80',
        address: '14th Main, Sector 7',
        coordinates: '12.9110° N, 77.6430° E',
        lat: 12.9110,
        lon: 77.6430,
        auditedBy: 'Hasiru Dala Auditor',
        lastAudit: 'Yesterday, 02:30 PM',
        notes: 'Plastic bailing machine operational; daily intake processed smoothly.',
        actionRequired: 'Compliant.',
        sla: 'Compliant',
      },
    ],
  },
  {
    id: 'ward-150',
    name: 'Bellandur',
    wardNumber: '150',
    zone: 'Mahadevapura Zone • Bengaluru',
    distance: '6.2 km away',
    coverage: '76%',
    healthScore: 71,
    openFlags: 4,
    badgeText: 'High Priority • Lake Buffer Inspection',
    coordinates: '12.9260° N, 77.6762° E',
    lat: 12.9260,
    lon: 77.6762,
    assets: [
      {
        id: 'ast-51',
        title: 'Bellandur Lake Inlet Sluice Gate Choking',
        problemSummary: 'Untreated greywater bypass leaking into lake buffer zone near culvert.',
        sector: 'Water Works',
        sectorIcon: 'water-outline',
        severity: 'Critical Defect',
        severityColor: '#DC2626',
        status: 'Action Required',
        statusColor: '#DC2626',
        imageUri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&auto=format&fit=crop&q=80',
        address: 'Kariyammana Agrahara Road',
        coordinates: '12.9270° N, 77.6780° E',
        lat: 12.9270,
        lon: 77.6780,
        auditedBy: 'BBMP Lakes Division',
        lastAudit: 'Today, 08:30 AM',
        notes: 'Dissolved oxygen sensors reading below threshold. Screen mesh blocked with weeds.',
        actionRequired: 'Automated weed-harvester deployment and sewage pumping diversion.',
        sla: '24h SLA',
      },
    ],
  },
  {
    id: 'ward-delhi-01',
    name: 'Connaught Place',
    wardNumber: 'ND-01',
    zone: 'New Delhi • Central Zone',
    distance: 'National Hub',
    coverage: '98%',
    healthScore: 94,
    openFlags: 1,
    badgeText: 'National Capital Civic Grid',
    coordinates: '28.6304° N, 77.2177° E',
    lat: 28.6304,
    lon: 77.2177,
    assets: [
      {
        id: 'ast-nd-1',
        title: 'Inner Circle Heritage Drainage Vault',
        problemSummary: 'Automated submersible flood pump station operational.',
        sector: 'Drainage',
        sectorIcon: 'water-outline',
        severity: 'Compliant',
        severityColor: '#16A34A',
        status: 'Verified',
        statusColor: '#16A34A',
        imageUri: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=300&auto=format&fit=crop&q=80',
        address: 'Radial Road 1, CP, New Delhi',
        coordinates: '28.6310° N, 77.2180° E',
        lat: 28.6310,
        lon: 77.2180,
        auditedBy: 'NDMC Civil Engg Dept',
        lastAudit: 'Today, 10:00 AM',
        notes: 'Heritage drainage inspection compliant. Telemetry synchronizing with NDMC Command Center.',
        actionRequired: 'Compliant.',
        sla: 'Compliant',
      },
    ],
  },
  {
    id: 'ward-mum-01',
    name: 'Nariman Point',
    wardNumber: 'MC-01',
    zone: 'South Mumbai • Zone A',
    distance: 'Western Hub',
    coverage: '95%',
    healthScore: 92,
    openFlags: 1,
    badgeText: 'Coastal Infrastructure Audit',
    coordinates: '18.9256° N, 72.8242° E',
    lat: 18.9256,
    lon: 72.8242,
    assets: [
      {
        id: 'ast-mum-1',
        title: 'Marine Drive Coastal Pump Station',
        problemSummary: 'High-tide backflow prevention valves and flap gates active.',
        sector: 'Water Works',
        sectorIcon: 'water-outline',
        severity: 'Compliant',
        severityColor: '#16A34A',
        status: 'Verified',
        statusColor: '#16A34A',
        imageUri: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=300&auto=format&fit=crop&q=80',
        address: 'Netaji Subhash Chandra Bose Rd',
        coordinates: '18.9260° N, 72.8250° E',
        lat: 18.9260,
        lon: 72.8250,
        auditedBy: 'BMC SWD Cell',
        lastAudit: 'Today, 02:00 PM',
        notes: 'Dual check-valves tested against 4.2m spring tide simulation without leakage.',
        actionRequired: 'Compliant.',
        sla: 'Compliant',
      },
    ],
  },
];

export const GeoMapScreen = () => {
  // Navigation / Selection State
  const [selectedArea, setSelectedArea] = useState(null);
  const [highlightedWardId, setHighlightedWardId] = useState('ward-44');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'nearby' | 'flags'
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
  const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lon: 77.6412 });
  const [mapZoom, setMapZoom] = useState(14.5);

  // High performance gesture tracking refs
  const centerRef = useRef({ lat: 12.9716, lon: 77.6412 });
  const zoomRef = useRef(14.5);
  const startCenterRef = useRef({ lat: 12.9716, lon: 77.6412 });
  const initialPinchDistRef = useRef(null);
  const startPinchZoomRef = useRef(14.5);
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

  const handleViewAllIndia = () => {
    flyTo(21.7679, 78.8718, 4.8);
  };

  const centerMapOnWard = (ward) => {
    setHighlightedWardId(ward.id);
    const targetZoom = zoomRef.current < 13 ? 14.5 : zoomRef.current;
    flyTo(ward.lat, ward.lon, targetZoom);
  };

  const handleRecenter = () => {
    const currentWard = SURROUNDING_WARDS.find((w) => w.id === highlightedWardId) || SURROUNDING_WARDS[0];
    centerMapOnWard(currentWard);
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

  // Filtered wards for Discovery view
  const filteredWards = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    return SURROUNDING_WARDS.filter((ward) => {
      const matchesSearch =
        (ward.name || '').toLowerCase().includes(query) ||
        (ward.wardNumber || '').toString().includes(query) ||
        (ward.zone || '').toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeFilterTab === 'nearby') {
        return parseFloat(ward.distance || 0) <= 5.0 || (ward.distance || '').includes('away');
      }
      if (activeFilterTab === 'flags') {
        return (ward.openFlags || 0) > 1;
      }
      return true;
    });
  }, [searchQuery, activeFilterTab]);

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
    let list = [...(selectedArea.assets || [])];

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
  }, [selectedArea, appliedFilters]);

  // Draft preview results count inside filter modal
  const draftPreviewCount = useMemo(() => {
    if (!selectedArea) return 0;
    let list = [...(selectedArea.assets || [])];
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
  }, [selectedArea, draftFilters]);

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

  const zoomRegionLabel = useMemo(() => {
    if (mapZoom < 6) return 'INDIA • NATIONAL VIEW';
    if (mapZoom < 11) return 'REGIONAL VIEW';
    if (mapZoom < 14) return 'CITY VIEW';
    return 'HIGH DETAIL • WARD LEVEL';
  }, [mapZoom]);

  // =========================================================================
  // RENDER 1: 42% DYNAMIC REAL MAP ON TOP + 58% SURROUNDING AREAS LIST ON BOTTOM
  // =========================================================================
  if (!selectedArea) {
    const highlightedWard = SURROUNDING_WARDS.find((w) => w.id === highlightedWardId) || SURROUNDING_WARDS[0];
    const z = Math.min(Math.max(Math.floor(mapZoom), Math.floor(MIN_ZOOM)), Math.floor(MAX_ZOOM));
    const scale = Math.pow(2, mapZoom - z);
    const scaledTileSize = TILE_SIZE * scale;
    const centerTileX = lon2tile(mapCenter.lon, z);
    const centerTileY = lat2tile(mapCenter.lat, z);
    const halfW = SCREEN_WIDTH / 2;
    const halfH = MAP_HEIGHT / 2;

    return (
      <View style={styles.container}>
        {/* Top of Screen: Dynamic Multi-Level Real Map */}
        <View style={styles.topMapContainer} {...mapPanResponder.panHandlers}>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {visibleTiles.map((tile) => (
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

          {/* Markers on Discovery Map */}
          {SURROUNDING_WARDS.map((ward) => {
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

            const isSelected = highlightedWardId === ward.id;

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
                  setHighlightedWardId(ward.id);
                  centerMapOnWard(ward);
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

          {/* Floating Live GPS Badge */}
          <View style={styles.mapFloatingTopLeftBadge}>
            <View style={styles.mapLiveGpsDot} />
            <Text style={styles.mapLiveGpsText}>REAL-TIME OSM</Text>
            <View style={styles.zoomBadgeDivider} />
            <Text style={styles.zoomBadgeText}>{zoomRegionLabel}</Text>
          </View>

          {/* Floating All India Button */}
          <TouchableOpacity
            style={styles.mapFloatingIndiaButton}
            onPress={handleViewAllIndia}
            activeOpacity={0.85}
          >
            <Ionicons name="globe-outline" size={14} color={COLORS.charcoal} />
            <Text style={styles.mapFloatingIndiaButtonText}>All India</Text>
          </TouchableOpacity>

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

          {/* Search Bar */}
          <View style={styles.searchBarWrapper}>
            <Ionicons
              name="search"
              size={18}
              color={COLORS.subtext}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ward name, number, or zone..."
              placeholderTextColor={COLORS.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color={COLORS.subtext} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <View style={styles.filterChipsRow}>
            {[
              { id: 'all', label: `All Wards (${SURROUNDING_WARDS.length})` },
              { id: 'nearby', label: 'Nearby (< 5 km)' },
              { id: 'flags', label: 'Audited Flags' },
            ].map((chip) => {
              const isActive = activeFilterTab === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveFilterTab(chip.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
                      <Text style={styles.healthScoreText}>{item.healthScore}%</Text>
                    </View>
                  </View>

                  <View style={styles.wardCardDivider} />

                  <View style={styles.wardCardBottomRow}>
                    <View style={styles.wardMetaItem}>
                      <Ionicons name="location-outline" size={14} color={COLORS.subtext} />
                      <Text style={styles.wardMetaText}>{item.distance}</Text>
                    </View>

                    <View style={styles.wardMetaItem}>
                      <Ionicons name="business-outline" size={14} color={COLORS.subtext} />
                      <Text style={styles.wardMetaText}>{(item.assets || []).length} Nodes</Text>
                    </View>

                    {item.openFlags > 0 ? (
                      <View style={styles.wardFlagsBadge}>
                        <Ionicons name="alert-circle" size={13} color="#DC2626" />
                        <Text style={styles.wardFlagsText}>{item.openFlags} Flags</Text>
                      </View>
                    ) : (
                      <View style={styles.wardVerifiedBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                        <Text style={styles.wardVerifiedText}>All Clear</Text>
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
                <Text style={styles.emptySubtitle}>Try searching for another area name or reset filters.</Text>
              </View>
            }
          />
        </View>
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
            <Text style={styles.sketchWardSubtitle}>Ward {selectedArea.wardNumber} • {selectedArea.zone}</Text>

            {/* Quick Informative Badges */}
            <View style={styles.cleanStatsRow}>
              <View style={styles.cleanStatPill}>
                <Ionicons name="shield-checkmark" size={13} color={COLORS.brandGreen} />
                <Text style={styles.cleanStatText}>{selectedArea.healthScore}% Health</Text>
              </View>
              <View style={styles.cleanStatPill}>
                <Ionicons name="business-outline" size={13} color={COLORS.charcoal} />
                <Text style={styles.cleanStatText}>{(selectedArea.assets || []).length} Monitored</Text>
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
              AUDITED PROBLEMS ({currentAssets.length})
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

        {/* Problem Cards List or Empty Filter View */}
        {currentAssets.length === 0 ? (
          <View style={styles.emptyFilterContainer}>
            <Ionicons name="filter-outline" size={32} color={COLORS.muted} />
            <Text style={styles.emptyFilterTitle}>No problems match your active filters</Text>
            <TouchableOpacity
              style={styles.emptyFilterResetBtn}
              onPress={handleClearAllAppliedFilters}
              activeOpacity={0.75}
            >
              <Text style={styles.emptyFilterResetText}>
                Reset All Filters ({selectedArea?.assets?.length || 0})
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
                  onPress={() => setSelectedAssetModal(null)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera-outline" size={19} color={COLORS.white} />
                  <Text style={styles.modalPrimaryButtonText}>Take Inspection Photo</Text>
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
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mapPinFlagsText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
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
  mapFloatingTopLeftBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  mapLiveGpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
  },
  mapLiveGpsText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: 0.4,
  },
  zoomBadgeDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 3,
  },
  zoomBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  mapFloatingIndiaButton: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  mapFloatingIndiaButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  mapFloatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 8,
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

  /* Search Bar */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.charcoal,
    fontWeight: '500',
  },

  /* Filter Chips */
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1E2328',
    borderColor: '#1E2328',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
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
    borderColor: COLORS.brandGreen,
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  wardCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wardNumberBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 10,
  },
  wardNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandGreen,
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
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  healthScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandGreen,
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
  wardFlagsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  wardFlagsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  wardVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  wardVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
  },
  activeJurisdictionText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandGreen,
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  activeFilterTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
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
    backgroundColor: '#F0FDF4',
  },
  assetIconAction: {
    backgroundColor: '#FEF2F2',
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
