import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { VoteControl } from './VoteControl';

const STATUS_THEME = {
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

export const IssueCard = ({ issue, onPress, onVote }) => {
  const statusCfg = STATUS_THEME[issue.status] || STATUS_THEME.reported;

  const handleVote = (direction) => {
    if (onVote) {
      onVote(issue.id, direction);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(issue)}
      activeOpacity={0.88}
    >
      {/* 1. Header Meta Row: Author, Status Badge, Time */}
      <View style={styles.headerRow}>
        <View style={styles.authorGroup}>
          <View style={[styles.avatarCircle, issue.isAnonymous && styles.anonAvatar]}>
            <Ionicons
              name={issue.isAnonymous ? 'finger-print-outline' : 'person'}
              size={13}
              color={issue.isAnonymous ? '#64748B' : COLORS.brandGreen}
            />
          </View>
          <View>
            <Text style={styles.authorName} numberOfLines={1}>
              {issue.author}
            </Text>
            <Text style={styles.timeAgoText}>{issue.timeAgo}</Text>
          </View>
        </View>

        {/* Status Badge */}
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

      {/* 3. Description Excerpt */}
      {!!issue.description && (
        <Text style={styles.description} numberOfLines={3}>
          {issue.description}
        </Text>
      )}

      {/* 4. Optional Evidence Image Preview */}
      {!!issue.image && (
        <View style={styles.imageWrapper}>
          <Image
            source={typeof issue.image === 'string' ? { uri: issue.image } : issue.image}
            style={styles.cardImage}
            resizeMode="cover"
          />
          {!!issue.imageCaption && (
            <View style={styles.imageCaptionBar}>
              <Ionicons name="camera" size={11} color="#FFFFFF" />
              <Text style={styles.imageCaptionText} numberOfLines={1}>
                {issue.imageCaption}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 5. Locality Bar */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={13} color={COLORS.subtext} />
        <Text style={styles.locationText} numberOfLines={1}>
          {issue.location}
        </Text>
      </View>

      {/* 6. Footer Actions: Reddit-Style Vote Pill & Comments Count */}
      <View style={styles.footerRow}>
        <VoteControl
          upvotes={issue.upvotes || 0}
          userVote={issue.userVote || 0}
          onVote={handleVote}
          size="compact"
        />

        <View style={styles.footerRight}>
          {/* Comments Count Button */}
          <View style={styles.actionPill}>
            <Ionicons name="chatbubble-outline" size={14} color="#475569" />
            <Text style={styles.actionPillText}>{issue.commentsCount || 0}</Text>
          </View>

          {/* Forward arrow hint */}
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonAvatar: {
    backgroundColor: '#F1F5F9',
  },
  authorName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 16,
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18.5,
    marginBottom: 10,
  },
  imageWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F1F5F9',
  },
  imageCaptionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageCaptionText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});

