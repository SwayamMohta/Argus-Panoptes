import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const ProfileMenuList = ({
  onOpenSettings,
  onOpenMyAudits,
  onOpenCivicImpact,
  onOpenFavoritePlaces,
  onOpenRtiToolkit,
  onOpenCitizenCharter,
  onOpenWardDocket,
  onSignOut,
}) => {
  return (
    <>
      {/* SECTION 1: Preferences & Settings */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Preferences</Text>
        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenSettings}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="settings" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Settings</Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Thick Section Divider */}
      <View style={styles.thickSectionDivider} />

      {/* SECTION 2: Audits & Civic Impact */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Audits & Impact</Text>
        <View style={styles.menuList}>
          {/* My Audits */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenMyAudits}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="clipboard" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>My Audits</Text>
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.badgeText}>14 Logged</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>

          {/* My Civic Impact */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenCivicImpact}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="award" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>
                My Civic Impact <Text style={styles.menuMutedText}>(₹1,02,400)</Text>
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          {/* Your Favorite Places */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenFavoritePlaces}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="heart" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Your Favorite Places</Text>
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.badgeText}>3 Monitored</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Thick Section Divider */}
      <View style={styles.thickSectionDivider} />

      {/* SECTION 3: Legal Toolkit & Ward Oversight */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Civic Tools & Ward</Text>
        <View style={styles.menuList}>
          {/* RTI & Civic Toolkit */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenRtiToolkit}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="file-text" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>RTI & Civic Toolkit</Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          {/* Citizen Charter & SLAs */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenCitizenCharter}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="book-open" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Citizen Charter & SLAs</Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          {/* Ward Committee Docket */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenWardDocket}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Feather name="users" size={20} color={COLORS.charcoal} />
              </View>
              <Text style={styles.menuTitle}>Ward Committee Docket</Text>
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.badgeText}>Ward 102</Text>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out Button */}
      {onSignOut && (
        <View style={styles.signOutContainer}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={onSignOut}
            activeOpacity={0.85}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  menuMutedText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  thickSectionDivider: {
    height: 8,
    backgroundColor: COLORS.divider,
    marginVertical: 14,
  },
  signOutContainer: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 16,
  },
  signOutBtn: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
