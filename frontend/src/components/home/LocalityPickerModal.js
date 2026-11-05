import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOCALITIES } from '../../constants/localities';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Curated frequent/monitored civic wards
const MONITORED_LOCALITIES = [
  {
    localityId: 'bahadurpally',
    label: 'Bahadurpally',
    tag: 'Ward 129',
    icon: 'navigate-outline',
    wardInfo: 'Ward 129 · Kukatpally Zone',
    landmarks: 'Mahindra University, Gandi Maisamma, Jeedimetla',
    activeReports: 3,
  },
  {
    localityId: 'banjara_hills',
    label: 'Banjara Hills',
    tag: 'Ward 98',
    icon: 'home-outline',
    wardInfo: 'Ward 98 · Khairatabad Zone',
    landmarks: 'Road No. 1, Road No. 12, Taj Krishna Junction',
    activeReports: 5,
  },
  {
    localityId: 'madhapur',
    label: 'Madhapur',
    tag: 'Ward 107',
    icon: 'business-outline',
    wardInfo: 'Ward 107 · Serilingampally Zone',
    landmarks: 'Cyber Towers, 100ft Road, Inorbit Mall Corridor',
    activeReports: 7,
  },
  {
    localityId: 'gachibowli',
    label: 'Gachibowli',
    tag: 'Ward 105',
    icon: 'location-outline',
    wardInfo: 'Ward 105 · Serilingampally Zone',
    landmarks: 'Financial District, Stadium Road, ORR Junction',
    activeReports: 4,
  },
];

export const LocalityPickerModal = ({
  visible,
  currentLocality,
  onSelectLocality,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Live filter across full administrative roster when searching
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return LOCALITIES.filter((loc) => {
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.ward.toLowerCase().includes(q) ||
        loc.zone.toLowerCase().includes(q) ||
        loc.circle.toLowerCase().includes(q) ||
        (loc.landmarks && loc.landmarks.some((lm) => lm.toLowerCase().includes(q)))
      );
    });
  }, [searchQuery]);

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
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT * 0.5,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleSelectById = (locId) => {
    Keyboard.dismiss();
    const found = LOCALITIES.find((l) => l.id === locId) || LOCALITIES[0];
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT * 0.5,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onSelectLocality(found);
      onClose();
    });
  };

  const handleSelectCurrentGPS = () => {
    Keyboard.dismiss();
    const current = LOCALITIES.find((l) => l.id === 'bahadurpally') || currentLocality || LOCALITIES[0];
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT * 0.5,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onSelectLocality(current);
      onClose();
    });
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {/* Backdrop tap dismisses keyboard and closes modal */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              styles.sheetContainer,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header Row */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Select Locality</Text>
                <Text style={styles.headerSubtitle}>Filter civic alerts and municipal issues</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close location picker"
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search locality, ward, zone, landmark..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
                {isSearching ? (
                  /* Search Results View */
                  <View style={styles.searchResultsContainer}>
                    <Text style={styles.sectionHeaderTitle}>Matching Localities ({searchResults.length})</Text>
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => {
                        const isSelected = currentLocality?.id === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.searchResultItem, isSelected && styles.itemSelected]}
                            onPress={() => {
                              onSelectLocality(item);
                              onClose();
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.itemIconBadge}>
                              <Ionicons name="location-outline" size={18} color="#0F172A" />
                            </View>
                            <View style={styles.searchResultTextGroup}>
                              <Text style={styles.searchResultName}>
                                {item.name} · {item.ward}
                              </Text>
                              <Text style={styles.searchResultZone}>
                                {item.zone} ({item.circle})
                              </Text>
                              {item.landmarks && item.landmarks.length > 0 && (
                                <Text style={styles.searchResultLandmarks} numberOfLines={1}>
                                  {item.landmarks.slice(0, 3).join(', ')}
                                </Text>
                              )}
                            </View>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                            ) : (
                              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptySearchWrap}>
                        <Ionicons name="map-outline" size={32} color="#94A3B8" />
                        <Text style={styles.emptySearchTitle}>No matching localities</Text>
                        <Text style={styles.emptySearchSubtitle}>
                          Try searching for a different ward, landmark, or street name.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    {/* GPS Quick Action Card */}
                    <TouchableOpacity
                      style={styles.gpsActionCard}
                      onPress={handleSelectCurrentGPS}
                      activeOpacity={0.75}
                    >
                      <View style={styles.gpsIconCircle}>
                        <Ionicons name="locate" size={18} color="#0F172A" />
                      </View>
                      <View style={styles.gpsTextColumn}>
                        <Text style={styles.gpsTitle}>Use Current Location</Text>
                        <Text style={styles.gpsSubtext}>Bahadurpally · Ward 129 (Within range)</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Section Heading */}
                    <Text style={styles.sectionHeaderTitle}>Monitored Municipal Wards</Text>

                    {/* Monitored Locality Cards */}
                    {MONITORED_LOCALITIES.map((item) => {
                      const isSelected = currentLocality?.id === item.localityId;
                      return (
                        <TouchableOpacity
                          key={item.localityId}
                          style={[styles.localityCard, isSelected && styles.itemSelected]}
                          onPress={() => handleSelectById(item.localityId)}
                          activeOpacity={0.75}
                        >
                          {/* Left Icon Badge */}
                          <View style={styles.cardIconBadge}>
                            <Ionicons name={item.icon} size={20} color="#0F172A" />
                            <Text style={styles.cardTagText}>{item.tag}</Text>
                          </View>

                          {/* Center Details */}
                          <View style={styles.cardCenter}>
                            <Text style={styles.cardLabel}>{item.label}</Text>
                            <Text style={styles.cardWardInfo}>{item.wardInfo}</Text>
                            <Text style={styles.cardLandmarks} numberOfLines={1}>
                              {item.landmarks}
                            </Text>

                            {/* Civic surveillance status badge */}
                            <View style={styles.cardStatusRow}>
                              <View style={styles.statusDot} />
                              <Text style={styles.cardStatusText}>
                                {item.activeReports} active civic reports in this division
                              </Text>
                            </View>
                          </View>

                          {/* Right Selection Radio */}
                          <View style={styles.cardRightAction}>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={22} color="#0F172A" />
                            ) : (
                              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
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
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    height: Math.min(SCREEN_HEIGHT * 0.78, 620),
    minHeight: 460,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 24,
  },

  /* GPS Quick Action Card */
  gpsActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    marginTop: 8,
    gap: 12,
  },
  gpsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTextColumn: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  gpsSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* Section Title */
  sectionHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  /* Monitored Locality Card */
  localityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  itemSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#FAFAFA',
  },
  cardIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  cardTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  cardCenter: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardWardInfo: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 2,
  },
  cardLandmarks: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  cardStatusText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  cardRightAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search Results */
  searchResultsContainer: {
    paddingTop: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 12,
  },
  itemIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchResultTextGroup: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchResultZone: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  searchResultLandmarks: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptySearchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySearchSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
