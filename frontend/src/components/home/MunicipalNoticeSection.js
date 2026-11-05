import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { MUNICIPAL_NOTICES } from '../../constants/municipalNotices';
import { MunicipalNoticeCard } from './MunicipalNoticeCard';

export const MunicipalNoticeSection = ({
  selectedLocality,
  onSelectNotice,
}) => {
  const [showAllCityNotices, setShowAllCityNotices] = useState(false);

  // Filter notices relevant to the selected locality or city-wide
  const relevantNotices = MUNICIPAL_NOTICES.filter((notice) => {
    if (showAllCityNotices) return true;
    if (!selectedLocality) return true;
    return (
      notice.localityIds?.includes(selectedLocality.id) ||
      notice.category === 'weather' // weather warnings affect the whole city
    );
  });

  return (
    <View style={styles.sectionContainer}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.sectionTitle}>Local Notices</Text>
          <Text style={styles.sectionSubtitle}>
            Official alerts & scheduled disruptions in {selectedLocality?.name || 'Hyderabad'}
          </Text>
        </View>

        {/* Toggle city-wide vs locality */}
        <TouchableOpacity
          style={styles.toggleFilterBtn}
          onPress={() => setShowAllCityNotices((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleFilterText}>
            {showAllCityNotices ? 'Local Only' : 'City-wide'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notices List */}
      {relevantNotices.length > 0 ? (
        <View style={styles.noticesList}>
          {relevantNotices.map((notice) => (
            <MunicipalNoticeCard
              key={notice.id}
              notice={notice}
              onPress={onSelectNotice}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={28} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Active Notices</Text>
          <Text style={styles.emptySubtitle}>
            No scheduled municipal disruptions currently recorded for {selectedLocality?.name}.
          </Text>
          <TouchableOpacity
            style={styles.viewCityBtn}
            onPress={() => setShowAllCityNotices(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewCityBtnText}>View All Greater Hyderabad Notices</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.charcoal,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggleFilterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  noticesList: {
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.charcoal,
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
    maxWidth: 260,
  },
  viewCityBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  viewCityBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },
});

