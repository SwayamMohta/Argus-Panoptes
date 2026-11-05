import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { CommentItem } from './CommentItem';

export const CommentSection = ({
  issueId,
  comments = [],
  onAddComment,
  onVoteComment,
  currentUser,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null); // { id, author }
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  const inputRef = useRef(null);

  const handleReplyPress = (comment) => {
    setReplyTarget(comment);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
  };

  const handleSubmit = () => {
    if (!commentText.trim()) return;

    if (onAddComment) {
      onAddComment(
        issueId,
        commentText.trim(),
        replyTarget ? replyTarget.id : null,
        {
          author: isAnonymousComment ? 'Anonymous Citizen' : (currentUser?.name || 'u/civic_citizen'),
          authorBadge: isAnonymousComment ? 'Anonymous' : 'Civic Scout',
          isAnonymous: isAnonymousComment,
        }
      );
    }

    setCommentText('');
    setReplyTarget(null);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.sectionContainer}>
      {/* Section Title */}
      <View style={styles.headingRow}>
        <View style={styles.headingLeft}>
          <Ionicons name="chatbubbles-outline" size={17} color={COLORS.charcoal} />
          <Text style={styles.headingTitle}>Community Discussion</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{comments.length}</Text>
        </View>
      </View>

      {/* Reply Banner when replying to a nested comment */}
      {replyTarget && (
        <View style={styles.replyBanner}>
          <Ionicons name="return-down-forward" size={14} color="#64748B" />
          <Text style={styles.replyBannerText} numberOfLines={1}>
            Replying to <Text style={styles.replyBannerAuthor}>{replyTarget.author}</Text>
          </Text>
          <TouchableOpacity onPress={handleCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Box */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={replyTarget ? `Reply to ${replyTarget.author}...` : 'Share your perspective or evidence...'}
          placeholderTextColor="#94A3B8"
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />

        <View style={styles.inputControlsRow}>
          {/* Anonymous toggle */}
          <TouchableOpacity
            style={[styles.anonToggle, isAnonymousComment && styles.anonToggleActive]}
            onPress={() => setIsAnonymousComment((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isAnonymousComment ? 'checkmark-circle' : 'finger-print-outline'}
              size={13}
              color={isAnonymousComment ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.anonToggleText,
                isAnonymousComment && { color: '#FFFFFF', fontWeight: '600' },
              ]}
            >
              Anonymous
            </Text>
          </TouchableOpacity>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              commentText.trim().length > 0 && styles.sendButtonActive,
            ]}
            onPress={handleSubmit}
            disabled={commentText.trim().length === 0}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up"
              size={16}
              color={commentText.trim().length > 0 ? '#FFFFFF' : '#94A3B8'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments List */}
      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbox-ellipses-outline" size={28} color="#CBD5E1" />
          <Text style={styles.emptyText}>No discussions yet.</Text>
          <Text style={styles.emptySubtext}>Be the first citizen to comment or provide evidence.</Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              onReply={handleReplyPress}
              onVoteComment={onVoteComment}
              issueId={issueId}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 18,
    marginBottom: 24,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  replyBannerText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  replyBannerAuthor: {
    fontWeight: '700',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  textInput: {
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 48,
    maxHeight: 120,
    paddingTop: 2,
    paddingBottom: 6,
    textAlignVertical: 'top',
  },
  inputControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  anonToggleActive: {
    backgroundColor: '#1E2328',
  },
  anonToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.brandGreen,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  commentsList: {
    marginTop: 4,
  },
});

