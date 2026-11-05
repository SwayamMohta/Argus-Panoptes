import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

export const EditProfileScreen = ({ onBack }) => {
  const {
    user,
    updateUserProfile,
    updateAvatarUrl,
    resetAvatar,
  } = useAuth();

  // Personal & Contact State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Address & Location State
  const [address, setAddress] = useState(user?.address || '');
  const [area, setArea] = useState(user?.area || user?.ward || '');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [state, setState] = useState(user?.state || 'Karnataka');
  const [pincode, setPincode] = useState(user?.pincode || '');

  // Photo Selection Sheet State
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);

  const isImageAvatar = user.avatarType === 'image' && !!user.avatarUri;

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter your legal name.');
      return;
    }
    updateUserProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      area: area.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      ward: area.trim() ? `${area.trim()}, ${city.trim()}` : user.ward,
    });
    onBack();
  };

  const pickImageFromGallery = async () => {
    try {
      setIsLoadingPhoto(true);

      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant permission to access your photo gallery to upload a profile picture.'
          );
          setIsLoadingPhoto(false);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        updateAvatarUrl(pickedUri);
        setIsPhotoPickerOpen(false);
      }
    } catch (error) {
      console.warn('Gallery picker fallback:', error);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              updateAvatarUrl(event.target.result);
              setIsPhotoPickerOpen(false);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } finally {
      setIsLoadingPhoto(false);
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      setIsLoadingPhoto(true);

      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Please grant camera access to take a profile picture.'
          );
          setIsLoadingPhoto(false);
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedUri = result.assets[0].uri;
        updateAvatarUrl(capturedUri);
        setIsPhotoPickerOpen(false);
      }
    } catch (error) {
      console.warn('Camera error:', error);
      alert('Camera is unavailable. Please choose from gallery.');
    } finally {
      setIsLoadingPhoto(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      {/* 1. Header Navigation Bar (Cancel | Title | Save) */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={styles.navBtn}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.navTitle}>Edit Profile</Text>

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.7}
          style={styles.navBtn}
        >
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Hero Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setIsPhotoPickerOpen(true)}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: isImageAvatar ? COLORS.white : user.avatarBg },
              ]}
            >
              {isImageAvatar ? (
                <Image
                  source={{ uri: user.avatarUri }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Feather
                  name={user.avatarIcon || 'user'}
                  size={38}
                  color={user.avatarIconColor || COLORS.charcoal}
                />
              )}
            </View>
            <View style={styles.cameraIconBadge}>
              <Feather name="camera" size={13} color={COLORS.white} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsPhotoPickerOpen(true)}
            activeOpacity={0.7}
            style={styles.changePhotoBtn}
          >
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        {/* 3. SECTION 1: Personal & Contact Details (Merged) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Personal & Contact Info</Text>

          <View style={styles.formCard}>
            {/* Legal Name */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Full Legal Name"
                placeholderTextColor={COLORS.muted}
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>

            <View style={styles.fieldDivider} />

            {/* Handle (Read-only / Cryptographic ID) */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Handle</Text>
              <View style={styles.readOnlyWrap}>
                <Text style={styles.readOnlyText}>{user.handle}</Text>
                <Feather name="lock" size={13} color="#9BA1A6" />
              </View>
            </View>

            <View style={styles.fieldDivider} />

            {/* Email Address */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="auditor@citizen.org"
                placeholderTextColor={COLORS.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>

            <View style={styles.fieldDivider} />

            {/* Phone Number */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 00000"
                placeholderTextColor={COLORS.muted}
                keyboardType="phone-pad"
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>
          </View>
        </View>

        {/* 4. SECTION 2: Residential & Ward Address (Separate Dedicated Section) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Location & Address</Text>

          <View style={styles.formCard}>
            {/* Street / Building Address */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={styles.fieldInput}
                value={address}
                onChangeText={setAddress}
                placeholder="House / Flat / Street Name"
                placeholderTextColor={COLORS.muted}
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>

            <View style={styles.fieldDivider} />

            {/* Area / Ward */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Area / Ward</Text>
              <TextInput
                style={styles.fieldInput}
                value={area}
                onChangeText={setArea}
                placeholder="e.g. Indiranagar, Ward 112"
                placeholderTextColor={COLORS.muted}
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>

            <View style={styles.fieldDivider} />

            {/* City */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.fieldInput}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Bengaluru"
                placeholderTextColor={COLORS.muted}
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>

            <View style={styles.fieldDivider} />

            {/* State */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>State</Text>
              <TextInput
                style={styles.fieldInput}
                value={state}
                onChangeText={setState}
                placeholder="e.g. Karnataka"
                placeholderTextColor={COLORS.muted}
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>

            <View style={styles.fieldDivider} />

            {/* PIN Code */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Pincode</Text>
              <TextInput
                style={styles.fieldInput}
                value={pincode}
                onChangeText={setPincode}
                placeholder="e.g. 560038"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
                maxLength={6}
              />
              <Feather name="edit-2" size={13} color="#9BA1A6" style={styles.faintEditIcon} />
            </View>
          </View>
        </View>

        {/* 5. SECTION 3: Civic Verification Trust Status */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Government Verification</Text>

          <View style={styles.trustCard}>
            <View style={styles.trustLeft}>
              <View style={styles.trustIconWrap}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.brandGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>DigiLocker e-KYC Verified</Text>
                <Text style={styles.trustSub}>Decentralized identity linked to electoral ward roll</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ===================================================
          MODAL: Bottom Sheet Photo Picker (Gallery & Camera)
      =================================================== */}
      <Modal
        visible={isPhotoPickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPhotoPickerOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Change Profile Photo</Text>
              <TouchableOpacity
                onPress={() => setIsPhotoPickerOpen(false)}
                style={styles.sheetCloseBtn}
              >
                <Feather name="x" size={20} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSub}>Upload an image from your device gallery or take a new photo:</Text>

            {/* Device Upload Action Buttons */}
            <View style={styles.galleryActionsGrid}>
              <TouchableOpacity
                style={styles.galleryPrimaryBtn}
                onPress={pickImageFromGallery}
                disabled={isLoadingPhoto}
                activeOpacity={0.85}
              >
                <Feather name="image" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.galleryPrimaryBtnText}>
                  {isLoadingPhoto ? 'Opening Gallery...' : 'Choose from Gallery'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gallerySecondaryBtn}
                onPress={takePhotoWithCamera}
                disabled={isLoadingPhoto}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={17} color={COLORS.charcoal} style={{ marginRight: 6 }} />
                <Text style={styles.gallerySecondaryBtnText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Reset / Remove Button */}
            {user.avatarType === 'image' && (
              <TouchableOpacity
                style={styles.resetPhotoBtn}
                onPress={() => {
                  resetAvatar();
                  setIsPhotoPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={14} color={COLORS.danger} style={{ marginRight: 6 }} />
                <Text style={styles.resetPhotoText}>Remove Custom Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    color: COLORS.subtext,
    fontWeight: '600',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: -0.2,
  },
  saveText: {
    fontSize: 15,
    color: COLORS.brandGreen,
    fontWeight: '800',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
  },
  changePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },

  // Form Sections
  sectionBlock: {
    paddingHorizontal: 18,
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  fieldLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.charcoal,
    padding: 0,
    paddingRight: 8,
  },
  faintEditIcon: {
    opacity: 0.7,
    marginLeft: 6,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 16,
  },
  readOnlyWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyText: {
    fontSize: 14,
    color: COLORS.subtext,
    fontWeight: '600',
  },

  // Trust Card
  trustCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  trustLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trustIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  trustSub: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 2,
  },

  // Bottom Sheet Photo Picker
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetSub: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 18,
  },

  // Gallery Actions
  galleryActionsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  galleryPrimaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  gallerySecondaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallerySecondaryBtnText: {
    color: COLORS.charcoal,
    fontSize: 13,
    fontWeight: '700',
  },
  resetPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  resetPhotoText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '700',
  },
});
