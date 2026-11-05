import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

// Reusable Subpage Header
const SubPageHeader = ({ title, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
      <Feather name="arrow-left" size={22} color={COLORS.charcoal} />
    </TouchableOpacity>
    <Text style={styles.headerTitle} numberOfLines={1}>
      {title}
    </Text>
    <View style={{ width: 36 }} />
  </View>
);

// ===========================================================================
// 1. My Audits Full Page
// ===========================================================================
export const MyAuditsPage = ({ onBack }) => {
  const audits = [
    {
      id: 'aud-1',
      title: 'Pothole Depth & Road Crater Severity',
      location: 'Banjara Hills, Road No. 12',
      sector: 'ROADS & WORKS',
      status: 'Verified',
      date: 'Nov 02, 2026',
      hash: '0x8F2A9C11...41E8',
      score: 96,
    },
    {
      id: 'aud-2',
      title: 'Streetlight Luminaire Circuit #18',
      location: 'Jubilee Hills, Road No. 45',
      sector: 'POWER GRID',
      status: 'Verified',
      date: 'Oct 30, 2026',
      hash: '0x3E7B8820...99A1',
      score: 92,
    },
    {
      id: 'aud-3',
      title: 'Roadside Waste Blackspot Clearance',
      location: 'Begumpet, Prakash Nagar Corner',
      sector: 'SANITATION',
      status: 'In Review',
      date: 'Oct 28, 2026',
      hash: '0x9D4C2177...55F2',
      score: 88,
    },
    {
      id: 'aud-4',
      title: 'Stormwater Sluice Grating Integrity',
      location: 'Tolichowki, Paramount Hills',
      sector: 'STORM DRAINAGE',
      status: 'Verified',
      date: 'Oct 22, 2026',
      hash: '0x1A4C9921...88B3',
      score: 95,
    },
  ];

  return (
    <View style={styles.container}>
      <SubPageHeader title="My Audits" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* KPI Ribbon */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>14</Text>
            <Text style={styles.kpiLabel}>Total Logged</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: COLORS.brandGreen }]}>12</Text>
            <Text style={styles.kpiLabel}>Verified</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>2</Text>
            <Text style={styles.kpiLabel}>In Review</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>LOGGED CIVIC AUDITS</Text>

        {audits.map((item) => (
          <View key={item.id} style={styles.auditCard}>
            <View style={styles.auditCardHeader}>
              <Text style={styles.auditSector}>{item.sector}</Text>
              <View style={styles.statusBadgeClean}>
                <Ionicons
                  name={item.status === 'Verified' ? 'shield-checkmark' : 'time-outline'}
                  size={14}
                  color={item.status === 'Verified' ? '#15803D' : '#D97706'}
                />
              </View>
            </View>

            <Text style={styles.auditTitle}>{item.title}</Text>
            <Text style={styles.auditLoc}>{item.location} • {item.date}</Text>

            <View style={styles.auditFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hashLabel}>VERIFIED REPORT ID</Text>
                <Text style={styles.hashText}>REP-{item.id.toUpperCase()}-2026</Text>
              </View>
              <View style={styles.scorePill}>
                <Ionicons name="shield-checkmark" size={13} color={COLORS.brandGreen} />
                <Text style={styles.scoreText}>{item.score}%</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// ===========================================================================
// 2. Civic Impact Full Page
// ===========================================================================
export const CivicImpactPage = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <SubPageHeader title="My Civic Impact" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Main Impact Card */}
        <View style={styles.heroImpactCard}>
          <Text style={styles.heroImpactLabel}>TOTAL MUNICIPAL VALUE UNLOCKED</Text>
          <Text style={styles.heroImpactValue}>₹1,02,400</Text>
          <Text style={styles.heroImpactSub}>
            Estimated public fund waste prevented via early defect reporting
          </Text>
        </View>

        {/* 4-Stat Grid */}
        <Text style={styles.sectionHeading}>KEY PERFORMANCE METRICS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>14</Text>
            <Text style={styles.statGridLabel}>Reports Verified</Text>
            <Text style={styles.statGridSub}>Across 5 infrastructure sectors</Text>
          </View>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>1,280</Text>
            <Text style={styles.statGridLabel}>Citizens Impacted</Text>
            <Text style={styles.statGridSub}>Ward 102 residents benefited</Text>
          </View>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>94%</Text>
            <Text style={styles.statGridLabel}>Accuracy Score</Text>
            <Text style={styles.statGridSub}>First-time verification rate</Text>
          </View>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>350</Text>
            <Text style={styles.statGridLabel}>Steward XP</Text>
            <Text style={styles.statGridSub}>Senior Citizen Inspector</Text>
          </View>
        </View>

        {/* Impact Breakdown */}
        <Text style={styles.sectionHeading}>SECTOR SAVINGS BREAKDOWN</Text>
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownSector}>Roads & Works</Text>
              <Text style={styles.breakdownDesc}>Early crater cold-patch vs full asphalt milling</Text>
            </View>
            <Text style={styles.breakdownAmount}>₹48,000</Text>
          </View>
          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownSector}>Water Supply Works</Text>
              <Text style={styles.breakdownDesc}>Sluice valve leak isolation (40,000L saved)</Text>
            </View>
            <Text style={styles.breakdownAmount}>₹28,400</Text>
          </View>
          <View style={styles.breakdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownSector}>Power Grid & Electrical</Text>
              <Text style={styles.breakdownDesc}>Transformer enclosure repair vs fuse replacement</Text>
            </View>
            <Text style={styles.breakdownAmount}>₹16,000</Text>
          </View>
          <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownSector}>Storm Drainage</Text>
              <Text style={styles.breakdownDesc}>Culvert desilting before flood accumulation</Text>
            </View>
            <Text style={styles.breakdownAmount}>₹10,000</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ===========================================================================
