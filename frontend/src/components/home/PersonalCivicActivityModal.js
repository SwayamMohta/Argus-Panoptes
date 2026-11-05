import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useIssues } from '../../context/IssuesContext';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES_DATA } from '../../constants/categoriesData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PersonalCivicActivityModal = ({
  visible,
  onClose,
  onSelectIssue,
}) => {
  const { issues } = useIssues();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('confirmed');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        mass: 0.8,
        stiffness: 240,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT * 0.5);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT * 0.5,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Derive genuine civic activity stats
  const submittedIssues = useMemo(() => {
    return issues.filter(
      (iss) =>
        iss.author === user?.name ||
        iss.author === 'u/civic_scout_91' ||
        iss.author === 'Anonymous Citizen'
    );
  }, [issues, user]);

  const confirmedIssues = useMemo(() => {
    return issues.filter((iss) => !!iss.userConfirmed);
  }, [issues]);

  const resolvedIssues = useMemo(() => {
    return issues.filter((iss) => iss.status === 'resolved');
  }, [issues]);

  const trackedIssues = useMemo(() => {
    return issues.filter((iss) => !!iss.userConfirmed || (iss.userVote && iss.userVote > 0));
  }, [issues]);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'submitted':
        return submittedIssues;
      case 'confirmed':
        return confirmedIssues;
      case 'resolved':
        return resolvedIssues;
      case 'tracked':
      default:
        return trackedIssues;
    }
  }, [activeTab, submittedIssues, confirmedIssues, resolvedIssues, trackedIssues]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Personal Civic Activity</Text>
              <Text style={styles.headerSubtitle}>
                Verified participation, ground confirmations & issue tracking
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

              {/* 4 Summary Stat Cards */}
              <View style={styles.statsGrid}>
                <TouchableOpacity
                  style={[styles.statCard, activeTab === 'submitted' && styles.statCardActive]}
                  onPress={() => setActiveTab('submitted')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statNumber}>{submittedIssues.length}</Text>
                  <Text style={styles.statLabel}>Submitted</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statCard, activeTab === 'confirmed' && styles.statCardActive]}
                  onPress={() => setActiveTab('confirmed')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statNumber, { color: '#15803D' }]}>{confirmedIssues.length}</Text>
                  <Text style={styles.statLabel}>Witnessed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statCard, activeTab === 'resolved' && styles.statCardActive]}
                  onPress={() => setActiveTab('resolved')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statNumber, { color: '#2563EB' }]}>{resolvedIssues.length}</Text>
                  <Text style={styles.statLabel}>Resolved</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statCard, activeTab === 'tracked' && styles.statCardActive]}
                  onPress={() => setActiveTab('tracked')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statNumber}>{trackedIssues.length}</Text>
                  <Text style={styles.statLabel}>Tracked</Text>
                </TouchableOpacity>
              </View>

              {/* Active Tab Header */}
              <View style={styles.tabSectionHeader}>
                <Text style={styles.tabSectionTitle}>
                  {activeTab === 'submitted' && 'Issues You Have Reported'}
                  {activeTab === 'confirmed' && 'Issues Personally Witnessed & Confirmed'}
                  {activeTab === 'resolved' && 'Nearby Civic Issues Resolved'}
                  {activeTab === 'tracked' && 'Issues Currently Under Active Tracking'}
                </Text>
                <Text style={styles.tabSectionCount}>{currentList.length} items</Text>
              </View>

              {/* Scrollable List */}
              <ScrollView style={styles.issuesScroll} showsVerticalScrollIndicator={false}>
                {currentList.length > 0 ? (
                  currentList.map((issue) => {
                    const cat = CATEGORIES_DATA.find((c) => c.id === issue.categoryId);
                    return (
                      <TouchableOpacity
                        key={issue.id}
                        style={styles.issueItem}
                        onPress={() => {
                          onClose();
                          onSelectIssue && onSelectIssue(issue);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemLeft}>
                          <View style={styles.catDot}>
                            <Ionicons
                              name={cat?.icon || 'alert-circle-outline'}
                              size={14}
                              color={cat?.color || COLORS.brandGreen}
                            />
                          </View>
                          <View style={styles.itemMeta}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {issue.title}
                            </Text>
                            <Text style={styles.itemSub} numberOfLines={1}>
                              {issue.location} · {issue.timeAgo}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.itemRight}>
                          {issue.status === 'resolved' ? (
                            <View style={styles.resolvedBadge}>
                              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                            </View>
                          ) : (
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
                    <Text style={styles.emptyText}>No records in this category yet.</Text>
                    {activeTab === 'confirmed' && (
                      <Text style={styles.emptySub}>
                        Tap "Witnessed" on any nearby issue you have personally seen to record your confirmation.
                      </Text>
                    )}
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.charcoal,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.charcoal,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  tabSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  tabSectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  issuesScroll: {
    maxHeight: 320,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  catDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.charcoal,
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  resolvedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.charcoal,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});

