import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { id: 'en', label: 'English', sub: 'Default' },
  { id: 'hi', label: 'हिंदी', sub: 'Hindi' },
  { id: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
  { id: 'ta', label: 'தமிழ்', sub: 'Tamil' },
  { id: 'te', label: 'తెలుగు', sub: 'Telugu' },
];

const EXPORT_FORMATS = [
  { id: 'geojson', label: 'GeoJSON Archive', sub: 'GIS mapping & spatial evidence layers' },
  { id: 'csv', label: 'CSV Spreadsheets', sub: 'Compatible with Excel & Google Sheets' },
  { id: 'json', label: 'Raw JSON Ledger', sub: 'Full cryptographic audit history' },
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

  // Modals state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('geojson');
  const [isExporting, setIsExporting] = useState(false);

  const handleStartExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsExportModalOpen(false);
      const format = (selectedFormat || 'GEOJSON').toUpperCase();
      const handle = user?.handle || 'user';
      alert(`Export Successful: Saved ${handle} audit ledger as ${format}`);
    }, 900);
  };

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
          {/* Anonymous / Pseudonymous Auditing Toggle */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="eye-off" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Anonymous Auditing</Text>
            </View>
            <Switch
              value={pseudonymousMode}
              onValueChange={setPseudonymousMode}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* GPS Home Radius Guard Toggle */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="map-pin" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>GPS Privacy Zone</Text>
            </View>
            <Switch
              value={homeRadiusMasking}
              onValueChange={setHomeRadiusMasking}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Biometric App Lock Toggle */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="lock" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>App Biometric Lock</Text>
            </View>
            <Switch
              value={isAppLockEnabled}
              onValueChange={setIsAppLockEnabled}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>
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

          {/* Push & SMS Notifications */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="bell" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E2E4E6', true: COLORS.brandGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Wi-Fi Only Sync Toggle */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="wifi" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Sync on Wi-Fi Only</Text>
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
            onPress={() => setIsLanguageModalOpen(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="globe" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Language</Text>
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

      {/* SECTION 3: Data & Civic Trust */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Data & Civic Trust</Text>
        <View style={styles.menuList}>
          {/* Civic Trust / DigiLocker Verification */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setIsVerificationModalOpen(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="shield" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Civic Verification</Text>
            </View>
            <View style={styles.linkRow}>
              <Ionicons name="checkmark-circle" size={15} color={COLORS.brandGreen} />
              <Text style={styles.linkedText}>DigiLocker Linked</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>

          {/* Export Audit Ledger */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setIsExportModalOpen(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="download" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Export My Data</Text>
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.menuValueText}>CSV / JSON</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===================================================
          MODAL 1: Interactive Language Picker Modal
      =================================================== */}
      <Modal
        visible={isLanguageModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsLanguageModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Select Language</Text>
              <TouchableOpacity onPress={() => setIsLanguageModalOpen(false)}>
                <Feather name="x" size={22} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Choose your preferred municipal and auditing language:</Text>

            <View style={styles.modalList}>
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.label;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    style={[styles.modalOptionRow, isSelected && styles.modalOptionRowActive]}
                    onPress={() => {
                      setLanguage(lang.label);
                      setIsLanguageModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[styles.modalOptionTitle, isSelected && { color: COLORS.brandGreen }]}>
                        {lang.label}
                      </Text>
                      <Text style={styles.modalOptionSub}>{lang.sub}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.brandGreen} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL 2: DigiLocker Verification Details Modal
      =================================================== */}
      <Modal
        visible={isVerificationModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsVerificationModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Civic Trust & e-KYC</Text>
              <TouchableOpacity onPress={() => setIsVerificationModalOpen(false)}>
                <Feather name="x" size={22} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Government-verified citizen auditor credentials:</Text>

            <View style={styles.verifyCard}>
              <View style={styles.verifyBadgeRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.brandGreen} />
                <Text style={styles.verifyBadgeTitle}>DigiLocker Linked & Verified</Text>
              </View>

              <View style={styles.verifyInfoGrid}>
                <View style={styles.verifyInfoItem}>
                  <Text style={styles.verifyInfoLabel}>Auditor Name</Text>
                  <Text style={styles.verifyInfoVal}>{user.name}</Text>
                </View>
                <View style={styles.verifyInfoItem}>
                  <Text style={styles.verifyInfoLabel}>Decentralized ID</Text>
                  <Text style={styles.verifyInfoVal}>{user.handle}</Text>
                </View>
                <View style={styles.verifyInfoItem}>
                  <Text style={styles.verifyInfoLabel}>Municipal Ward</Text>
                  <Text style={styles.verifyInfoVal}>{user.ward}</Text>
                </View>
                <View style={styles.verifyInfoItem}>
                  <Text style={styles.verifyInfoLabel}>Trust Hash</Text>
                  <Text style={styles.verifyInfoVal}>0x7F4B...99A2</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsVerificationModalOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL 3: Interactive Data Export Modal
      =================================================== */}
      <Modal
        visible={isExportModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsExportModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Export Audit Ledger</Text>
              <TouchableOpacity onPress={() => setIsExportModalOpen(false)}>
                <Feather name="x" size={22} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Download your verified inspections for RTI and research:</Text>

            <View style={styles.modalList}>
              {EXPORT_FORMATS.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <TouchableOpacity
                    key={fmt.id}
                    style={[styles.modalOptionRow, isSelected && styles.modalOptionRowActive]}
                    onPress={() => setSelectedFormat(fmt.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.modalOptionTitle, isSelected && { color: COLORS.brandGreen }]}>
                        {fmt.label}
                      </Text>
                      <Text style={styles.modalOptionSub}>{fmt.sub}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.exportSubmitBtn}
              onPress={handleStartExport}
              disabled={isExporting}
              activeOpacity={0.85}
            >
              <Feather name="download" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.exportSubmitBtnText}>
                {isExporting ? 'Generating Archive...' : 'Download My Data'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileScrollView: {
    flex: 1,
  },
  profileScrollContent: {
    paddingBottom: 120,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
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
    paddingVertical: 6,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 18,
  },
  menuList: {
    gap: 22,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginVertical: 18,
  },

  // Appearance Segmented Control
  appearanceRowBlock: {
    gap: 12,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalList: {
    gap: 10,
    marginBottom: 16,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOptionRowActive: {
    borderColor: COLORS.brandGreen,
    backgroundColor: '#EDF5F0',
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  modalOptionSub: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
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
  exportSubmitBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportSubmitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  verifyCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  verifyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  verifyBadgeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  verifyInfoGrid: {
    gap: 10,
  },
  verifyInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifyInfoLabel: {
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '600',
  },
  verifyInfoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.charcoal,
    textAlign: 'right',
  },
  modalCloseBtn: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
