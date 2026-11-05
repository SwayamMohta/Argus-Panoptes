import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const CommunityConfirmationControl = ({
  confirmationsCount = 0,
  userConfirmed = false,
  supportCount = 0,
  userSupported = false,
  onConfirm,
  onSupport,
  compact = false,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Witness Confirmation Interaction (Personal Ground Truth) */}
      <TouchableOpacity
        style={[
          styles.actionPill,
          userConfirmed && styles.confirmPillActive,
          compact && styles.actionPillCompact,
        ]}
        onPress={(e) => {
          e?.stopPropagation?.();
          onConfirm && onConfirm();
        }}
        activeOpacity={0.7}
        accessibilityLabel="Confirm I have witnessed this problem"
      >
        <Ionicons
          name={userConfirmed ? 'shield-checkmark' : 'shield-checkmark-outline'}
          size={compact ? 14 : 15}
          color={userConfirmed ? '#FFFFFF' : '#475569'}
        />
        <Text
          style={[
            styles.pillText,
            userConfirmed && styles.confirmTextActive,
            compact && styles.pillTextCompact,
          ]}
        >
          {userConfirmed ? 'Witnessed' : 'Confirm'} {confirmationsCount > 0 ? `· ${confirmationsCount}` : ''}
        </Text>
      </TouchableOpacity>

      {/* 2. General Support Interaction (Issue Deserves Priority) */}
      <TouchableOpacity
        style={[
          styles.actionPill,
          userSupported && styles.supportPillActive,
          compact && styles.actionPillCompact,
        ]}
        onPress={(e) => {
          e?.stopPropagation?.();
          onSupport && onSupport();
        }}
        activeOpacity={0.7}
        accessibilityLabel="Support this issue for municipal attention"
      >
        <Ionicons
          name={userSupported ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
          size={compact ? 14 : 15}
          color={userSupported ? '#FFFFFF' : '#475569'}
        />
        <Text
          style={[
            styles.pillText,
            userSupported && styles.supportTextActive,
            compact && styles.pillTextCompact,
          ]}
        >
          Support {supportCount > 0 ? `· ${supportCount}` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionPillCompact: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    gap: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextCompact: {
    fontSize: 11,
  },
  confirmPillActive: {
    backgroundColor: '#1E2328',
    borderColor: '#1E2328',
  },
  confirmTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  supportPillActive: {
    backgroundColor: '#1E2328',
    borderColor: '#1E2328',
  },
  supportTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

