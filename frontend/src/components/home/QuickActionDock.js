import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const QuickActionDock = ({
  onPickGallery,
  onOpenNotices,
  onOpenActivity,
  unreadNoticesCount = 0,
  activityCount = 0,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Device Gallery / Upload */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={onPickGallery}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Open Photo Gallery"
      >
        <View style={styles.circleButton}>
          <Ionicons name="images-outline" size={22} color="#1E293B" />
        </View>
        <Text style={styles.actionLabel}>Gallery</Text>
      </TouchableOpacity>

      {/* 2. Municipal Notices */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={onOpenNotices}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Municipal Notices"
      >
        <View style={styles.circleButton}>
          <Ionicons name="megaphone-outline" size={20} color="#1E293B" />
          {unreadNoticesCount > 0 && <View style={styles.noticeDot} />}
        </View>
        <Text style={styles.actionLabel}>Notices</Text>
      </TouchableOpacity>

      {/* 3. Citizen Activity Docket */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={onOpenActivity}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="My Civic Activity"
      >
        <View style={styles.circleButton}>
          <Ionicons name="time-outline" size={21} color="#1E293B" />
          {activityCount > 0 && (
            <View style={styles.activityBadge}>
              <Text style={styles.activityBadgeText}>
                {activityCount > 9 ? '9+' : activityCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.actionLabel}>My Activity</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 16,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  circleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  noticeDot: {
    position: 'absolute',
    top: 5,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  activityBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E2328',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  activityBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});

