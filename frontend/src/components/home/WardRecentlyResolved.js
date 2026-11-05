import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_IMAGES } from '../../constants/categoryImages';

export const WardRecentlyResolved = ({
  locality,
  issues = [],
  onSelectIssue,
}) => {
  const resolvedIssues = issues.filter((i) => i.status === 'resolved');

  // Track which image mode is selected per issue if before/after photos exist
  const [photoMode, setPhotoMode] = useState({});

  // If no genuinely resolved issues exist, do not display fabricated content or an empty decorative card
  if (resolvedIssues.length === 0) {
    return null;
  }

  const togglePhotoMode = (issueId) => {
    setPhotoMode((prev) => ({
      ...prev,
      [issueId]: prev[issueId] === 'after' ? 'before' : 'after',
    }));
  };

  const getResolvedDate = (issue) => {
    const resolvedEntry = issue.timeline?.find((t) => t.key === 'resolved');
    if (resolvedEntry?.date && resolvedEntry.date !== 'Pending') {
      return resolvedEntry.date;
    }
    return issue.timeAgo || 'Recently';
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>RECENTLY RESOLVED</Text>
        <Text style={styles.wardLabel} numberOfLines={1}>
          {locality?.ward || 'Ward'}
        </Text>
      </View>

      <View style={styles.cardList}>
        {resolvedIssues.map((issue) => {
          const resolvedDate = getResolvedDate(issue);
          const hasBeforeAfter = !!(issue.resolvedImage || issue.afterImage);
          const currentMode = photoMode[issue.id] || 'after';

          const currentImage = hasBeforeAfter
            ? (currentMode === 'after'
                ? (issue.resolvedImage || issue.afterImage)
                : issue.image)
            : (issue.image || CATEGORY_IMAGES[issue.categoryId]);

          return (
            <TouchableOpacity
              key={issue.id}
              style={styles.card}
              onPress={() => onSelectIssue && onSelectIssue(issue)}
              activeOpacity={0.72}
              accessibilityLabel={`View resolved issue: ${issue.title}`}
            >
              <View style={styles.thumbnailContainer}>
                {currentImage ? (
                  <Image
                    source={
                      typeof currentImage === 'string'
                        ? { uri: currentImage }
                        : currentImage
                    }
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons
                      name="checkmark-done-outline"
                      size={24}
                      color="#64748B"
                    />
                  </View>
                )}

                {hasBeforeAfter && (
                  <TouchableOpacity
                    style={styles.beforeAfterToggle}
                    onPress={(e) => {
                      e.stopPropagation();
                      togglePhotoMode(issue.id);
                    }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text style={styles.beforeAfterText}>
                      {currentMode === 'after' ? 'After' : 'Before'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.metaRow}>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Resolved</Text>
                  </View>
                  <Text style={styles.dateText}>{resolvedDate}</Text>
                </View>

                <Text style={styles.issueTitle} numberOfLines={2}>
                  {issue.title}
                </Text>

                <View style={styles.footerRow}>
                  <View style={styles.verificationBadge}>
                    <Ionicons
                      name="shield-checkmark"
                      size={12}
                      color="#15803D"
                    />
                    <Text style={styles.verificationText}>
                      {issue.confirmationsCount || 0} citizen verifications
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
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
  wardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
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
    width: 78,
    height: 78,
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
  beforeAfterToggle: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  beforeAfterText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cardBody: {
    flex: 1,
    height: 78,
    justifyContent: 'space-between',
  },
  metaRow: {
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
    backgroundColor: '#15803D',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  issueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verificationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
});

