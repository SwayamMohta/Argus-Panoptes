import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useIssues } from '../context/IssuesContext';
import { useAuth } from '../context/AuthContext';
import { VoteControl } from '../components/community/VoteControl';
import { CommentSection } from '../components/community/CommentSection';
import { enrichIssueImages } from '../lib/images';

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

export const IssueDetailScreen = ({ issueId, category, onBack }) => {
  const { loadIssue, voteIssue, confirmIssue, addComment, voteComment } = useIssues();
  const { user, isLoggedIn, requireAuth } = useAuth();
  const [showTimelineDetails, setShowTimelineDetails] = useState(true);
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const detail = await loadIssue(issueId);
      const [withImages] = await enrichIssueImages([detail], {
        resolution: true,
        enabled: isLoggedIn,
      });
      setIssue(withImages);
    } catch (error) {
      setErrorMsg(error.message || 'Issue not found or was removed.');
    } finally {
      setLoading(false);
    }
  }, [issueId, isLoggedIn, loadIssue]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVote = async (direction) => {
    if (!requireAuth()) return;
    try {
      await voteIssue(issueId, direction);
      await load();
    } catch (error) {
      Alert.alert('Vote failed', error.message);
    }
  };

  const handleConfirm = async () => {
    if (!requireAuth()) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location is required to confirm a report.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await confirmIssue(issueId, position.coords.latitude, position.coords.longitude);
      await load();
    } catch (error) {
      Alert.alert('Could not confirm', error.message);
    }
  };

  const handleAddComment = async (id, text, parentId, authorInfo) => {
    const isAnonymous =
      typeof authorInfo === 'boolean' ? authorInfo : Boolean(authorInfo?.isAnonymous);
    try {
      await addComment(id, text, parentId, isAnonymous);
      await load();
    } catch (error) {
      Alert.alert('Comment failed', error.message || 'Please try again.');
    }
  };

  const handleVoteComment = async (id, commentId, direction) => {
    if (!requireAuth()) return;
    try {
      await voteComment(id, commentId, direction);
      await load();
    } catch (error) {
      Alert.alert('Vote failed', error.message);
    }
  };

  if (loading && !issue) {
    return (
      <View style={styles.notFoundContainer}>
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
        <Text style={styles.notFoundText}>Loading report…</Text>
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>
          {errorMsg || 'Issue not found or was removed.'}
        </Text>
        <TouchableOpacity style={styles.backBtnFallback} onPress={onBack}>
          <Text style={styles.backBtnFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.reported;

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${issue.title} - ${issue.location}`);
          alert('Issue link copied to clipboard!');
        }
      } else {
        await Share.share({
          message: `Civic Issue: "${issue.title}" at ${issue.location}. Verified via Argus Panoptes.`,
          title: issue.title,
        });
      }
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.charcoal} />
        </TouchableOpacity>

        <View style={styles.headerMiddle}>
          <View style={styles.categoryPill}>
            <Ionicons
              name={category?.icon || 'grid-outline'}
              size={12}
              color={category?.color || COLORS.brandGreen}
            />
            <Text style={styles.categoryPillText} numberOfLines={1}>
              {category?.name || 'Civic Issue'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.shareHeaderBtn}
          onPress={handleShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color={COLORS.charcoal} />
        </TouchableOpacity>
      </View>

      {/* 2. Main Scroll Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Author & Timestamp Bar */}
        <View style={styles.authorSection}>
          <View style={styles.authorLeft}>
            <View style={[styles.avatarCircle, issue.isAnonymous && styles.anonAvatar]}>
              <Ionicons
                name={issue.isAnonymous ? 'finger-print-outline' : 'person'}
                size={16}
                color={issue.isAnonymous ? '#64748B' : COLORS.brandGreen}
              />
            </View>
            <View>
              <View style={styles.authorBadgeRow}>
                <Text style={styles.authorName}>{issue.author}</Text>
                {issue.authorBadge && (
                  <View style={styles.authorBadgePill}>
                    <Text style={styles.authorBadgeText}>{issue.authorBadge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.reportedTime}>Reported {issue.timeAgo}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.dotColor }]} />
            <Text style={styles.statusBadgeText}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Issue Title */}
        <Text style={styles.issueTitle}>{issue.title}</Text>

        {/* Exact or Approximate Location */}
        <View style={styles.locationCard}>
          <Ionicons name="location" size={16} color={COLORS.brandGreen} />
          <View style={styles.locationDetails}>
            <Text style={styles.locationLabel}>LOCATION</Text>
            <Text style={styles.locationValue}>{issue.location}</Text>
          </View>
        </View>

        {/* Full Issue Description */}
        <Text style={styles.descriptionText}>{issue.description}</Text>

        {/* Attached Original Photographic Evidence */}
        {!!issue.image && (
          <View style={styles.evidenceSection}>
            <View style={styles.evidenceHeaderRow}>
              <Ionicons name="image-outline" size={15} color="#475569" />
              <Text style={styles.evidenceHeading}>Original Photographic Evidence</Text>
            </View>

            <View style={styles.imageCard}>
              <Image
                source={typeof issue.image === 'string' ? { uri: issue.image } : issue.image}
                style={styles.evidenceImage}
                resizeMode="cover"
              />
              {!!issue.imageCaption && (
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>{issue.imageCaption}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {!!issue.resolvedImage && (
          <View style={styles.evidenceSection}>
            <View style={styles.evidenceHeaderRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#15803D" />
              <Text style={styles.evidenceHeading}>Resolution Evidence</Text>
            </View>
            <View style={styles.imageCard}>
              <Image source={{ uri: issue.resolvedImage }} style={styles.evidenceImage} resizeMode="cover" />
            </View>
          </View>
        )}

        {/* Status Timeline Section */}
        <View style={styles.timelineCard}>
          <TouchableOpacity
            style={styles.timelineHeader}
            onPress={() => setShowTimelineDetails((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.timelineHeaderLeft}>
              <Ionicons name="time-outline" size={16} color={COLORS.charcoal} />
              <Text style={styles.timelineHeading}>Civic Resolution Timeline</Text>
            </View>
            <Ionicons
              name={showTimelineDetails ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>

          {showTimelineDetails && (
            <View style={styles.timelineSteps}>
              {issue.timeline &&
                issue.timeline.map((step, idx) => {
                  const isCurrent = step.key === issue.status;
                  const isCompleted = step.completed;
                  const isLast = idx === issue.timeline.length - 1;

                  return (
                    <View key={step.key} style={styles.stepRow}>
                      {/* Step Indicator Dot & Connector Line */}
                      <View style={styles.indicatorCol}>
                        <View
                          style={[
                            styles.stepDot,
                            isCompleted && styles.stepDotCompleted,
                            isCurrent && styles.stepDotCurrent,
                          ]}
                        >
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                          ) : (
                            <View style={styles.innerDot} />
                          )}
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.stepConnector,
                              isCompleted && styles.stepConnectorCompleted,
                            ]}
                          />
                        )}
                      </View>

                      {/* Step Details */}
                      <View style={styles.stepContentCol}>
                        <View style={styles.stepTitleRow}>
                          <Text
                            style={[
                              styles.stepLabel,
                              (isCompleted || isCurrent) && styles.stepLabelActive,
                            ]}
                          >
                            {step.label}
                          </Text>
                          <Text style={styles.stepDate}>{step.date}</Text>
                        </View>
                        <Text style={styles.stepDesc}>{step.description}</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </View>

        {/* Quick Citizen Support Actions Bar */}
        <View style={styles.voteBarCard}>
          <View style={styles.voteBarLeft}>
            <Text style={styles.voteBarLabel}>Citizen Priority Vote:</Text>
            <VoteControl
              upvotes={issue.upvotes || 0}
              userVote={issue.userVote || 0}
              onVote={handleVote}
              size="normal"
            />
          </View>

          <TouchableOpacity
            style={[styles.shareActionBtn, issue.userConfirmed && styles.confirmedActionBtn]}
            onPress={handleConfirm}
          >
            <Ionicons
              name={issue.userConfirmed ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={16}
              color={issue.userConfirmed ? '#15803D' : '#475569'}
            />
            <Text
              style={[
                styles.shareActionText,
                issue.userConfirmed && styles.confirmedActionText,
              ]}
            >
              {issue.userConfirmed
                ? 'Witnessed'
                : `Witness (${issue.confirmationsCount || 0})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareActionBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={16} color="#475569" />
            <Text style={styles.shareActionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Threaded Community Discussion Section */}
        <CommentSection
          issueId={issue.id}
          comments={issue.comments || []}
          onAddComment={handleAddComment}
          onVoteComment={handleVoteComment}
          currentUser={user}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  backBtnFallback: {
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnFallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  shareHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonAvatar: {
    backgroundColor: '#F1F5F9',
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  authorBadgePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  authorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  reportedTime: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  issueTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 14.5,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 16,
  },
  evidenceSection: {
    marginBottom: 16,
  },
  evidenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  evidenceHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#000000',
  },
  evidenceImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F1F5F9',
  },
  captionContainer: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  captionText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineSteps: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.brandGreen,
  },
  stepDotCurrent: {
    backgroundColor: '#2563EB',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  stepConnectorCompleted: {
    backgroundColor: COLORS.brandGreen,
  },
  stepContentCol: {
    flex: 1,
    paddingBottom: 14,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  stepDesc: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  voteBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  voteBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voteBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  shareActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  confirmedActionBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  confirmedActionText: {
    color: '#15803D',
  },
});

