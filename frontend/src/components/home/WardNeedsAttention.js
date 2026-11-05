import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_IMAGES } from '../../constants/categoryImages';

const STATUS_CONFIG = {
  reported: {
    label: 'Reported',
    dotColor: '#D97706',
  },
  under_review: {
    label: 'Under Review',
    dotColor: '#2563EB',
  },
  in_progress: {
    label: 'In Progress',
    dotColor: '#7C3AED',
  },
  resolved: {
    label: 'Resolved',
    dotColor: '#15803D',
  },
};

export const WardNeedsAttention = ({
  locality,
  issues = [],
  onSelectIssue,
  onViewAll,
}) => {
  // Check if issue is an urgent safety hazard
  const isHazard = (issue) =>
    issue.isUrgent ||
    issue.priority === 'hazard' ||
    /hazard|danger|crater|emergency|collapse|live|exposed|sagging/i.test(
      `${issue.title || ''} ${issue.description || ''}`
    );

  // Filter unresolved issues
  const unresolved = issues.filter((i) => i.status !== 'resolved');

  // Prioritization:
  // 1. Urgent safety hazards first
  // 2. Then older unresolved issues (by createdAt or position)
  const sorted = [...unresolved].sort((a, b) => {
    const aHaz = isHazard(a);
    const bHaz = isHazard(b);
    if (aHaz && !bHaz) return -1;
    if (!aHaz && bHaz) return 1;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB; // Older unresolved issues first
  });

  const displayIssues = sorted.slice(0, 3);

  const renderThumbnail = (issue) => {
    const imgSource =
      issue.image ||
      CATEGORY_IMAGES[issue.categoryId] ||
      null;

    if (imgSource) {
      return (
        <Image
          source={typeof imgSource === 'string' ? { uri: imgSource } : imgSource}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.thumbnailPlaceholder}>
        <Ionicons name="document-text-outline" size={24} color="#94A3B8" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>NEEDS ATTENTION</Text>
        {unresolved.length > 0 && (
          <TouchableOpacity
            onPress={onViewAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color="#0F172A" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {displayIssues.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#475569" />
          </View>
          <Text style={styles.emptyTitle}>No Unresolved Ward Issues</Text>
          <Text style={styles.emptySubtitle}>
            {locality?.name
              ? `All reported issues in ${locality.name} are currently addressed. Use the camera above to inspect and document new defects.`
              : 'All reported issues in this ward are currently addressed.'}
          </Text>
        </View>
      ) : (
        <View style={styles.cardList}>
          {displayIssues.map((issue) => {
            const statusCfg =
              STATUS_CONFIG[issue.status] || STATUS_CONFIG.reported;
            const hasHazard = isHazard(issue);

            return (
              <TouchableOpacity
                key={issue.id}
                style={styles.card}
                onPress={() => onSelectIssue && onSelectIssue(issue)}
                activeOpacity={0.72}
                accessibilityLabel={`View details for ${issue.title}`}
              >
                <View style={styles.thumbnailContainer}>
                  {renderThumbnail(issue)}
                  {hasHazard && (
                    <View style={styles.hazardTag}>
                      <Ionicons name="alert" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardMetaRow}>
                    <View style={styles.statusPill}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusCfg.dotColor },
                        ]}
                      />
                      <Text style={styles.statusText}>{statusCfg.label}</Text>
                    </View>
                    <Text style={styles.timeAgoText}>
                      {issue.timeAgo || 'Recent'}
                    </Text>
                  </View>

                  <Text style={styles.issueTitle} numberOfLines={2}>
                    {issue.title}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={11} color="#64748B" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {issue.location}
                      </Text>
                    </View>

                    <View style={styles.confirmationsBadge}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={12}
                        color="#475569"
                      />
                      <Text style={styles.confirmationsText}>
                        {issue.confirmationsCount || 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardList: {
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 82,
    height: 82,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hazardTag: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#DC2626',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    height: 82,
    justifyContent: 'space-between',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  issueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  confirmationsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confirmationsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDEFF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 300,
  },
});