// 3. Your Favorite Places Full Page
// ===========================================================================
export const FavoritePlacesPage = ({ onBack }) => {
  const [monitoredPlaces, setMonitoredPlaces] = useState([
    {
      id: 'p1',
      title: 'Banjara Hills, Road No. 12',
      ward: 'Ward 102 • Khairatabad Circle',
      issuesCount: 4,
      lastAudited: 'Yesterday',
      pinned: true,
    },
    {
      id: 'p2',
      title: 'Jubilee Hills, Road No. 45 Junction',
      ward: 'Ward 101 • Jubilee Hills Circle',
      issuesCount: 2,
      lastAudited: '3 days ago',
      pinned: true,
    },
    {
      id: 'p3',
      title: 'Madhapur 100ft Metro Corridor',
      ward: 'Ward 108 • Serilingampally Circle',
      issuesCount: 5,
      lastAudited: '1 week ago',
      pinned: true,
    },
  ]);

  const handleTogglePin = (id) => {
    setMonitoredPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p))
    );
  };

  return (
    <View style={styles.container}>
      <SubPageHeader title="Your Favorite Places" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Ionicons name="heart-outline" size={18} color={COLORS.brandGreen} />
          <Text style={styles.infoBannerText}>
            Favorite places receive priority surveillance notifications when new civic issues or municipal repair work orders are logged.
          </Text>
        </View>

        <Text style={styles.sectionHeading}>MONITORED CIVIC HOTSPOTS</Text>

        {monitoredPlaces.map((place) => (
          <View key={place.id} style={styles.placeCard}>
            <View style={styles.placeHeader}>
              <View style={styles.placeIconCircle}>
                <Ionicons name="location" size={18} color={COLORS.brandGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeTitle}>{place.title}</Text>
                <Text style={styles.placeWard}>{place.ward}</Text>
              </View>
              <TouchableOpacity onPress={() => handleTogglePin(place.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={place.pinned ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={place.pinned ? COLORS.brandGreen : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.placeFooter}>
              <View style={styles.issueCountPill}>
                <Ionicons name="alert-circle-outline" size={13} color="#D97706" />
                <Text style={styles.issueCountText}>{place.issuesCount} Active Issues</Text>
              </View>
              <Text style={styles.placeAuditedText}>Audited {place.lastAudited}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={() => {
            const msg = 'Enter GPS location or tap any point on the GeoMap screen to add to monitored places.';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Add Monitored Place', msg);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryActionBtnText}>Add Monitored Location</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ===========================================================================
// 4. RTI & Civic Legal Toolkit Full Page
// ===========================================================================
export const RtiToolkitPage = ({ onBack }) => {
  const handleDraftRti = () => {
    const msg = 'RTI Application Draft generated under Section 6(1) of RTI Act 2005. Details copied to clipboard for submission to Public Information Officer (PIO), GHMC West Zone.';
    if (Platform.OS === 'web') alert(msg);
    else Alert.alert('RTI Draft Created', msg);
  };

  return (
    <View style={styles.container}>
      <SubPageHeader title="RTI & Civic Legal Toolkit" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.brandGreen} />
          <Text style={styles.infoBannerText}>
            The Right to Information Act 2005 empowers every citizen to inspect government works, obtain certified copies of contracts, and demand contractor warranty records.
          </Text>
        </View>

        <Text style={styles.sectionHeading}>STATUTORY DISCLOSURE TOOLS</Text>

        <View style={styles.toolCard}>
          <View style={styles.toolHeader}>
            <View style={styles.toolIconWrap}>
              <Feather name="file-text" size={18} color={COLORS.brandGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>Section 4(1)(b) Proactive Disclosures</Text>
              <Text style={styles.toolSub}>
                Access mandatory public registers containing annual ward budgets, road maintenance bills, and tenders.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.toolCard}>
          <View style={styles.toolHeader}>
            <View style={styles.toolIconWrap}>
              <Feather name="clock" size={18} color={COLORS.brandGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>30-Day Mandatory Response Clock</Text>
              <Text style={styles.toolSub}>
                Track the statutory clock. If the Public Information Officer fails to reply within 30 days, file an automatic First Appeal.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.toolCard}>
          <View style={styles.toolHeader}>
            <View style={styles.toolIconWrap}>
              <Feather name="user-check" size={18} color={COLORS.brandGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>Appellate Authority Registry</Text>
              <Text style={styles.toolSub}>
                Direct contact details for the Zonal Commissioner & First Appellate Authority (Khairatabad Circle).
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={handleDraftRti}
          activeOpacity={0.85}
        >
          <Feather name="edit-3" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryActionBtnText}>Draft 1-Click RTI Application</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ===========================================================================
// 5. Citizen Charter & SLAs Full Page
// ===========================================================================
export const CitizenCharterPage = ({ onBack }) => {
  const slas = [
    { service: 'Pothole & Asphalt Repair', standard: '48 Hours', authority: 'Roads & Works Wing', critical: false },
    { service: 'Drinking Water Pipeline Burst', standard: '12 Hours', authority: 'HMWSSB Water Division', critical: false },
    { service: 'Streetlight Luminaire Darkness', standard: '24 Hours', authority: 'Electrical Division', critical: false },
    { service: 'Solid Waste Blackspot Removal', standard: '24 Hours', authority: 'Sanitation Engineering', critical: false },
    { service: 'Missing Storm Drain Manhole Cover', standard: '6 Hours', authority: 'Stormwater Emergency Squad', critical: true },
    { service: 'Low Hanging Power Line Clearance', standard: '4 Hours', authority: 'TSSPDCL Electrical Safety', critical: true },
  ];

  const handleEscalate = () => {
    const msg = 'Statutory notice filed under Citizen Charter SLA breach clause. Notice queued for Zonal Municipal Commissioner.';
    if (Platform.OS === 'web') alert(msg);
    else Alert.alert('SLA Escalated', msg);
  };

  return (
    <View style={styles.container}>
      <SubPageHeader title="Citizen Charter & SLAs" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Ionicons name="book-outline" size={18} color={COLORS.brandGreen} />
          <Text style={styles.infoBannerText}>
            The Municipal Citizen Charter guarantees legally binding resolution timelines. When an issue exceeds these limits, citizens can escalate without penalty.
          </Text>
        </View>

        <Text style={styles.sectionHeading}>STATUTORY RESOLUTION TIMELINES</Text>

        {slas.map((sla, idx) => (
          <View key={idx} style={[styles.slaCard, sla.critical && styles.slaCardCritical]}>
            <View style={styles.slaCardTop}>
              <Text style={[styles.slaService, sla.critical && styles.slaServiceCritical]}>
                {sla.service}
              </Text>
              <View style={[styles.slaTimeBadge, sla.critical && styles.slaTimeBadgeCritical]}>
                <Text style={[styles.slaTimeBadgeText, sla.critical && styles.slaTimeBadgeTextCritical]}>
                  {sla.standard}
                </Text>
              </View>
            </View>
            <Text style={styles.slaAuthority}>{sla.authority}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.dangerActionBtn}
          onPress={handleEscalate}
          activeOpacity={0.85}
        >
          <Feather name="alert-triangle" size={16} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.dangerActionBtnText}>File SLA Escalation Notice</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ===========================================================================
// 6. Ward Committee Docket Full Page
// ===========================================================================
export const WardDocketPage = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <SubPageHeader title="Ward Committee Docket" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Ward Badge */}
        <View style={styles.heroImpactCard}>
          <Text style={styles.heroImpactLabel}>MUNICIPAL DIVISION</Text>
          <Text style={styles.heroImpactValue}>Ward 102</Text>
          <Text style={styles.heroImpactSub}>Khairatabad Circle • GHMC West Zone</Text>
        </View>

        <Text style={styles.sectionHeading}>ELECTED & EXECUTIVE ROSTER</Text>
        <View style={styles.docketCard}>
          <View style={styles.docketRow}>
            <Text style={styles.docketKey}>Elected Corporator</Text>
            <Text style={styles.docketVal}>Sri R. Narsing Rao</Text>
          </View>
          <View style={styles.docketRow}>
            <Text style={styles.docketKey}>Executive Engineer (Works)</Text>
            <Text style={styles.docketVal}>Er. P. Sridhar, M.Tech</Text>
          </View>
          <View style={styles.docketRow}>
            <Text style={styles.docketKey}>Sanitary Inspector</Text>
            <Text style={styles.docketVal}>Smt. K. Sunitha</Text>
          </View>
          <View style={[styles.docketRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.docketKey}>HMWSSB Water Manager</Text>
            <Text style={styles.docketVal}>Er. V. Anand Kumar</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>CITIZEN SABHA & AGENDA</Text>
        <View style={styles.docketCard}>
          <View style={styles.docketRow}>
            <Text style={styles.docketKey}>Next Public Meeting</Text>
            <Text style={styles.docketVal}>2nd Saturday • 10:00 AM</Text>
          </View>
          <View style={styles.docketRow}>
            <Text style={styles.docketKey}>Meeting Venue</Text>
            <Text style={styles.docketVal}>Ward Office Community Hall, Rd #10</Text>
          </View>
          <View style={[styles.docketRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.docketKey}>Current Agenda Item</Text>
            <Text style={styles.docketVal}>Stormwater Pre-Monsoon Desilting</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={() => {
            const msg = 'Your citizen attendance request has been confirmed for the upcoming Ward 102 monthly council docket.';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Docket Attendance', msg);
          }}
          activeOpacity={0.85}
        >
          <Feather name="calendar" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryActionBtnText}>RSVP for Next Ward Sabha</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: COLORS.white,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: -0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 6,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandGreen,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  dangerActionBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  // Audits
  auditCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  auditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  auditSector: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statusBadgeClean: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  auditLoc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  auditFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  hashText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },

  // Impact
  heroImpactCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroImpactLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroImpactValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroImpactSub: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 6,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statGridCard: {
    width: '48.2%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  statGridVal: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },
  statGridLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  statGridSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  breakdownCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  breakdownSector: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandGreen,
  },

  // Places
  placeCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeWard: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  placeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  issueCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  issueCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  placeAuditedText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },

  // Tools
  toolCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  toolIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  toolSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },

  // SLA
  slaCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  slaCardCritical: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  slaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slaService: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  slaServiceCritical: {
    color: '#0F172A',
  },
  slaTimeBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slaTimeBadgeCritical: {
    backgroundColor: '#F1F5F9',
  },
  slaTimeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  slaTimeBadgeTextCritical: {
    color: '#334155',
  },
  slaAuthority: {
    fontSize: 11.5,
    color: '#64748B',
  },

  // Docket
  docketCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  docketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  docketKey: {
    fontSize: 12.5,
    color: '#64748B',
  },
  docketVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});

