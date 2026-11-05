import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { CATEGORIES_DATA } from '../../constants/categoriesData';
import { CommunityConfirmationControl } from './CommunityConfirmationControl';

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
    dotColor: '#16A34A',
  },
};

export const NearbyIssueCard = ({
  issue,
  distanceText,
  onPress,
  onConfirm,
  onSupport,
}) => {
  const category = CATEGORIES_DATA.find((c) => c.id === issue.categoryId) || {
    name: 'Civic Issue',
    shortName: 'Civic',
    icon: 'grid-outline',
    color: '#64748B',
  };

  const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.reported;
  const userSupported = (issue.userVote || 0) > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(issue)}
      activeOpacity={0.88}
    >
      {/* 1. Header Meta Bar: Category, Distance/Location, and Status */}
      <View style={styles.topMetaRow}>
        <View style={styles.leftMetaGroup}>
          <View style={styles.categoryPill}>
            <Ionicons name={category.icon} size={11} color="#64748B" />
            <Text style={styles.categoryPillText}>
              {category.shortName || category.name}
            </Text>
          </View>

          {/* Distance or Locality */}
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate-outline" size={10} color="#64748B" />
            <Text style={styles.distanceText} numberOfLines={1}>
              {distanceText || issue.location?.split(',')?.[0]?.trim() || 'Nearby'}
            </Text>
          </View>
        </View>

        {/* Official Status */}
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: statusCfg.dotColor }]} />
          <Text style={styles.statusText}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* 2. Issue Title */}
      <Text style={styles.title} numberOfLines={2}>
        {issue.title}
      </Text>

      {/* 3. Description excerpt */}
      {!!issue.description && (
        <Text style={styles.description} numberOfLines={2}>
          {issue.description}
        </Text>
      )}

      {/* 4. Optional Evidence Photograph */}
      {!!issue.image && (
        <View style={styles.imageContainer}>
          <Image
            source={typeof issue.image === 'string' ? { uri: issue.image } : issue.image}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.timeTag}>
            <Text style={styles.timeTagText}>{issue.timeAgo}</Text>
          </View>
        </View>
      )}

      {/* 5. Bottom Action & Confirmation Bar */}
      <View style={styles.bottomBar}>
        <CommunityConfirmationControl
          confirmationsCount={issue.confirmationsCount || 0}
          userConfirmed={!!issue.userConfirmed}
          supportCount={issue.upvotes || 0}
          userSupported={userSupported}
          onConfirm={() => onConfirm && onConfirm(issue.id)}
          onSupport={() => onSupport && onSupport(issue.id)}
          compact={true}
        />

        <View style={styles.bottomRightGroup}>
          {/* Comments Count */}
          <View style={styles.commentCount}>
            <Ionicons name="chatbubble-outline" size={13} color="#64748B" />
            <Text style={styles.commentText}>{issue.commentsCount || 0}</Text>
          </View>

          {/* Compact Action To Open Issue */}
          <View style={styles.openBtn}>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leftMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  distanceText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.charcoal,
    lineHeight: 20,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    marginBottom: 10,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  timeTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  timeTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  bottomRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  openBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

