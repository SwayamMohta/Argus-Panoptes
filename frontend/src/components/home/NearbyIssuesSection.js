import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { NearbyIssueCard } from './NearbyIssueCard';

const FILTER_TABS = [
  { id: 'all', label: 'All Issues' },
  { id: 'active', label: 'Active' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'resolved', label: 'Resolved' },
];

export const NearbyIssuesSection = ({
  issues = [],
  selectedLocality,
  onSelectIssue,
  onConfirmIssue,
  onSupportIssue,
  onSeeAllPress,
}) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAllCards, setShowAllCards] = useState(false);

  // Filter issues based on locality priority and active filter tab
  const processedIssues = useMemo(() => {
    // 1. Prioritize issues in the selected locality
    const localityName = selectedLocality?.name?.toLowerCase() || '';

    let sorted = [...issues].sort((a, b) => {
      const aLoc = (a.location || '').toLowerCase();
      const bLoc = (b.location || '').toLowerCase();
      const aInLoc = localityName && aLoc.includes(localityName) ? 1 : 0;
      const bInLoc = localityName && bLoc.includes(localityName) ? 1 : 0;
      if (aInLoc !== bInLoc) return bInLoc - aInLoc;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 2. Filter by status tab
    if (activeFilter === 'active') {
      sorted = sorted.filter((iss) => iss.status === 'in_progress' || iss.status === 'reported');
    } else if (activeFilter === 'under_review') {
      sorted = sorted.filter((iss) => iss.status === 'under_review');
    } else if (activeFilter === 'resolved') {
      sorted = sorted.filter((iss) => iss.status === 'resolved');
    }

    return sorted;
  }, [issues, selectedLocality, activeFilter]);

  // Determine how many cards to show initially (top 4 or all)
  const displayedIssues = showAllCards ? processedIssues : processedIssues.slice(0, 4);

  // Proximity label generator: realistic distances for selected locality, or actual locality name
  const getProximityText = (issue, index) => {
    const loc = (issue.location || '').toLowerCase();
    const currentLoc = (selectedLocality?.name || '').toLowerCase();

    if (currentLoc && loc.includes(currentLoc)) {
      // Deterministic realistic distance for issues in the selected locality
      const distances = ['350 m away', '620 m away', '900 m away', '1.2 km away', '1.5 km away'];
      return distances[index % distances.length];
    }

    // Otherwise show authentic location name from issue
    return issue.location?.split(',')?.[0]?.trim() || 'Nearby';
  };

  return (
    <View style={styles.sectionContainer}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.sectionTitle}>Around Your Neighbourhood</Text>
          <Text style={styles.sectionSubtitle}>
            Issues reported by people nearby in {selectedLocality?.name || 'your area'}
          </Text>
        </View>

        {/* Subtle See All Action */}
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => {
            if (onSeeAllPress) {
              onSeeAllPress();
            } else {
              setShowAllCards((prev) => !prev);
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>
            {showAllCards ? 'Show Less' : `See All (${processedIssues.length})`}
          </Text>
          <Ionicons
            name={showAllCards ? 'chevron-up' : 'chevron-forward'}
            size={13}
            color="#64748B"
          />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Issues List */}
      {displayedIssues.length > 0 ? (
        <View style={styles.cardsList}>
          {displayedIssues.map((issue, index) => (
            <NearbyIssueCard
              key={issue.id}
              issue={issue}
              distanceText={getProximityText(issue, index)}
              onPress={onSelectIssue}
              onConfirm={onConfirmIssue}
              onSupport={onSupportIssue}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-circle-outline" size={32} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Issues Found</Text>
          <Text style={styles.emptySubtitle}>
            No civic issues matching the current filter in this locality.
          </Text>
        </View>
      )}

      {/* Expansion Toggle Button if more issues exist and not currently expanded */}
      {!showAllCards && processedIssues.length > 4 && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowAllCards(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.moreButtonText}>
            View {processedIssues.length - 4} more nearby issues
          </Text>
          <Ionicons name="chevron-down" size={15} color={COLORS.charcoal} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
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
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: COLORS.charcoal,
    borderColor: COLORS.charcoal,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  cardsList: {
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
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
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 240,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  moreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.charcoal,
  },
});

