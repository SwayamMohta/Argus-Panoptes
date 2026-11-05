import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English', sub: 'Default interface language' },
  { id: 'hi', label: 'हिंदी', native: 'Hindi', sub: 'राजभाषा एवं नागरिक संवाद' },
  { id: 'te', label: 'తెలుగు', native: 'Telugu', sub: 'ప్రాంతీయ అధికారిక భాష' },
  { id: 'kn', label: 'ಕನ್ನಡ', native: 'Kannada', sub: 'ಪ್ರಾದೇಶಿಕ ಭಾಷೆ' },
  { id: 'ta', label: 'தமிழ்', native: 'Tamil', sub: 'மாநில ஆட்சி மொழி' },
];

const EXPORT_FORMATS = [
  {
    id: 'geojson',
    label: 'GeoJSON Spatial Archive',
    sub: 'Full geospatial coordinate layers, boundary geometry, and GPS metadata. Perfect for QGIS, ArcGIS, and open map platforms.',
    icon: 'map',
  },
  {
    id: 'csv',
    label: 'CSV Inspection Spreadsheets',
    sub: 'Tabular audit records with dates, locations, categories, and resolution timelines. Compatible with Microsoft Excel and Google Sheets.',
    icon: 'file-text',
  },
  {
    id: 'json',
    label: 'Raw JSON Archive',
    sub: 'Structured civic reports and verified witness records with metadata and timeline transitions.',
    icon: 'database',
  },
];

const GPS_RADII = [
  {
    id: '250m',
    label: '250 meters',
    sub: 'Minimal coordinate fuzzing. Best for dense urban neighborhoods where street accuracy is still required.',
  },
  {
    id: '500m',
    label: '500 meters (Recommended)',
    sub: 'Balanced privacy protection. Offsets location enough to obscure specific residential gates while identifying the general sector.',
  },
  {
    id: '1000m',
    label: '1 kilometer (High Privacy)',
    sub: 'Broad ward-level masking. Recommended for high-sensitivity whistleblower reporting or private residences.',
  },
];

const LOCK_TIMEOUTS = [
  { id: 'immediate', label: 'Immediately', sub: 'Require authentication every time app leaves foreground' },
  { id: '1m', label: 'After 1 minute', sub: 'Grace period for quick app switching' },
  { id: '5m', label: 'After 5 minutes', sub: 'Balanced convenience for active auditing' },
  { id: '15m', label: 'After 15 minutes', sub: 'Extended session for long inspections' },
];

