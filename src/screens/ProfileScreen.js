import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ProfileBanner } from '../components/profile/ProfileBanner';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileMenuList } from '../components/profile/ProfileMenuList';
import { GuestProfileScreen } from './GuestProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { EditProfileScreen } from './EditProfileScreen';

export const ProfileScreen = () => {
  const [profileView, setProfileView] = useState('main'); // 'main' | 'settings' | 'editProfile'
  const { isLoggedIn, user, openMediaModal, signOut } = useAuth();

  if (!isLoggedIn) {
    return <GuestProfileScreen />;
  }

  if (profileView === 'settings') {
    return <SettingsScreen onBack={() => setProfileView('main')} />;
  }

  if (profileView === 'editProfile') {
    return <EditProfileScreen onBack={() => setProfileView('main')} />;
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

      {/* 3. Sectioned Menu Items including Settings and Main Page Sign Out */}
      <ProfileMenuList
        onOpenSettings={() => setProfileView('settings')}
        onSignOut={signOut}
      />
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
});
