import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

export const MediaModal = () => {
  const auth = useAuth() || {};
  const {
    isMediaModalOpen = false,
    mediaModalTab = 'avatar',
    setMediaModalTab = () => {},
    closeMediaModal = () => {},
    user = null,
    updateAvatarUrl = () => {},
    resetAvatar = () => {},
    updateUserProfile = () => {},
  } = auth;

  const [editName, setEditName] = useState(user?.name || '');
  const [editWard, setEditWard] = useState(user?.ward || '');
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditWard(user.ward || '');
    }
  }, [user, isMediaModalOpen]);

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
        closeMediaModal();
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
              closeMediaModal();
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
        closeMediaModal();
      }
    } catch (error) {
      console.warn('Camera error:', error);
      alert('Camera is unavailable. Please choose from gallery.');
    } finally {
      setIsLoadingPhoto(false);
    }
  };

  const handleSaveInfo = () => {
    if (!editName.trim()) {
      alert('Please enter a valid name.');
      return;
    }
    updateUserProfile({
      name: editName.trim(),
      ward: editWard.trim(),
    });
  };

  const activeTab = mediaModalTab === 'info' ? 'info' : 'avatar';

  return (
    <Modal
      visible={isMediaModalOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={closeMediaModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.photoModalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeading}>
              {activeTab === 'info' ? 'Edit Profile Details' : 'Change Avatar Photo'}
            </Text>
            <TouchableOpacity onPress={closeMediaModal}>
              <Feather name="x" size={22} color={COLORS.charcoal} />
            </TouchableOpacity>
          </View>

          {/* Modal 2-Way Tab Bar */}
          <View style={styles.modalTabBar}>
            <TouchableOpacity
              style={[styles.modalTabBtn, activeTab === 'avatar' && styles.modalTabBtnActive]}
              onPress={() => setMediaModalTab('avatar')}
            >
              <Text
                style={[
                  styles.modalTabBtnText,
                  activeTab === 'avatar' && styles.modalTabBtnTextActive,
                ]}
              >
                Avatar Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalTabBtn, activeTab === 'info' && styles.modalTabBtnActive]}
              onPress={() => setMediaModalTab('info')}
            >
              <Text
                style={[
                  styles.modalTabBtnText,
                  activeTab === 'info' && styles.modalTabBtnTextActive,
                ]}
              >
                Profile Details
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: Avatar Photo */}
          {activeTab === 'avatar' && (
            <>
              <Text style={styles.modalSub}>Upload a photo from your device gallery or take a new photo:</Text>

              {/* Gallery Actions */}
              <View style={styles.galleryActionsGrid}>
                <TouchableOpacity
                  style={styles.galleryPrimaryBtn}
                  onPress={pickImageFromGallery}
                  disabled={isLoadingPhoto}
                  activeOpacity={0.85}
                >
                  <Feather name="image" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
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
                  <Feather name="camera" size={16} color={COLORS.charcoal} style={{ marginRight: 6 }} />
                  <Text style={styles.gallerySecondaryBtnText}>Take Photo</Text>
                </TouchableOpacity>
              </View>

              {user?.avatarType === 'image' && (
                <TouchableOpacity style={styles.removePhotoBtn} onPress={resetAvatar} activeOpacity={0.7}>
                  <Feather name="trash-2" size={13} color={COLORS.danger} style={{ marginRight: 4 }} />
                  <Text style={styles.removePhotoText}>Remove Custom Photo</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* TAB 2: Profile Details */}
          {activeTab === 'info' && (
            <View style={styles.infoEditForm}>
              <Text style={styles.modalSub}>Update your registered citizen auditor details:</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Legal Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Rajesh Kumar"
                  placeholderTextColor={COLORS.muted}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assigned Ward / Jurisdiction</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Ward 112 • Indiranagar"
                  placeholderTextColor={COLORS.muted}
                  value={editWard}
                  onChangeText={setEditWard}
                />
              </View>

              <TouchableOpacity
                style={styles.saveInfoBtn}
                onPress={handleSaveInfo}
                activeOpacity={0.85}
              >
                <Feather name="check" size={15} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.saveInfoBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.modalCancelBtn} onPress={closeMediaModal} activeOpacity={0.7}>
            <Text style={styles.modalCancelBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalCard: {
    width: '100%',
    maxWidth: 390,
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
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  modalTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  modalTabBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modalTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  modalTabBtnTextActive: {
    color: COLORS.charcoal,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 14,
    lineHeight: 18,
  },
  galleryActionsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  galleryPrimaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.charcoal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  gallerySecondaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gallerySecondaryBtnText: {
    color: COLORS.charcoal,
    fontSize: 13,
    fontWeight: '700',
  },
  sheetOrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  sheetOrLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  sheetOrText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 14,
  },
  presetItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 2,
  },
  presetItemActive: {
    borderWidth: 2,
    borderColor: COLORS.charcoal,
  },
  presetLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 4,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  removePhotoText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },
  infoEditForm: {
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.charcoal,
    backgroundColor: COLORS.surfaceLight,
  },
  saveInfoBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.charcoal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveInfoBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.subtext,
  },
});
