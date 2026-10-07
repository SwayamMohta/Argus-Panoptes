import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { DEMO_ACCOUNTS } from '../constants/presets';
import { useAuth } from '../context/AuthContext';
import { ProfileBanner } from '../components/profile/ProfileBanner';

export const GuestProfileScreen = () => {
  const { openAuthModal, loginWithDemo } = useAuth();

  return (
    <ScrollView style={styles.profileScrollView} contentContainerStyle={styles.profileScrollContent}>
      {/* Neutral Guest Banner */}
      <ProfileBanner isGuest={true} />

      {/* Overlapping Guest Avatar & Info */}
      <View style={styles.profileMetaBlock}>
        <View style={styles.avatarOverlapWrapper}>
          <View style={[styles.avatarOverlapCircle, { backgroundColor: '#EDEFF0' }]}>
            <Feather name="user" size={32} color={COLORS.charcoal} />
          </View>
        </View>

        <View style={styles.userInfoRow}>
          <Text style={styles.userName}>Guest Auditor</Text>
          <Text style={styles.userSub}>Anonymous Public Mode</Text>
          <Text style={styles.userLocation}>
            Sign in to submit verified geotagged audits & track redressals
          </Text>
        </View>

        {/* Auth CTA Cards */}
        <View style={styles.guestAuthButtonsRow}>
          <TouchableOpacity
            style={styles.primaryAuthBtn}
            onPress={() => openAuthModal('login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryAuthBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAuthBtn}
            onPress={() => openAuthModal('register')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryAuthBtnText}>Register New Auditor</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Demo Auditor Switcher */}
        <View style={styles.quickDemoCard}>
          <Text style={styles.quickDemoLabel}>Instant Test Logins:</Text>
          <View style={styles.quickDemoPillsRow}>
            {DEMO_ACCOUNTS.map((acc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.demoPill}
                onPress={() => loginWithDemo(acc)}
                activeOpacity={0.7}
              >
                <Feather
                  name={acc.avatarIcon || 'user'}
                  size={14}
                  color={acc.avatarIconColor || COLORS.charcoal}
                />
                <Text style={styles.demoPillText}>{acc.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Thick Divider */}
      <View style={styles.thickSectionDivider} />

      {/* Guest Open Civic Tools */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Public Civic Tools</Text>
        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => openAuthModal('login')}
          >
            <View style={styles.menuIconWrap}>
              <Feather name="file-text" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>RTI & Open Toolkit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => openAuthModal('login')}
          >
            <View style={styles.menuIconWrap}>
              <Feather name="download" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>Export Public Open Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileScrollView: {
    flex: 1,
  },
  profileScrollContent: {
    paddingBottom: 110,
  },
  profileMetaBlock: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avatarOverlapWrapper: {
    marginTop: -38,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  avatarOverlapCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoRow: {
    marginTop: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.charcoal,
    letterSpacing: -0.3,
  },
  userSub: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '600',
    marginTop: 2,
  },
  userLocation: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    marginTop: 3,
  },
  guestAuthButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryAuthBtn: {
    flex: 1,
    backgroundColor: COLORS.brandGreen,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAuthBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryAuthBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryAuthBtnText: {
    color: COLORS.charcoal,
    fontSize: 13,
    fontWeight: '700',
  },
  quickDemoCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickDemoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.subtext,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  quickDemoPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  demoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  profileSectionBlock: {
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  menuList: {
    gap: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  thickSectionDivider: {
    height: 8,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
});
