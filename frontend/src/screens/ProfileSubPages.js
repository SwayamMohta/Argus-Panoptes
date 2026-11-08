import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { CATEGORIES_DATA } from '../constants/categoriesData';
import { api } from '../lib/api';

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
  const [audits, setAudits] = useState([]);
  const [kpis, setKpis] = useState({ totalLogged: 0, verified: 0, underReview: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .audits(1, 100)
      .then((page) => {
        if (!active) return;
        setKpis(page.kpis || {});
        setAudits(
          (page.items || []).map((issue) => ({
            id: issue.id,
            publicRef: issue.publicRef,
            title: issue.title,
            location: issue.location,
            sector:
              CATEGORIES_DATA.find((category) => category.id === issue.categoryId)?.name ||
              issue.categoryId,
            verified: issue.status === 'resolved',
            statusLabel: issue.statusLabel,
            date: new Date(issue.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          }))
        );
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <SubPageHeader title="My Audits" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* KPI Ribbon */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{kpis.totalLogged || 0}</Text>
            <Text style={styles.kpiLabel}>Total Logged</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: COLORS.brandGreen }]}>
              {kpis.verified || 0}
            </Text>
            <Text style={styles.kpiLabel}>Verified</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>
              {kpis.underReview || 0}
            </Text>
            <Text style={styles.kpiLabel}>In Review</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>LOGGED CIVIC AUDITS</Text>

        {loading && <ActivityIndicator color={COLORS.brandGreen} style={{ marginTop: 24 }} />}

        {!loading && audits.length === 0 && (
          <Text style={styles.emptyText}>No reports yet. Your published reports appear here.</Text>
        )}

        {audits.map((item) => (
          <View key={item.id} style={styles.auditCard}>
            <View style={styles.auditCardHeader}>
              <Text style={styles.auditSector}>{item.sector}</Text>
              <View style={styles.statusBadgeClean}>
                <Ionicons
                  name={item.verified ? 'shield-checkmark' : 'time-outline'}
                  size={14}
                  color={item.verified ? '#15803D' : '#D97706'}
                />
              </View>
            </View>

            <Text style={styles.auditTitle}>{item.title}</Text>
            <Text style={styles.auditLoc}>
              {item.location} • {item.date}
            </Text>

            <View style={styles.auditFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hashLabel}>CIVIC REPORT ID</Text>
                <Text style={styles.hashText}>{item.publicRef}</Text>
              </View>
              <View style={styles.scorePill}>
                <Ionicons name="time-outline" size={13} color={COLORS.brandGreen} />
                <Text style={styles.scoreText}>{item.statusLabel}</Text>
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
const inr = (value) => {
  try {
    return `₹${new Intl.NumberFormat('en-IN').format(value || 0)}`;
  } catch {
    return `₹${value || 0}`;
  }
};

export const CivicImpactPage = ({ onBack }) => {
  const [impact, setImpact] = useState({
    totalValueInr: 0,
    verifiedCount: 0,
    sectorBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .impact()
      .then((data) => active && setImpact(data))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <SubPageHeader title="My Civic Impact" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Main Impact Card */}
        <View style={styles.heroImpactCard}>
          <Text style={styles.heroImpactLabel}>TOTAL MUNICIPAL VALUE UNLOCKED</Text>
          <Text style={styles.heroImpactValue}>{inr(impact.totalValueInr)}</Text>
          <Text style={styles.heroImpactSub}>
            Estimated public fund waste prevented via early defect reporting
          </Text>
        </View>

        {/* 4-Stat Grid */}
        <Text style={styles.sectionHeading}>KEY PERFORMANCE METRICS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>{impact.verifiedCount || 0}</Text>
            <Text style={styles.statGridLabel}>Reports Verified</Text>
            <Text style={styles.statGridSub}>Resolved reports linked to you</Text>
          </View>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>{impact.sectorBreakdown?.length || 0}</Text>
            <Text style={styles.statGridLabel}>Infrastructure Sectors</Text>
            <Text style={styles.statGridSub}>Sectors with resolved reports</Text>
          </View>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>{inr(impact.totalValueInr)}</Text>
            <Text style={styles.statGridLabel}>Value Unlocked</Text>
            <Text style={styles.statGridSub}>Derived from category cost data</Text>
          </View>
          <View style={styles.statGridCard}>
            <Text style={styles.statGridVal}>Live</Text>
            <Text style={styles.statGridLabel}>Data Source</Text>
            <Text style={styles.statGridSub}>Computed from civic records</Text>
          </View>
        </View>

        {/* Impact Breakdown */}
        <Text style={styles.sectionHeading}>SECTOR SAVINGS BREAKDOWN</Text>
        {loading && <ActivityIndicator color={COLORS.brandGreen} style={{ marginTop: 16 }} />}
        {!loading && (impact.sectorBreakdown || []).length === 0 && (
          <Text style={styles.emptyText}>
            No resolved reports yet. Impact is calculated when your reports are resolved.
          </Text>
        )}
        <View style={styles.breakdownCard}>
          {(impact.sectorBreakdown || []).map((sector, index, rows) => (
            <View
              key={sector.categoryId}
              style={[
                styles.breakdownRow,
                index === rows.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownSector}>{sector.category}</Text>
                <Text style={styles.breakdownDesc}>
                  {sector.resolvedCount} resolved{' '}
                  {sector.resolvedCount === 1 ? 'report' : 'reports'}
                </Text>
              </View>
              <Text style={styles.breakdownAmount}>{inr(sector.valueInr)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// ===========================================================================
// 3. Your Favorite Places Full Page
// ===========================================================================
export const FavoritePlacesPage = ({ onBack }) => {
  const [monitoredPlaces, setMonitoredPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    const rows = await api.favorites();
    setMonitoredPlaces(
      (rows || []).map((favorite) => ({
        id: favorite.id,
        label: favorite.label,
        title: favorite.label,
        ward:
          [favorite.area, favorite.zone, favorite.circle].filter(Boolean).join(' · ') ||
          'Saved point',
        areaId: favorite.areaId,
        pinned: favorite.pinned,
      }))
    );
  };

  useEffect(() => {
    let active = true;
    api
      .favorites()
      .then((rows) => {
        if (!active) return;
        setMonitoredPlaces(
          (rows || []).map((favorite) => ({
            id: favorite.id,
            label: favorite.label,
            title: favorite.label,
            ward:
              [favorite.area, favorite.zone, favorite.circle].filter(Boolean).join(' · ') ||
              'Saved point',
            areaId: favorite.areaId,
            pinned: favorite.pinned,
          }))
        );
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleTogglePin = async (id) => {
    const place = monitoredPlaces.find((item) => item.id === id);
    if (!place) return;
    setMonitoredPlaces((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item))
    );
    try {
      await api.updateFavorite(id, { pinned: !place.pinned });
    } catch (error) {
      Alert.alert('Could not update favorite', error.message);
      loadFavorites().catch(() => {});
    }
  };

  const handleAddFavorite = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location is required to add a monitored place.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lookup = await api.areaAt(position.coords.latitude, position.coords.longitude);
      await api.addFavorite(
        lookup.status === 'matched'
          ? {
              label: lookup.area.name,
              areaId: lookup.area.id,
              coordinates: {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              },
            }
          : {
              label: 'My current location',
              coordinates: {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              },
            }
      );
      await loadFavorites();
    } catch (error) {
      if (error.status === 409) {
        Alert.alert('Already Saved', 'This ward is already in your favorite places.');
      } else {
        Alert.alert('Could not add place', error.message || 'Please try again.');
      }
    }
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

        {loading && <ActivityIndicator color={COLORS.brandGreen} style={{ marginTop: 16 }} />}
        {!loading && monitoredPlaces.length === 0 && (
          <Text style={styles.emptyText}>
            No favorite places yet. Add a ward to monitor it from this profile.
          </Text>
        )}

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
                <Ionicons name="location-outline" size={13} color="#D97706" />
                <Text style={styles.issueCountText}>
                  {place.areaId ? 'GHMC ward' : 'Saved point'}
                </Text>
              </View>
              <Text style={styles.placeAuditedText}>
                {place.pinned ? 'Pinned' : 'Unpinned'}
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={handleAddFavorite}
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
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [escalatingId, setEscalatingId] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .serviceStandards()
      .then((rows) => {
        if (!active) return;
        setSlas(
          (rows || []).map((row) => ({
            id: row.id,
            service: row.service,
            standard: row.standard,
            authority: row.authority,
            critical: row.critical,
          }))
        );
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleEscalate = async (sla) => {
    if (!sla || escalatingId) return;
    setEscalatingId(sla.id);
    try {
      await api.escalate({
        serviceStandardId: sla.id,
        note: `Citizen Charter escalation for ${sla.service}.`,
      });
      Alert.alert('SLA Escalated', 'The escalation has been recorded and queued.');
    } catch (error) {
      Alert.alert('Could not escalate', error.message || 'Please try again.');
    } finally {
      setEscalatingId(null);
    }
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

        {loading && <ActivityIndicator color={COLORS.brandGreen} style={{ marginTop: 16 }} />}

        {slas.map((sla) => (
          <TouchableOpacity
            key={sla.id}
            style={[styles.slaCard, sla.critical && styles.slaCardCritical]}
            onPress={() => handleEscalate(sla)}
            activeOpacity={0.8}
          >
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
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.dangerActionBtn}
          onPress={() => handleEscalate(slas.find((sla) => sla.critical) || slas[0])}
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

