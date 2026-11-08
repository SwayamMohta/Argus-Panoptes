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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { api } from '../../lib/api';
import { adaptWard } from '../../lib/format';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const POPULAR_WARDS = [
  'BANJARA HILLS',
  'MADHAPUR',
  'KUKATPALLY',
  'GACHIBOWLI',
  'TOLICHOWKI',
  'JUBILEE HILLS',
  'BEGUMPET',
  'SERILINGAMPALLY',
];

export const LocalityPickerModal = ({
  visible,
  currentLocality,
  wards = [],
  onSelectLocality,
  onGpsResult,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);

  const finish = (ward) => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT * 0.5,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onSelectLocality(ward);
      onClose();
    });
  };

  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    return wards
      .filter(
        (ward) =>
          ward.name.toLowerCase().includes(query) ||
          String(ward.ward || '').includes(query) ||
          (ward.zone || '').toLowerCase().includes(query) ||
          (ward.circle || '').toLowerCase().includes(query)
      )
      .slice(0, 40);
  }, [searchQuery, wards]);

  const popularWards = useMemo(() => {
    const matches = POPULAR_WARDS.flatMap((name) =>
      wards.filter((ward) => ward.name.toUpperCase().includes(name))
    );
    return (matches.length ? matches : wards).slice(0, 8);
  }, [wards]);

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

  const handleSelectCurrentGPS = async () => {
    setGpsBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location access is needed to find your ward.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lookup = await api.areaAt(position.coords.latitude, position.coords.longitude);
      if (lookup.status === 'matched') {
        onGpsResult?.(null);
        const match =
          wards.find((ward) => ward.id === lookup.area.id || ward.wardName === lookup.area.name) ||
          adaptWard({
            id: lookup.area.id,
            name: lookup.area.name,
            center: { lat: position.coords.latitude, lon: position.coords.longitude },
          });
        finish(match);
      } else if (lookup.status === 'ambiguous') {
        const message =
          'Your location falls on a ward boundary. Pick a ward manually before submitting.';
        onGpsResult?.(message);
        Alert.alert('Ward Boundary', message);
      } else {
        let nearest = [];
        try {
          nearest = await api.nearestAreas(
            position.coords.latitude,
            position.coords.longitude,
            1
          );
        } catch {
          // Nearest-ward lookup is best effort.
        }
        const nearestText = nearest[0]
          ? `Nearest ward: ${nearest[0].area.name} (~${Math.round(nearest[0].distanceM)} m).`
          : '';
        const filterText = currentLocality?.name
          ? `The current filter remains ${currentLocality.name}.`
          : '';
        const message = `No GHMC ward matched your GPS. ${nearestText} ${filterText} You can still submit; the report will be marked unmatched.`;
        onGpsResult?.(message);
        Alert.alert('No GHMC Ward Matched', message);
      }
    } catch (error) {
      Alert.alert('Location Unavailable', error.message || 'Could not read your location.');
    } finally {
      setGpsBusy(false);
    }
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
                            onPress={() => finish(item)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.itemIconBadge}>
                              <Ionicons name="location-outline" size={18} color="#0F172A" />
                            </View>
                            <View style={styles.searchResultTextGroup}>
                              <Text style={styles.searchResultName}>
                                {item.name}
                                {item.ward ? ` · Ward ${item.ward}` : ''}
                              </Text>
                              <Text style={styles.searchResultZone}>
                                {[item.zone, item.circle].filter(Boolean).join(' · ') ||
                                  'Hyderabad'}
                              </Text>
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
                        <Text style={styles.gpsSubtext}>
                          {gpsBusy ? 'Detecting your GHMC ward…' : 'Find the ward around you'}
                        </Text>
                      </View>
                      {gpsBusy ? (
                        <ActivityIndicator size="small" color="#0F172A" />
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                      )}
                    </TouchableOpacity>

                    {/* Section Heading */}
                    <Text style={styles.sectionHeaderTitle}>GHMC Wards</Text>

                    {popularWards.length === 0 && (
                      <Text style={styles.emptySearchSubtitle}>Loading Hyderabad wards…</Text>
                    )}

                    {popularWards.map((item) => {
                      const isSelected = currentLocality?.id === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.localityCard, isSelected && styles.itemSelected]}
                          onPress={() => finish(item)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.cardIconBadge}>
                            <Ionicons name="location-outline" size={20} color="#0F172A" />
                            <Text style={styles.cardTagText}>
                              {item.ward ? `Ward ${item.ward}` : 'GHMC'}
                            </Text>
                          </View>

                          <View style={styles.cardCenter}>
                            <Text style={styles.cardLabel}>{item.name}</Text>
                            <Text style={styles.cardWardInfo}>
                              {[item.zone, item.circle].filter(Boolean).join(' · ') ||
                                'Hyderabad'}
                            </Text>
                            <View style={styles.cardStatusRow}>
                              <View style={styles.statusDot} />
                              <Text style={styles.cardStatusText}>
                                {isSelected ? 'Selected ward' : 'Tap to filter this ward'}
                              </Text>
                            </View>
                          </View>

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
