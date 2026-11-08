import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useIssues } from '../context/IssuesContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { isInHyderabad } from '../lib/format';

const QUICK_LOCALITIES = [
  'Banjara Hills',
  'Jubilee Hills',
  'Madhapur',
  'Gachibowli',
  'Hitec City',
  'Begumpet',
  'Secunderabad',
  'Kondapur',
];

const FALLBACK_CATEGORY = {
  id: 'roads',
  name: 'Roads & Works',
  shortName: 'Roads',
  icon: 'car-outline',
  color: '#4B5563',
  bgColor: '#F1F5F9',
  checkpoints: [],
};

export const CreateIssueScreen = ({
  category,
  initialImageUri = null,
  initialLocation = '',
  initialArea = null,
  onBack,
  onSuccess,
}) => {
  const activeCategory = category || FALLBACK_CATEGORY;
  const { createIssue } = useIssues();
  const { requireAuth } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(initialLocation || '');
  const [imageUri, setImageUri] = useState(initialImageUri || null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [coords, setCoords] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [areaLabel, setAreaLabel] = useState(initialArea?.name || '');
  const [wards, setWards] = useState([]);
  const [wardQuery, setWardQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .wards()
      .then((rows) => {
        if (!active) return;
        setWards(rows || []);
        if (initialArea?.id) {
          const match = (rows || []).find((ward) => ward.id === initialArea.id);
          if (match) {
            setSelectedWard(match);
            setWardQuery(match.name);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialArea?.id]);

  const wardResults = useMemo(() => {
    const query = wardQuery.toLowerCase().trim();
    if (!query || selectedWard) return [];
    return wards
      .filter(
        (ward) =>
          ward.name.toLowerCase().includes(query) ||
          (ward.zone || '').toLowerCase().includes(query) ||
          (ward.circle || '').toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [wardQuery, wards, selectedWard]);

  const selectWard = (ward) => {
    setSelectedWard(ward);
    setWardQuery(ward.name);
    if (!location.trim()) setLocation(ward.name);
    if (errorMsg) setErrorMsg('');
  };

  const clearWard = () => {
    setSelectedWard(null);
    setWardQuery('');
  };

  const handleUseLocation = async () => {
    setGpsBusy(true);
    setErrorMsg('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission is required to map the report to a GHMC ward.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lon: longitude });
      const lookup = await api.areaAt(latitude, longitude);
      if (lookup.status === 'matched') {
        setAreaLabel(lookup.area.name);
        if (!location.trim()) setLocation(lookup.area.name);
        const match = wards.find(
          (ward) => ward.id === lookup.area.id || ward.name === lookup.area.name
        );
        if (match) selectWard(match);
        else {
          setSelectedWard({ id: lookup.area.id, name: lookup.area.name, zone: '', circle: '' });
          setWardQuery(lookup.area.name);
        }
      } else if (lookup.status === 'ambiguous') {
        setAreaLabel('Ward boundary — pick a nearby ward');
      } else {
        let nearest = [];
        try {
          nearest = await api.nearestAreas(latitude, longitude, 1);
        } catch {
          // Nearest-ward lookup is best effort.
        }
        setAreaLabel(
          nearest[0]
            ? `No GHMC ward matched (nearest ${nearest[0].area.name}, ~${Math.round(
                nearest[0].distanceM
              )} m)`
            : 'No GHMC ward matched'
        );
      }
    } catch (error) {
      setErrorMsg(error.message || 'Could not read your location.');
    } finally {
      setGpsBusy(false);
    }
  };

  // Handle Photo Picker from Gallery
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant gallery permission to attach evidence photos.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  // Handle Camera Capture
  const handleTakePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera permission to snap evidence.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  const handleSelectQuickLocality = (loc) => {
    setLocation(loc);
  };

  const handleSubmit = async () => {
    if (!requireAuth()) return;
    if (title.trim().length < 5) {
      setErrorMsg('Please enter an issue title of at least 5 characters.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe the problem.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Please provide the area or location.');
      return;
    }
    if (!coords) {
      setErrorMsg('Tap "Use My Location" so the report can be mapped to a GHMC ward.');
      return;
    }
    if (!selectedWard && !isInHyderabad(coords.lat, coords.lon)) {
      setErrorMsg(
        'Your GPS location is outside the automatic Hyderabad area. Select a ward manually to submit.'
      );
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const created = await createIssue({
        categoryId: activeCategory.id,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        lat: coords.lat,
        lon: coords.lon,
        areaId: selectedWard?.id,
        imageUri,
        isAnonymous,
      });
      if (created?.imageUploadError) {
        Alert.alert('Report published', `The report was saved, but the photo failed: ${created.imageUploadError}`);
      }
      if (onSuccess) onSuccess(created);
      else if (onBack) onBack();
    } catch (error) {
      setErrorMsg(error.message || 'Failed to submit issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={COLORS.charcoal} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Report Civic Issue</Text>

          <TouchableOpacity
            style={[styles.submitHeaderBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitHeaderBtnText}>
              {isSubmitting ? 'Posting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Body Scroll */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category Assigned Indicator */}
          <View style={styles.categoryCard}>
            <View style={styles.categoryCardLeft}>
              <View style={[styles.catIconWrap, { backgroundColor: activeCategory.bgColor || '#F1F5F9' }]}>
                <Ionicons
                  name={activeCategory.icon || 'grid-outline'}
                  size={16}
                  color={activeCategory.color || COLORS.brandGreen}
                />
              </View>
              <View>
                <Text style={styles.categoryLabel}>ASSIGNED CATEGORY</Text>
                <Text style={styles.categoryName}>{activeCategory.name}</Text>
              </View>
            </View>
            <View style={styles.autoAssignedPill}>
              <Text style={styles.autoAssignedText}>Auto-Assigned</Text>
            </View>
          </View>

          {/* Validation Error Message Banner */}
          {!!errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          {/* Field 1: Issue Title */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>ISSUE TITLE</Text>
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>
            <TextInput
              style={styles.inputTitle}
              placeholder="e.g. Dangerous pothole near main junction"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={(txt) => {
                setTitle(txt);
                if (errorMsg) setErrorMsg('');
              }}
              maxLength={100}
            />
          </View>

          {/* Field 2: Problem Description */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>PROBLEM DESCRIPTION</Text>
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>
            <TextInput
              style={styles.inputDesc}
              placeholder="Explain the specific civic issue, dimensions, hazard severity, or history..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={(txt) => {
                setDescription(txt);
                if (errorMsg) setErrorMsg('');
              }}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Field 3: Location / Locality */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>LOCALITY / AREA</Text>
            </View>
            <View style={styles.locationInputWrapper}>
              <Ionicons name="location-outline" size={17} color={COLORS.subtext} />
              <TextInput
                style={styles.inputLocation}
                placeholder="e.g. Banjara Hills, Rd #12"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={(txt) => {
                  setLocation(txt);
                  if (errorMsg) setErrorMsg('');
                }}
                maxLength={255}
              />
            </View>

            {/* Quick Locality Pickers */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.localityChipsScroll}
              contentContainerStyle={styles.localityChipsContent}
            >
              {QUICK_LOCALITIES.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.localityChip,
                    location === loc && styles.localityChipSelected,
                  ]}
                  onPress={() => handleSelectQuickLocality(loc)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.localityChipText,
                      location === loc && styles.localityChipTextSelected,
                    ]}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleUseLocation}
              disabled={gpsBusy}
              activeOpacity={0.8}
            >
              {gpsBusy ? (
                <ActivityIndicator size="small" color={COLORS.charcoal} />
              ) : (
                <Ionicons name="locate" size={18} color={COLORS.charcoal} />
              )}
              <View style={styles.gpsTextGroup}>
                <Text style={styles.gpsButtonTitle}>
                  {coords ? 'Location Captured' : 'Use My Location'}
                </Text>
                <Text style={styles.gpsButtonSub}>
                  {coords
                    ? `${areaLabel || 'Hyderabad'} · ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`
                    : 'Get coordinates and resolve the ward automatically'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.wardSearchBlock}>
              <Text style={styles.fieldLabel}>WARD (MANUAL SELECTION)</Text>
              <View style={styles.wardSearchRow}>
                <Ionicons name="search-outline" size={16} color={COLORS.subtext} />
                <TextInput
                  style={styles.wardSearchInput}
                  placeholder="Search GHMC ward name, zone, or circle..."
                  placeholderTextColor="#94A3B8"
                  value={wardQuery}
                  onChangeText={(value) => {
                    setWardQuery(value);
                    if (selectedWard) setSelectedWard(null);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoCorrect={false}
                />
                {!!selectedWard && (
                  <TouchableOpacity onPress={clearWard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.wardAutoText}>Auto</Text>
                  </TouchableOpacity>
                )}
              </View>

              {wardResults.length > 0 && (
                <View style={styles.wardResultsList}>
                  {wardResults.map((ward) => (
                    <TouchableOpacity
                      key={ward.id}
                      style={styles.wardResultRow}
                      onPress={() => selectWard(ward)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.wardResultName}>{ward.name}</Text>
                      <Text style={styles.wardResultMeta}>
                        {[ward.zone, ward.circle].filter(Boolean).join(' · ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!!selectedWard && (
                <View style={styles.selectedWardCard}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.brandGreen} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedWardName}>{selectedWard.name}</Text>
                    <Text style={styles.selectedWardMeta}>
                      {[selectedWard.zone, selectedWard.circle].filter(Boolean).join(' · ') ||
                        'Manual ward'}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.wardHint}>
                Optional. A manually selected ward overrides automatic detection and is marked
                “manual”. Location coordinates are still taken from your GPS.
              </Text>
            </View>
          </View>

          {/* Field 4: Evidence Photo */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>EVIDENCE PHOTOGRAPH (OPTIONAL)</Text>
            </View>

            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image
                  source={typeof imageUri === 'string' ? { uri: imageUri } : imageUri}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setImageUri(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={handleTakePhoto}
                  activeOpacity={0.75}
                >
                  <Ionicons name="camera" size={18} color={COLORS.charcoal} />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.75}
                >
                  <Ionicons name="images" size={18} color={COLORS.charcoal} />
                  <Text style={styles.photoActionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Field 5: Anonymous Reporting Toggle */}
          <View style={styles.anonymousCard}>
            <View style={styles.anonymousLeft}>
              <Ionicons
                name="finger-print-outline"
                size={20}
                color={isAnonymous ? COLORS.brandGreen : '#64748B'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.anonymousTitle}>Post as Anonymous Citizen</Text>
                <Text style={styles.anonymousSubtitle}>
                  Hide your username and profile. The report will display as "Anonymous Citizen".
                </Text>
              </View>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={isAnonymous ? COLORS.brandGreen : '#F8FAFC'}
            />
          </View>

          {/* Statutory Verification Callout */}
          <View style={styles.statutoryCallout}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#64748B" />
            <Text style={styles.statutoryCalloutText}>
              Submissions receive tamper-resistant cryptographic hashes and are cross-referenced
              with municipal division rosters.
            </Text>
          </View>

          {/* Bottom Submit Button */}
          <TouchableOpacity
            style={[styles.primarySubmitButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
            <Text style={styles.primarySubmitButtonText}>
              {isSubmitting ? 'Publishing Issue...' : 'Publish to Category Feed'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wardSearchBlock: {
    marginTop: 14,
  },
  wardSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  wardSearchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.charcoal,
    padding: 0,
  },
  wardAutoText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  wardResultsList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  wardResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  wardResultName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  wardResultMeta: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 1,
  },
  selectedWardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedWardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14532D',
  },
  selectedWardMeta: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  wardHint: {
    fontSize: 10.5,
    color: COLORS.subtext,
    lineHeight: 15,
    marginTop: 6,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  gpsTextGroup: {
    flex: 1,
  },
  gpsButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  gpsButtonSub: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  submitHeaderBtn: {
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  submitHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  categoryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  autoAssignedPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  autoAssignedText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  inputTitle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputDesc: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  inputLocation: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 2,
  },
  localityChipsScroll: {
    marginTop: 2,
  },
  localityChipsContent: {
    gap: 6,
  },
  localityChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  localityChipSelected: {
    backgroundColor: '#1E2328',
    borderColor: '#1E2328',
  },
  localityChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  localityChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  previewContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#000000',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  removePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  anonymousCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  anonymousLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  anonymousSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  statutoryCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  statutoryCalloutText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  primarySubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primarySubmitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

