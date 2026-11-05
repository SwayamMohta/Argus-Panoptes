import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export const WardAtAGlance = ({ locality, issues = [] }) => {
  // 1. Active Issues
  const activeCount = issues.filter((i) => i.status !== 'resolved').length;

  // 2. Urgent Hazards (hazard/danger keywords or isUrgent/priority)
  const isHazard = (i) =>
    i.isUrgent ||
    i.priority === 'hazard' ||
    /hazard|danger|crater|emergency|collapse|live|exposed|sagging/i.test(
      `${i.title || ''} ${i.description || ''}`
    );
  const hazardCount = issues.filter(
    (i) => i.status !== 'resolved' && isHazard(i)
  ).length;

  // 3. Awaiting Verification (newly reported or low confirmations < 10)
  const awaitingVerificationCount = issues.filter(
    (i) => i.status === 'reported' || (i.status !== 'resolved' && (i.confirmationsCount || 0) < 10)
  ).length;

  // 4. Resolved This Week
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;

  const metrics = [
    {
      id: 'active',
      value: activeCount,
      label: 'Active Issues',
      dotColor: '#2563EB',
    },
    {
      id: 'hazards',
      value: hazardCount,
      label: 'Urgent Hazards',
      dotColor: '#DC2626',
    },
    {
      id: 'awaiting',
      value: awaitingVerificationCount,
      label: 'Awaiting Verification',
      dotColor: '#D97706',
    },
    {
      id: 'resolved',
      value: resolvedCount,
      label: 'Resolved This Week',
      dotColor: '#16A34A',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>WARD AT A GLANCE</Text>
        <Text style={styles.wardLabel} numberOfLines={1}>
          {locality?.ward ? `${locality.ward}` : 'Ward'}
          {locality?.name ? ` · ${locality.name}` : ''}
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.metricNumber}>{metrics[0].value}</Text>
              <View style={[styles.statusDot, { backgroundColor: metrics[0].dotColor }]} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              {metrics[0].label}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.metricNumber}>{metrics[1].value}</Text>
              <View style={[styles.statusDot, { backgroundColor: metrics[1].dotColor }]} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              {metrics[1].label}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.metricNumber}>{metrics[2].value}</Text>
              <View style={[styles.statusDot, { backgroundColor: metrics[2].dotColor }]} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              {metrics[2].label}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.metricNumber}>{metrics[3].value}</Text>
              <View style={[styles.statusDot, { backgroundColor: metrics[3].dotColor }]} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              {metrics[3].label}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
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
  wardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    maxWidth: '55%',
    textAlign: 'right',
  },
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  metricNumber: {
    fontSize: 23,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
  },
});

