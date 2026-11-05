import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const ProfileHeader = ({ user, onOpenEditProfile, onOpenPhotoModal }) => {
  const isImageAvatar = user.avatarType === 'image' && !!user.avatarUri;
  const handleEdit = onOpenEditProfile || onOpenPhotoModal;

  return (
    <View style={styles.profileMetaBlock}>
      {/* Overlapping Clean Avatar Circle */}
      <View style={styles.avatarOverlapWrapper}>
        <TouchableOpacity
          style={styles.avatarTouchTarget}
          onPress={handleEdit}
          activeOpacity={0.85}
        >
          {/* Circular Cropped Avatar Container */}
          <View
            style={[
              styles.avatarOverlapCircle,
              { backgroundColor: isImageAvatar ? COLORS.white : user.avatarBg },
            ]}
          >
            {isImageAvatar ? (
              <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Feather
                name={user.avatarIcon || 'user'}
                size={32}
                color={user.avatarIconColor || COLORS.charcoal}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Auditor Name & Role with Edit Profile Pen Icon at Corner */}
      <View style={styles.userInfoRow}>
        <View style={styles.userNameRow}>
          <View style={styles.userNameLeft}>
            <Text style={styles.userName}>{user.name}</Text>
            {user.digiLockerVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={17} color={COLORS.brandGreen} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.editProfilePenBtn}
            onPress={handleEdit}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="edit-2" size={14} color={COLORS.charcoal} />
          </TouchableOpacity>
        </View>

        <Text style={styles.userSub}>{user.handle}</Text>
        {!!user.ward && (
          <View style={styles.wardRow}>
            <Feather name="map-pin" size={12} color={COLORS.muted} />
            <Text style={styles.wardText}>{user.ward}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileMetaBlock: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avatarOverlapWrapper: {
    marginTop: -38,
    marginBottom: 12,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  avatarTouchTarget: {
    position: 'relative',
  },
  avatarOverlapCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  userInfoRow: {
    marginTop: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userNameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    justifyContent: 'center',
  },
  editProfilePenBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSub: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '600',
    marginTop: 2,
  },
  wardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  wardText: {
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '500',
  },
});
