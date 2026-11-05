import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const CommentItem = ({
  comment,
  depth = 0,
  onReply,
  onVoteComment,
  issueId,
}) => {
  const isUpvoted = comment.userVote === 1;

  const handleUpvote = () => {
    if (onVoteComment) {
      onVoteComment(issueId, comment.id, 1);
    }
  };

  const handleReplyPress = () => {
    if (onReply) {
      onReply(comment);
    }
  };

  return (
    <View style={[styles.container, depth > 0 && styles.nestedContainer]}>
      {/* Left Thread Guide Line for Nested Comments */}
      {depth > 0 && <View style={styles.threadLine} />}

      <View style={styles.commentBody}>
        {/* Comment Header: Author, Badge, Time */}
        <View style={styles.headerRow}>
          <View style={styles.authorBadgeRow}>
            <Text style={[styles.authorName, comment.isOfficial && styles.officialAuthor]}>
              {comment.author}
            </Text>
            {comment.authorBadge && (
              <View
                style={[
                  styles.badgePill,
                  comment.isOfficial && styles.officialBadgePill,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    comment.isOfficial && styles.officialBadgeText,
                  ]}
                >
                  {comment.authorBadge}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.timeAgo}>{comment.timeAgo}</Text>
        </View>

        {/* Comment Text Content */}
        <Text style={styles.commentText}>{comment.text}</Text>

        {/* Comment Footer: Upvote Pill & Reply Button */}
        <View style={styles.footerRow}>
          {/* Compact Comment Upvote */}
          <TouchableOpacity
            style={[styles.voteButton, isUpvoted && styles.voteButtonActive]}
            onPress={handleUpvote}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isUpvoted ? 'arrow-up-circle' : 'arrow-up'}
              size={13}
              color={isUpvoted ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.voteCount,
                isUpvoted && { color: '#FFFFFF', fontWeight: '600' },
              ]}
            >
              {comment.upvotes || 0}
            </Text>
          </TouchableOpacity>

          {/* Reply Button */}
          {depth < 3 && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={handleReplyPress}
              activeOpacity={0.7}
            >
              <Ionicons name="return-down-forward" size={13} color="#64748B" />
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Render Nested Threaded Replies recursively */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesList}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onReply={onReply}
                onVoteComment={onVoteComment}
                issueId={issueId}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 6,
  },
  nestedContainer: {
    marginTop: 8,
    paddingLeft: 12,
  },
  threadLine: {
    position: 'absolute',
    left: 4,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  commentBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  officialAuthor: {
    color: '#0F766E',
  },
  badgePill: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  officialBadgePill: {
    backgroundColor: '#CCFBF1',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#4A5568',
    letterSpacing: 0.2,
  },
  officialBadgeText: {
    color: '#0F766E',
  },
  timeAgo: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  voteButtonActive: {
    backgroundColor: '#1E2328',
    borderColor: '#1E2328',
  },
  voteCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  replyButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  repliesList: {
    marginTop: 6,
  },
});

