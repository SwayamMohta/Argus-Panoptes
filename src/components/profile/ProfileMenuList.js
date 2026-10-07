import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export const ProfileMenuList = ({ onOpenSettings, onSignOut }) => {
  return (
    <>
      {/* SECTION 1: Preferences & Settings (Top Section) */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Preferences</Text>
        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenSettings}
          >
            <View style={styles.menuIconWrap}>
              <Feather name="settings" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Thick Section Divider */}
      <View style={styles.thickSectionDivider} />

      {/* SECTION 2: Auditing & Civic Impact */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Auditing & Impact</Text>
        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Feather name="shopping-bag" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>My Audits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Feather name="credit-card" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>
              My Civic Impact <Text style={styles.menuMutedText}>($1,024)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Feather name="heart" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>Your Favorite Places</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Thick Section Divider */}
      <View style={styles.thickSectionDivider} />

      {/* SECTION 3: Legal Toolkit & Ward Oversight */}
      <View style={styles.profileSectionBlock}>
        <Text style={styles.sectionHeaderLabel}>Civic Tools & Ward</Text>
        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Feather name="file-text" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>RTI & Civic Toolkit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Feather name="book-open" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>Citizen Charter & SLAs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Feather name="users" size={20} color={COLORS.charcoal} />
            </View>
            <Text style={styles.menuTitle}>Ward Committee Docket</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out Button with Generous Top Padding */}
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
  thickSectionDivider: {
    height: 8,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
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
