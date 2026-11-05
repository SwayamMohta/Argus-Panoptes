import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const VoteControl = ({
  upvotes = 0,
  userVote = 0, // 1, -1, or 0
  onVote,
  layout = 'horizontal', // 'horizontal' | 'vertical'
  size = 'normal', // 'normal' | 'compact'
}) => {
  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  // Small bounce animation on vote
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const triggerAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.18,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleUpvote = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    triggerAnimation();
    if (onVote) onVote(1);
  };

  const handleDownvote = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    triggerAnimation();
    if (onVote) onVote(-1);
  };

  const isVertical = layout === 'vertical';
  const isCompact = size === 'compact';

  // Highlight colors
  const activeUpColor = '#0F172A';
  const activeDownColor = '#0F172A';
  const defaultArrowColor = '#64748B';

  return (
    <View
      style={[
        styles.pillContainer,
        isVertical ? styles.verticalContainer : styles.horizontalContainer,
        isCompact && styles.compactContainer,
        isUpvoted && styles.upvotedContainer,
        isDownvoted && styles.downvotedContainer,
      ]}
    >
      {/* Upvote Button */}
      <TouchableOpacity
        style={[styles.arrowButton, isCompact && styles.compactArrowButton]}
        onPress={handleUpvote}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
        accessibilityLabel="Upvote issue"
      >
        <Ionicons
          name={isUpvoted ? 'arrow-up-circle' : 'arrow-up'}
          size={isCompact ? 16 : 18}
          color={isUpvoted ? activeUpColor : defaultArrowColor}
        />
      </TouchableOpacity>

      {/* Live Vote Count */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text
          style={[
            styles.voteText,
            isCompact && styles.compactVoteText,
            isUpvoted && { color: activeUpColor, fontWeight: '700' },
            isDownvoted && { color: activeDownColor, fontWeight: '700' },
          ]}
        >
          {upvotes}
        </Text>
      </Animated.View>

      {/* Downvote Button */}
      <TouchableOpacity
        style={[styles.arrowButton, isCompact && styles.compactArrowButton]}
        onPress={handleDownvote}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
        accessibilityLabel="Downvote issue"
      >
        <Ionicons
          name={isDownvoted ? 'arrow-down-circle' : 'arrow-down'}
          size={isCompact ? 16 : 18}
          color={isDownvoted ? activeDownColor : defaultArrowColor}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  verticalContainer: {
    flexDirection: 'column',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 4,
    minWidth: 38,
  },
  compactContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  upvotedContainer: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  downvotedContainer: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  arrowButton: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactArrowButton: {
    padding: 2,
  },
  voteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    minWidth: 20,
    textAlign: 'center',
  },
  compactVoteText: {
    fontSize: 12,
  },
});

