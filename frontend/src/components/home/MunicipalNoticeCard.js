import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const NOTICE_CATEGORY_CONFIG = {
  water: { icon: 'water-outline' },
  roads: { icon: 'git-merge-outline' },
  power: { icon: 'flash-outline' },
  weather: { icon: 'thunderstorm-outline' },
  infrastructure: { icon: 'construct-outline' },
};

export const MunicipalNoticeCard = ({ notice, onPress }) => {
  const config = NOTICE_CATEGORY_CONFIG[notice.category] || NOTICE_CATEGORY_CONFIG.infrastructure;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(notice)}
      activeOpacity={0.85}
    >
      {/* Header Row: Category Badge & Official Authority Tag */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Ionicons name={config.icon} size={12} color="#64748B" />
          <Text style={styles.categoryText}>
            {notice.categoryLabel || 'Notice'}
          </Text>
        </View>

        {notice.isOfficial && (
          <View style={styles.officialBadgeIcon}>
            <Ionicons name="shield-checkmark" size={13} color="#059669" />
          </View>
        )}
      </View>

      {/* Notice Title */}
      <Text style={styles.title} numberOfLines={2}>
        {notice.title}
      </Text>

      {/* Notice Summary / Impact */}
      {!!notice.summary && (
        <Text style={styles.summary} numberOfLines={2}>
          {notice.summary}
        </Text>
      )}

      {/* Meta Row: Issuing Authority, Locality, Dates */}
      <View style={styles.metaRow}>
        <View style={styles.authorityWrap}>
          <Ionicons name="business-outline" size={12} color="#64748B" />
          <Text style={styles.authorityText} numberOfLines={1}>
            {notice.source}
          </Text>
        </View>

        <View style={styles.dateWrap}>
          <Ionicons name="calendar-outline" size={11} color="#94A3B8" />
          <Text style={styles.dateText}>
            {notice.publishedDate}
            {notice.expiryDate ? ` · Until ${notice.expiryDate}` : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.2,
  },
  officialBadgeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.charcoal,
    lineHeight: 19,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
    flexDirection: 'column',
    gap: 3,
  },
  authorityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    flexShrink: 1,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});

