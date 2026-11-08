import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { ProfileBanner } from '../components/profile/ProfileBanner';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileMenuList } from '../components/profile/ProfileMenuList';
import { GuestProfileScreen } from './GuestProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { EditProfileScreen } from './EditProfileScreen';
import {
  MyAuditsPage,
  CivicImpactPage,
  FavoritePlacesPage,
  RtiToolkitPage,
  CitizenCharterPage,
  WardDocketPage,
} from './ProfileSubPages';

export const ProfileScreen = () => {
  const [profileView, setProfileView] = useState('main');
  const { isLoggedIn, user, signOut } = useAuth();

  if (!isLoggedIn) {
    return <GuestProfileScreen />;
  }

  if (!user) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
      </View>
    );
  }

  // Full-page subnavigation for Settings
  if (profileView === 'settings') {
    return <SettingsScreen onBack={() => setProfileView('main')} />;
  }

  // Full-page subnavigation for Edit Profile
  if (profileView === 'editProfile') {
    return <EditProfileScreen onBack={() => setProfileView('main')} />;
  }

  // Full-page subnavigation for My Audits
  if (profileView === 'myAudits') {
    return <MyAuditsPage onBack={() => setProfileView('main')} />;
  }

  // Full-page subnavigation for My Civic Impact
  if (profileView === 'civicImpact') {
    return <CivicImpactPage onBack={() => setProfileView('main')} />;
  }

  // Full-page subnavigation for Your Favorite Places
  if (profileView === 'favoritePlaces') {
    return <FavoritePlacesPage onBack={() => setProfileView('main')} />;
  }

  // Full-page subnavigation for RTI & Civic Legal Toolkit
  if (profileView === 'rtiToolkit') {
    return <RtiToolkitPage onBack={() => setProfileView('main')} />;
  }

  // Full-page subnavigation for Citizen Charter & SLAs
  if (profileView === 'citizenCharter') {
    return <CitizenCharterPage onBack={() => setProfileView('main')} />;
  }

  // Full-page subnavigation for Ward Committee Docket
  if (profileView === 'wardDocket') {
    return <WardDocketPage onBack={() => setProfileView('main')} />;
  }

  return (
    <ScrollView style={styles.profileScrollView} contentContainerStyle={styles.profileScrollContent}>
      {/* 1. LinkedIn-Style Banner Cover */}
      <ProfileBanner bannerThemeId={user.bannerTheme} />

      {/* 2. Overlapping Profile Avatar & Metadata */}
      <ProfileHeader
        user={user}
        onOpenEditProfile={() => setProfileView('editProfile')}
      />

      {/* 3. Sectioned Menu Items with Direct Full-Page Routing */}
      <ProfileMenuList
        onOpenSettings={() => setProfileView('settings')}
        onOpenMyAudits={() => setProfileView('myAudits')}
        onOpenCivicImpact={() => setProfileView('civicImpact')}
        onOpenFavoritePlaces={() => setProfileView('favoritePlaces')}
        onOpenRtiToolkit={() => setProfileView('rtiToolkit')}
        onOpenCitizenCharter={() => setProfileView('citizenCharter')}
        onOpenWardDocket={() => setProfileView('wardDocket')}
        onSignOut={signOut}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 110,
  },
  profileScrollView: {
    flex: 1,
  },
  profileScrollContent: {
    paddingBottom: 110,
  },
});