export const SettingsScreen = ({ onBack }) => {
  const {
    user,
    pseudonymousMode,
    setPseudonymousMode,
    homeRadiusMasking,
    setHomeRadiusMasking,
    autoSyncWifi,
    setAutoSyncWifi,
    notificationsEnabled,
    setNotificationsEnabled,
    themeMode,
    setThemeMode,
    isAppLockEnabled,
    setIsAppLockEnabled,
    language,
    setLanguage,
  } = useAuth();

  // Full-page subnavigation state: 'main' | subpage ID
  const [activePage, setActivePage] = useState('main');

  // Subpage specific configuration states
  const [selectedFormat, setSelectedFormat] = useState('geojson');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedGpsRadius, setSelectedGpsRadius] = useState('500m');
  const [selectedLockTimeout, setSelectedLockTimeout] = useState('immediate');
  const [notifChannels, setNotifChannels] = useState({
    statusChanges: true,
    upvotesAndComments: true,
    wardAlerts: true,
    emergencyBroadcasts: true,
    soundVibrate: true,
  });
  const [cachedDataSize, setCachedDataSize] = useState('48.6 MB');
  const [autoClearCache, setAutoClearCache] = useState(true);

  const handleStartExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      const format = (selectedFormat || 'GEOJSON').toUpperCase();
      const handle = user?.handle || 'user';
      const msg = `Export completed: Saved verified audit history as ${format} to your device downloads.`;
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Export Complete', msg);
      }
    }, 1000);
  };

  const handleClearCache = () => {
    setCachedDataSize('0.0 MB');
    const msg = 'Cache cleared: 48.6 MB of temporary photographic evidence and map tiles have been freed.';
    if (Platform.OS === 'web') {
      alert(msg);
    } else {
      Alert.alert('Cache Cleared', msg);
    }
  };

  // Reusable Subpage Header
  const renderSubPageHeader = (title) => (
    <View style={styles.subPageHeader}>
      <TouchableOpacity
        style={styles.subPageBackBtn}
        onPress={() => setActivePage('main')}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={22} color={COLORS.charcoal} />
      </TouchableOpacity>
      <Text style={styles.subPageHeaderTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  );

  // =========================================================================
  // SUBPAGE 1: Anonymous Auditing & Cryptographic Identity
  // =========================================================================
  if (activePage === 'anonymousAuditing') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('Anonymous Auditing')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          {/* Master Toggle Card */}
          <View style={styles.masterToggleCard}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.masterToggleTitle}>Pseudonymous Mode</Text>
              <Text style={styles.masterToggleSub}>
                Mask legal name & contact details with an on-chain civic pseudonym
              </Text>
            </View>
            <Switch
              value={pseudonymousMode}
              onValueChange={setPseudonymousMode}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Active Identity Preview Card */}
          <Text style={styles.sectionHeading}>ACTIVE AUDIT IDENTITY</Text>
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Public Display</Text>
              <Text style={styles.identityVal}>
                {pseudonymousMode ? (user?.handle || 'u/civic_scout_91') : (user?.name || 'Citizen Auditor')}
              </Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Legal Identity State</Text>
              <View style={styles.identityBadgeGreen}>
                <Ionicons name="shield-checkmark" size={13} color="#15803D" />
                <Text style={styles.identityBadgeGreenText}>
                  {pseudonymousMode ? 'Masked via ZK-Proof' : 'Publicly Visible'}
                </Text>
              </View>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Cryptographic Key</Text>
              <Text style={styles.identityMono}>0x8F4A...B902</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Municipal Jurisdiction</Text>
              <Text style={styles.identityVal}>{user?.ward || 'Ward 102, Khairatabad Circle'}</Text>
            </View>
          </View>

          {/* Statutory Whistleblower Protection Info */}
          <Text style={styles.sectionHeading}>CIVIL RIGHTS & PROTECTION</Text>
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.brandGreen} />
            <Text style={styles.infoBannerText}>
              Under the Central Vigilance & Whistleblower Protection Act, citizens reporting public infrastructure defects are entitled to total anonymity. Argus Panoptes signs evidence cryptographically so verification courts can authenticate submissions without exposing your identity.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setActivePage('main')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 2: GPS Privacy Zone
  // =========================================================================
  if (activePage === 'gpsPrivacy') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('GPS Privacy Zone')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          {/* Master Toggle */}
          <View style={styles.masterToggleCard}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.masterToggleTitle}>Home Geofence Masking</Text>
              <Text style={styles.masterToggleSub}>
                Automatically perturb GPS coordinates of issues reported near your residence
              </Text>
            </View>
            <Switch
              value={homeRadiusMasking}
              onValueChange={setHomeRadiusMasking}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text style={styles.sectionHeading}>SELECT MASKING RADIUS</Text>
          <View style={styles.optionsList}>
            {GPS_RADII.map((r) => {
              const isSelected = selectedGpsRadius === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.fullOptionCard, isSelected && styles.fullOptionCardActive]}
                  onPress={() => setSelectedGpsRadius(r.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.fullOptionTitle, isSelected && { color: COLORS.brandGreen }]}>
                      {r.label}
                    </Text>
                    <Text style={styles.fullOptionSub}>{r.sub}</Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionHeading}>HOW IT WORKS</Text>
          <View style={styles.infoBanner}>
            <Ionicons name="map-outline" size={18} color={COLORS.brandGreen} />
            <Text style={styles.infoBannerText}>
              When you submit an issue within the selected radius of your home anchor, the app introduces a deterministic pseudo-random offset. Municipal authorities still see the correct public road segment, but hostile actors cannot pinpoint your residential address.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setActivePage('main')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Save GPS Privacy Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 3: Biometric Security & App Lock
  // =========================================================================
  if (activePage === 'biometricLock') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('Biometric Security')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          {/* Master Toggle */}
          <View style={styles.masterToggleCard}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.masterToggleTitle}>Require Biometric Authentication</Text>
              <Text style={styles.masterToggleSub}>
                Use Face ID or Fingerprint to unlock Argus Panoptes and authorize audit signatures
              </Text>
            </View>
            <Switch
              value={isAppLockEnabled}
              onValueChange={setIsAppLockEnabled}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text style={styles.sectionHeading}>AUTO-LOCK TIMEOUT</Text>
          <View style={styles.optionsList}>
            {LOCK_TIMEOUTS.map((t) => {
              const isSelected = selectedLockTimeout === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.fullOptionCard, isSelected && styles.fullOptionCardActive]}
                  onPress={() => setSelectedLockTimeout(t.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.fullOptionTitle, isSelected && { color: COLORS.brandGreen }]}>
                      {t.label}
                    </Text>
                    <Text style={styles.fullOptionSub}>{t.sub}</Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoBanner}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.brandGreen} />
            <Text style={styles.infoBannerText}>
              Your private cryptographic keys and unsubmitted draft inspections are stored in hardware-isolated secure enclaves on your device.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setActivePage('main')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 4: Push & Alert Notifications
  // =========================================================================
  if (activePage === 'notifications') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('Notification Preferences')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          {/* Master Toggle */}
          <View style={styles.masterToggleCard}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.masterToggleTitle}>Master Notifications</Text>
              <Text style={styles.masterToggleSub}>
                Allow real-time push alerts on civic developments
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text style={styles.sectionHeading}>ALERT CHANNELS</Text>
          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.toggleRowTitle}>Issue Status Changes</Text>
                <Text style={styles.toggleRowSub}>
                  Receive alerts when reported problems transition to Under Review or Resolved
                </Text>
              </View>
              <Switch
                value={notifChannels.statusChanges}
                onValueChange={(val) => setNotifChannels((p) => ({ ...p, statusChanges: val }))}
                trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.toggleRowTitle}>Upvotes & Discussion Replies</Text>
                <Text style={styles.toggleRowSub}>
                  When neighbors support your report or add photo evidence in comments
                </Text>
              </View>
              <Switch
                value={notifChannels.upvotesAndComments}
                onValueChange={(val) => setNotifChannels((p) => ({ ...p, upvotesAndComments: val }))}
                trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.toggleRowTitle}>Ward Maintenance Bulletins</Text>
                <Text style={styles.toggleRowSub}>
                  Scheduled power grid load-shedding and municipal pipeline repair notices
                </Text>
              </View>
              <Switch
                value={notifChannels.wardAlerts}
                onValueChange={(val) => setNotifChannels((p) => ({ ...p, wardAlerts: val }))}
                trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.toggleRowTitle}>Emergency Civic Broadcasts</Text>
                <Text style={styles.toggleRowSub}>
                  Monsoon flash-flood warnings and statutory public safety advisories
                </Text>
              </View>
              <Switch
                value={notifChannels.emergencyBroadcasts}
                onValueChange={(val) => setNotifChannels((p) => ({ ...p, emergencyBroadcasts: val }))}
                trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setActivePage('main')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Save Alert Preferences</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 5: Language Selection
  // =========================================================================
  if (activePage === 'language') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('Language & Region')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          <Text style={styles.sectionHeading}>CHOOSE INTERFACE LANGUAGE</Text>
          <View style={styles.optionsList}>
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.label;
              return (
                <TouchableOpacity
                  key={lang.id}
                  style={[styles.fullOptionCard, isSelected && styles.fullOptionCardActive]}
                  onPress={() => {
                    setLanguage(lang.label);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fullOptionTitle, isSelected && { color: COLORS.brandGreen }]}>
                      {lang.label}
                    </Text>
                    <Text style={styles.fullOptionSub}>{lang.native} • {lang.sub}</Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoBanner}>
            <Ionicons name="globe-outline" size={18} color={COLORS.brandGreen} />
            <Text style={styles.infoBannerText}>
              Changing language updates official category labels, municipal inspection rubrics, and statutory RTI application templates.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setActivePage('main')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Apply Language</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 6: Civic Verification & DigiLocker e-KYC
  // =========================================================================
  if (activePage === 'civicVerification') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('Civic Verification')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          {/* Status Badge Banner */}
          <View style={styles.verifiedHeaderBanner}>
            <Ionicons name="checkmark-circle" size={32} color="#15803D" />
            <Text style={styles.verifiedHeaderTitle}>Government Verified Citizen Auditor</Text>
            <Text style={styles.verifiedHeaderSub}>Linked via National DigiLocker Ecosystem</Text>
          </View>

          {/* Credentials Card */}
          <Text style={styles.sectionHeading}>DIGILOCKER CREDENTIAL RECORD</Text>
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Legal Name</Text>
              <Text style={styles.identityVal}>{user?.name || 'Citizen Auditor'}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Aadhaar UID Token</Text>
              <Text style={styles.identityVal}>XXXX-XXXX-4912</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Decentralized Citizen ID</Text>
              <Text style={styles.identityVal}>{user?.handle || 'u/citizen_402'}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Municipal Jurisdiction</Text>
              <Text style={styles.identityVal}>{user?.ward || 'Ward 102, Khairatabad Circle'}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Cryptographic Trust Hash</Text>
              <Text style={styles.identityMono}>0x7F4B92C...99A2</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Issuing Authority</Text>
              <Text style={styles.identityVal}>Ministry of Electronics & IT (MeitY)</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>AUDITOR PRIVILEGES</Text>
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.brandGreen} />
            <Text style={styles.infoBannerText}>
              Verified auditors possess statutory credibility under Section 4 of the Civic Accountability Code. Inspections submitted with photographic proof trigger mandatory 48-hour municipal review clocks.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => {
              if (Platform.OS === 'web') alert('Credentials verified and refreshed.');
              else Alert.alert('Verified', 'Credentials verified and refreshed.');
              setActivePage('main');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Refresh DigiLocker Credentials</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 7: Export Civic Data
  // =========================================================================
  if (activePage === 'exportData') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('Export My Data')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          <Text style={styles.sectionHeading}>SELECT EXPORT FORMAT</Text>
          <View style={styles.optionsList}>
            {EXPORT_FORMATS.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <TouchableOpacity
                  key={fmt.id}
                  style={[styles.fullOptionCard, isSelected && styles.fullOptionCardActive]}
                  onPress={() => setSelectedFormat(fmt.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Feather name={fmt.icon} size={15} color={isSelected ? COLORS.brandGreen : COLORS.charcoal} />
                      <Text style={[styles.fullOptionTitle, isSelected && { color: COLORS.brandGreen }]}>
                        {fmt.label}
                      </Text>
                    </View>
                    <Text style={styles.fullOptionSub}>{fmt.sub}</Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionHeading}>ARCHIVE SCOPE</Text>
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Total Inspections</Text>
              <Text style={styles.identityVal}>14 Verified Records</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Photographic Proofs</Text>
              <Text style={styles.identityVal}>28 High-Res Evidence Photos</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Verification Records</Text>
              <Text style={styles.identityVal}>14 Verified Records</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryActionBtn, isExporting && { opacity: 0.7 }]}
            onPress={handleStartExport}
            disabled={isExporting}
            activeOpacity={0.85}
          >
            <Feather name="download" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>
              {isExporting ? 'Generating Archive...' : 'Download My Data Archive'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 8: Storage & Local Cache
  // =========================================================================
  if (activePage === 'storageCache') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('Storage & Cache')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          <Text style={styles.sectionHeading}>LOCAL STORAGE USAGE</Text>
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Photo Evidence Cache</Text>
              <Text style={styles.identityVal}>32.4 MB</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Offline GIS Map Tiles</Text>
              <Text style={styles.identityVal}>14.2 MB</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Offline Database Index</Text>
              <Text style={styles.identityVal}>2.0 MB</Text>
            </View>
            <View style={[styles.identityRow, styles.storageTotalRow]}>
              <Text style={styles.storageTotalLabel}>Total Device Storage</Text>
              <Text style={styles.storageTotalVal}>{cachedDataSize}</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>CACHE AUTOMATION</Text>
          <View style={styles.masterToggleCard}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.masterToggleTitle}>Auto-Clear Synced Evidence</Text>
              <Text style={styles.masterToggleSub}>
                Automatically clean temporary photos once submitted and confirmed
              </Text>
            </View>
            <Switch
              value={autoClearCache}
              onValueChange={setAutoClearCache}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={styles.dangerActionBtn}
            onPress={handleClearCache}
            activeOpacity={0.85}
          >
            <Feather name="trash-2" size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.dangerActionBtnText}>Clear Temporary Cache</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // SUBPAGE 9: About Argus Panoptes
  // =========================================================================
  if (activePage === 'about') {
    return (
      <View style={styles.subPageRoot}>
        {renderSubPageHeader('About Argus Panoptes')}
        <ScrollView style={styles.subPageScroll} contentContainerStyle={styles.subPageScrollContent}>
          <View style={styles.aboutHeaderCard}>
            <View style={styles.aboutLogoCircle}>
              <Ionicons name="eye" size={28} color={COLORS.brandGreen} />
            </View>
            <Text style={styles.aboutAppName}>Argus Panoptes</Text>
            <Text style={styles.aboutAppVersion}>Version 2.4.0 • Build 8821</Text>
            <Text style={styles.aboutAppTagline}>
              Decentralized Civic Infrastructure Oversight System
            </Text>
          </View>

          <Text style={styles.sectionHeading}>MISSION</Text>
          <View style={styles.infoBanner}>
            <Ionicons name="shield-outline" size={18} color={COLORS.brandGreen} />
            <Text style={styles.infoBannerText}>
              Argus Panoptes empowers residents to hold municipal authorities and road contractors accountable through immutable photographic evidence, tamper-proof hashes, and collective civic action.
            </Text>
          </View>

          <Text style={styles.sectionHeading}>SYSTEM & LEGAL</Text>
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Sovereign Node ID</Text>
              <Text style={styles.identityMono}>HYD-WEST-CR09</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Network Consensus</Text>
              <Text style={styles.identityVal}>Proof-of-Observation</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Licensing</Text>
              <Text style={styles.identityVal}>Apache License 2.0 (Open Source)</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>Data Jurisdiction</Text>
              <Text style={styles.identityVal}>Constitution of India, Art. 19(1)(a)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setActivePage('main')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // MAIN SETTINGS MENU SCREEN
  // =========================================================================
  return (
    <ScrollView style={styles.profileScrollView} contentContainerStyle={styles.profileScrollContent}>
      {/* Settings Top Header with Back Arrow */}
      <TouchableOpacity
        style={styles.settingsHeaderRow}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={22} color={COLORS.charcoal} />
        <Text style={styles.settingsHeaderTitle}>Settings</Text>
      </TouchableOpacity>

      {/* SECTION 1: Privacy & Security */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Privacy & Security</Text>
        <View style={styles.menuList}>
          {/* Anonymous / Pseudonymous Auditing */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('anonymousAuditing')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="eye-off" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Anonymous Auditing</Text>
                <Text style={styles.menuSubtitle}>
                  {pseudonymousMode ? 'Enabled • Identity masked' : 'Disabled • Real name public'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          {/* GPS Home Radius Guard */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('gpsPrivacy')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="map-pin" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>GPS Privacy Zone</Text>
                <Text style={styles.menuSubtitle}>
                  {homeRadiusMasking ? `Active • ${selectedGpsRadius} fuzzy radius` : 'Inactive • Exact GPS'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          {/* Biometric App Lock */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('biometricLock')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="lock" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>App Biometric Lock</Text>
                <Text style={styles.menuSubtitle}>
                  {isAppLockEnabled ? `Active • ${selectedLockTimeout}` : 'Disabled'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacious Section Divider */}
      <View style={styles.thickSectionDivider} />

      {/* SECTION 2: App Preferences */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Preferences</Text>
        <View style={styles.menuList}>
          {/* Theme & Appearance Row with Segmented Pill */}
          <View style={styles.appearanceRowBlock}>
            <View style={styles.appearanceHeaderRow}>
              <View style={styles.menuIconWrap}>
                <Feather name="moon" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Theme & Appearance</Text>
            </View>
            <View style={styles.segmentedControl}>
              {[
                { id: 'system', label: 'System' },
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ].map((option) => {
                const isActive = (themeMode || 'system') === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                    onPress={() => setThemeMode(option.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Push & Alerts Notifications */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('notifications')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="bell" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Push Notifications</Text>
                <Text style={styles.menuSubtitle}>
                  {notificationsEnabled ? 'Active • Custom alerts configured' : 'Muted'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          {/* Wi-Fi Only Sync */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="wifi" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Sync on Wi-Fi Only</Text>
                <Text style={styles.menuSubtitle}>
                  {autoSyncWifi ? 'Save mobile cellular data' : 'Sync over any network'}
                </Text>
              </View>
            </View>
            <Switch
              value={autoSyncWifi}
              onValueChange={setAutoSyncWifi}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Language Selection */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('language')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="globe" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Language</Text>
                <Text style={styles.menuSubtitle}>Regional dialect & labels</Text>
              </View>
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.menuValueText}>{language}</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacious Section Divider */}
      <View style={styles.thickSectionDivider} />

      {/* SECTION 3: Data, Storage & Civic Trust */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Data, Storage & Trust</Text>
        <View style={styles.menuList}>
          {/* Civic Trust / DigiLocker Verification */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('civicVerification')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="shield" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Civic Verification</Text>
                <Text style={styles.menuSubtitle}>Aadhaar / DigiLocker e-KYC</Text>
              </View>
            </View>
            <View style={styles.linkRow}>
              <Ionicons name="checkmark-circle" size={15} color={COLORS.brandGreen} />
              <Text style={styles.linkedText}>Verified</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>

          {/* Export Civic Data */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('exportData')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="download" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Export My Data</Text>
                <Text style={styles.menuSubtitle}>Download civic reports and activity archives</Text>
              </View>
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.menuValueText}>GeoJSON / CSV</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>

          {/* Storage & Local Cache */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('storageCache')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="hard-drive" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Storage & Cache</Text>
                <Text style={styles.menuSubtitle}>Offline maps & photo evidence</Text>
              </View>
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.menuValueText}>{cachedDataSize}</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>

          {/* About Argus Panoptes */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActivePage('about')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="info" size={20} color={COLORS.charcoal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>About Argus Panoptes</Text>
                <Text style={styles.menuSubtitle}>v2.4.0 • Sovereign Civic Node</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileScrollView: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  profileScrollContent: {
    paddingBottom: 120,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 14,
    paddingHorizontal: 24,
  },
  settingsHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: -0.3,
  },
  profileSectionBlock: {
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  menuList: {
    gap: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  menuIconWrap: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  menuSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  menuValueText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkedText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  thickSectionDivider: {
    height: 8,
    backgroundColor: COLORS.divider,
    marginVertical: 16,
  },

  // Appearance Segmented Control
  appearanceRowBlock: {
    gap: 10,
  },
  appearanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderRadius: 10,
    padding: 3,
    marginTop: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.charcoal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  segmentBtnTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },

  // Dedicated Subpage Styles
  subPageRoot: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  subPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: COLORS.white,
  },
  subPageBackBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  subPageHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: -0.2,
  },
  subPageScroll: {
    flex: 1,
  },
  subPageScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },
  masterToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  masterToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  masterToggleSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 3,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 6,
  },
  identityCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identityKey: {
    fontSize: 13,
    color: '#64748B',
  },
  identityVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  identityMono: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    color: '#334155',
  },
  identityBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  identityBadgeGreenText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  infoBannerText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  dangerActionBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  fullOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  fullOptionCardActive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#0F172A',
  },
  fullOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  fullOptionSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 3,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: COLORS.brandGreen,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brandGreen,
  },
  toggleGroup: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  toggleRowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleRowSub: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  verifiedHeaderBanner: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  verifiedHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    textAlign: 'center',
  },
  verifiedHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  storageTotalRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  storageTotalLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  storageTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  aboutHeaderCard: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 20,
  },
  aboutLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  aboutAppName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  aboutAppVersion: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandGreen,
    marginTop: 2,
  },
  aboutAppTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
