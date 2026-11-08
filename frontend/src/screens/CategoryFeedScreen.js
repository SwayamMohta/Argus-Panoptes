import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useIssues } from '../context/IssuesContext';
import { IssueCard } from '../components/community/IssueCard';
import { enrichIssueImages } from '../lib/images';

export const CategoryFeedScreen = ({
  category,
  onBack,
  onSelectIssue,
  onOpenCreateIssue,
}) => {
  const { loadIssues, voteIssue } = useIssues();
  const { isLoggedIn, requireAuth } = useAuth();
  const [activeSort, setActiveSort] = useState('trending'); // 'trending' | 'new' | 'top'
  const [isRubricModalVisible, setIsRubricModalVisible] = useState(false);
  const [checkedCheckpoints, setCheckedCheckpoints] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [issues, setIssues] = useState([]);

  const fetchFeed = useCallback(
    async (sort = activeSort) => {
      const page = await loadIssues({
        categoryId: category.id,
        sortBy: sort,
        limit: 50,
      });
      setIssues(await enrichIssueImages(page.items, { enabled: isLoggedIn }));
    },
    [activeSort, category.id, isLoggedIn, loadIssues]
  );

  useEffect(() => {
    fetchFeed(activeSort).catch(() => setIssues([]));
  }, [activeSort, fetchFeed]);

  const toggleCheckpoint = (id) => {
    setCheckedCheckpoints((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchFeed(activeSort);
    } catch {
      setIssues([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVote = (issueId, direction) => {
    if (!requireAuth()) return;
    voteIssue(issueId, direction).catch(() => {});
  };

  const sortOptions = [
    { key: 'trending', label: 'Trending', icon: 'flame-outline' },
    { key: 'new', label: 'New', icon: 'sparkles-outline' },
    { key: 'top', label: 'Top', icon: 'trending-up-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* 1. Category Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityLabel="Back to Categories"
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.charcoal} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.categoryBadgeRow}>
              <View style={[styles.catIconCircle, { backgroundColor: category.bgColor || '#F1F5F9' }]}>
                <Ionicons
                  name={category.icon || 'grid-outline'}
                  size={15}
                  color={category.color || COLORS.brandGreen}
                />
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {category.name}
              </Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {issues.length} Civic Issues • Community Feed
            </Text>
          </View>

          {/* Official Inspection Rubric Button */}
          <TouchableOpacity
            style={styles.rubricHeaderButton}
            onPress={() => setIsRubricModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="View Official Inspection Rubric"
          >
            <Ionicons name="clipboard-outline" size={15} color="#475569" />
            <Text style={styles.rubricHeaderButtonText}>Rubric</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Compact Feed Sorting Bar */}
        <View style={styles.sortingBar}>
          {sortOptions.map((opt) => {
            const isActive = activeSort === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortPill, isActive && styles.sortPillActive]}
                onPress={() => setActiveSort(opt.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={opt.icon}
                  size={13}
                  color={isActive ? COLORS.white : '#64748B'}
                />
                <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Vertically Scrollable Issue Feed */}
      <ScrollView
        style={styles.feedScrollView}
        contentContainerStyle={styles.feedScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.brandGreen}
          />
        }
      >
        {issues.length === 0 ? (
          <View style={styles.emptyFeedContainer}>
            <View style={styles.emptyFeedIconCircle}>
              <Ionicons name="chatbubbles-outline" size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyFeedTitle}>No civic issues reported yet</Text>
            <Text style={styles.emptyFeedText}>
              Be the first to bring visibility to public infrastructure issues in {category.name}.
            </Text>
            <TouchableOpacity
              style={styles.emptyReportButton}
              onPress={onOpenCreateIssue}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyReportButtonText}>Report First Issue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onPress={() => onSelectIssue(issue)}
              onVote={handleVote}
            />
          ))
        )}
      </ScrollView>

      {/* 4. Prominent Floating "+" Button to Create Civic Issue */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={onOpenCreateIssue}
        activeOpacity={0.9}
        accessibilityLabel="Report a new civic issue"
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 5. Preserved Official Inspection Rubric Modal */}
      {isRubricModalVisible && (
        <Modal
          visible={isRubricModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsRubricModalVisible(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsRubricModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalCategoryIconCircle,
                    { backgroundColor: category.bgColor },
                  ]}
                >
                  <Ionicons name={category.icon} size={22} color={category.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={styles.modalSubtitle}>Official Civic Inspection Rubric</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsRubricModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>

            {/* Modal Body Scroll */}
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Category Scope Callout */}
              <View style={styles.scopeCallout}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={COLORS.subtext}
                />
                <Text style={styles.scopeCalloutText}>{category.description}</Text>
              </View>

              {/* Protocol Checkpoints */}
              <Text style={styles.sectionHeading}>INSPECTION PROTOCOL CHECKPOINTS</Text>

              {category.checkpoints &&
                category.checkpoints.map((cp, idx) => {
                  const isChecked = !!checkedCheckpoints[cp.id];
                  return (
                    <TouchableOpacity
                      key={cp.id}
                      style={[styles.checkpointCard, isChecked && styles.checkpointCardChecked]}
                      onPress={() => toggleCheckpoint(cp.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.checkpointHeaderRow}>
                        <View style={styles.checkpointIndex}>
                          <Text style={styles.checkpointIndexText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.checkpointTitleArea}>
                          <Text
                            style={[
                              styles.checkpointTitle,
                              isChecked && styles.checkpointTitleChecked,
                            ]}
                          >
                            {cp.title}
                          </Text>
                          {cp.isCritical && (
                            <View style={styles.criticalBadgeIcon}>
                              <Ionicons name="alert-circle" size={13} color="#DC2626" />
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isChecked ? COLORS.brandGreen : COLORS.muted}
                        />
                      </View>
                      <Text style={styles.checkpointDesc}>{cp.desc}</Text>
                    </TouchableOpacity>
                  );
                })}

              {/* Statutory Note */}
              <View style={styles.legalNotice}>
                <Ionicons name="shield-outline" size={14} color={COLORS.subtext} />
                <Text style={styles.legalNoticeText}>
                  All logged observations require verifiable GPS coordination and photographic proof
                  before submission to municipal inspection channels.
                </Text>
              </View>
            </ScrollView>

            {/* Bottom Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.primaryAuditButton}
                onPress={() => {
                  setIsRubricModalVisible(false);
                  onOpenCreateIssue(category);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="camera-outline" size={18} color={COLORS.white} />
                <Text style={styles.primaryAuditButtonText}>
                  Report {category.shortName} Issue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    padding: 6,
    marginRight: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitleContainer: {
    flex: 1,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  rubricHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rubricHeaderButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  sortingBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  sortPillActive: {
    backgroundColor: COLORS.charcoal,
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sortPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedScrollView: {
    flex: 1,
  },
  feedScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  emptyFeedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyFeedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyFeedText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyReportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(38, 135, 85, 0.4)',
      },
    }),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalCategoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 460,
  },
  modalScrollContent: {
    padding: 16,
    gap: 12,
  },
  scopeCallout: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    gap: 8,
    alignItems: 'flex-start',
  },
  scopeCalloutText: {
    fontSize: 12,
    color: COLORS.charcoal,
    flex: 1,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  checkpointCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  checkpointCardChecked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  checkpointHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkpointIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.subtext,
  },
  checkpointTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  checkpointTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  checkpointTitleChecked: {
    color: '#15803D',
  },
  criticalBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  checkpointDesc: {
    fontSize: 12,
    color: COLORS.subtext,
    lineHeight: 16,
    paddingLeft: 28,
  },
  legalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  legalNoticeText: {
    fontSize: 11,
    color: COLORS.subtext,
    flex: 1,
    lineHeight: 15,
  },
  modalActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  primaryAuditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  primaryAuditButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});

