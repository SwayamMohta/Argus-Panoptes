import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useIssues } from '../context/IssuesContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_IMAGES } from '../constants/categoryImages';

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

export const CreateIssueScreen = ({
  category,
  initialImageUri = null,
  initialLocation = '',
  onBack,
  onSuccess,
}) => {
  const activeCategory = category || CATEGORIES_DATA[2];
  const { addIssue } = useIssues();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(initialLocation || '');
  const [imageUri, setImageUri] = useState(initialImageUri || null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  // Quick fallback to use standard category photo as mock sample evidence
  const handleUseSamplePhoto = () => {
    const sampleImg = CATEGORY_IMAGES[activeCategory.id] || null;
    setImageUri(sampleImg);
  };

  const handleSelectQuickLocality = (loc) => {
    setLocation(loc);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter an issue title.');
      return;
    }
    if (title.trim().length < 5) {
      setErrorMsg('Title should be at least 5 characters.');
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

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const created = addIssue({
        categoryId: activeCategory.id,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        image: imageUri,
        imageCaption: imageUri ? 'Citizen submitted evidence photograph' : null,
        isAnonymous: isAnonymous,
        author: isAnonymous ? 'Anonymous Citizen' : (user?.name || 'u/civic_citizen'),
      });

      setIsSubmitting(false);
      if (onSuccess) {
        onSuccess(created.id);
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('Failed to submit issue. Please try again.');
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

                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={handleUseSamplePhoto}
                  activeOpacity={0.75}
                >
                  <Ionicons name="document-attach" size={18} color={COLORS.brandGreen} />
                  <Text style={[styles.photoActionText, { color: COLORS.brandGreen }]}>
                    Sample Photo
                  </Text>
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

