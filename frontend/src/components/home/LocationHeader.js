import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const LocationHeader = ({
  selectedLocality,
  onOpenLocalityPicker,
  onOpenNotices,
  unreadNoticesCount = 0,
  onOpenActivity,
  activityCount = 0,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Locality & Ward Selector */}
      <TouchableOpacity
        style={styles.localityButton}
        onPress={onOpenLocalityPicker}
        activeOpacity={0.7}
      >
        <View style={styles.radarIconWrap}>
          <Ionicons name="location-sharp" size={14} color={COLORS.charcoal} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.localityText} numberOfLines={1}>
            {selectedLocality
              ? `Filter: ${selectedLocality.name}${
                  selectedLocality.ward ? ` · ${selectedLocality.ward}` : ''
                }`
              : 'Select Locality'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color="#64748B" style={styles.chevronIcon} />
      </TouchableOpacity>

      {/* Right Actions: Activity Button & Notification Bell */}
      <View style={styles.rightActionsRow}>
        {/* Personal Civic Activity Button */}
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={onOpenActivity}
          activeOpacity={0.7}
          accessibilityLabel="Personal civic activity"
        >
          <Ionicons name="finger-print-outline" size={20} color={COLORS.charcoal} />
          {activityCount > 0 && (
            <View style={styles.badgeDot}>
              <View style={styles.badgeInner} />
            </View>
          )}
        </TouchableOpacity>

        {/* Municipal Notices / Notification Bell */}
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={onOpenNotices}
          activeOpacity={0.7}
          accessibilityLabel="Municipal notices and notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={COLORS.charcoal} />
          {unreadNoticesCount > 0 && (
            <View style={styles.badgeDot}>
              <View style={styles.badgeInner} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    zIndex: 10,
  },
  localityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '72%',
  },
  radarIconWrap: {
    marginRight: 6,
  },
  textWrap: {
    flexShrink: 1,
  },
  localityText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.charcoal,
    letterSpacing: -0.2,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  badgeInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
});

