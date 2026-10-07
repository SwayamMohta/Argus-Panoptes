import React, { createContext, useContext, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { DEMO_ACCOUNTS } from '../constants/presets';

const defaultAuthContext = {
  isLoggedIn: true,
  setIsLoggedIn: () => {},
  user: DEMO_ACCOUNTS[0],
  setUser: () => {},
  isMediaModalOpen: false,
  mediaModalTab: 'avatar',
  setMediaModalTab: () => {},
  openMediaModal: () => {},
  closeMediaModal: () => {},
  updateAvatarPreset: () => {},
  updateAvatarUrl: () => {},
  resetAvatar: () => {},
  updateBannerTheme: () => {},
  updateUserProfile: () => {},
  signOut: () => {},
  isAuthModalOpen: false,
  authMode: 'login',
  setAuthMode: () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
  loginWithDemo: () => {},
  registerUser: () => {},
  pseudonymousMode: true,
  setPseudonymousMode: () => {},
  homeRadiusMasking: true,
  setHomeRadiusMasking: () => {},
  showContactOnRTI: false,
  setShowContactOnRTI: () => {},
  autoSyncWifi: true,
  setAutoSyncWifi: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
  themeMode: 'system',
  setThemeMode: () => {},
  nightMode: false,
  setNightMode: () => {},
  isAppLockEnabled: false,
  setIsAppLockEnabled: () => {},
  language: 'English',
  setLanguage: () => {},
};

const AuthContext = createContext(defaultAuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [user, setUser] = useState(DEMO_ACCOUNTS[0]);

  // Auth Modals & Workflow
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Photo & Banner Modals
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModalTab, setMediaModalTab] = useState('avatar'); // 'avatar' | 'banner'

  // Settings & Privacy Controls
  const [pseudonymousMode, setPseudonymousMode] = useState(true);
  const [homeRadiusMasking, setHomeRadiusMasking] = useState(true);
  const [showContactOnRTI, setShowContactOnRTI] = useState(false);
  const [autoSyncWifi, setAutoSyncWifi] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [themeMode, setThemeMode] = useState('system'); // 'system' | 'light' | 'dark'
  const [nightMode, setNightMode] = useState(false);
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [language, setLanguage] = useState('English');

  const signOut = () => {
    const doLogout = () => {
      setIsLoggedIn(false);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to sign out of your citizen auditor account?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of your citizen auditor account?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: doLogout,
          },
        ]
      );
    }
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const loginWithDemo = (demoAccount) => {
    setUser(demoAccount);
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
  };

  const registerUser = (name, ward, contact) => {
    const newAuditorId = Math.floor(1000 + Math.random() * 9000);
    setUser({
      name: name.trim(),
      handle: `Citizen Auditor #${newAuditorId}`,
      ward: ward.trim() || 'Ward 112 • Indiranagar, East Zone',
      email: contact.includes('@') ? contact.trim() : `${name.toLowerCase().replace(/\s+/g, '')}@citizen.org`,
      phone: !contact.includes('@') ? contact.trim() : '+91 98765 00000',
      avatarType: 'preset',
      avatarIcon: 'user',
      avatarIconColor: '#2A3036',
      avatarBg: '#EDEFF0',
      avatarUri: '',
      bannerTheme: 'civicGreen',
      auditsCount: 0,
      resolvedCount: 0,
      score: '100%',
      digiLockerVerified: true,
    });
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
  };

  const openMediaModal = (tab = 'avatar') => {
    setMediaModalTab(tab);
    setIsMediaModalOpen(true);
  };

  const closeMediaModal = () => {
    setIsMediaModalOpen(false);
  };

  const updateAvatarPreset = (preset) => {
    setUser((prev) => ({
      ...prev,
      avatarType: 'preset',
      avatarIcon: preset.icon,
      avatarIconColor: preset.iconColor,
      avatarBg: preset.bg,
      avatarUri: '',
    }));
    closeMediaModal();
  };

  const updateAvatarUrl = (url) => {
    setUser((prev) => ({
      ...prev,
      avatarType: 'image',
      avatarUri: url.trim(),
    }));
    closeMediaModal();
  };

  const resetAvatar = () => {
    setUser((prev) => ({
      ...prev,
      avatarType: 'preset',
      avatarIcon: 'user',
      avatarIconColor: '#2A3036',
      avatarBg: '#EDEFF0',
      avatarUri: '',
    }));
    closeMediaModal();
  };

  const updateBannerTheme = (themeId) => {
    setUser((prev) => ({
      ...prev,
      bannerTheme: themeId,
    }));
    closeMediaModal();
  };

  const updateUserProfile = (updatedFields) => {
    setUser((prev) => ({
      ...prev,
      ...updatedFields,
    }));
    closeMediaModal();
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        user,
        setUser,
        updateUserProfile,
        signOut,
        isAuthModalOpen,
        authMode,
        setAuthMode,
        openAuthModal,
        closeAuthModal,
        loginWithDemo,
        registerUser,
        isMediaModalOpen,
        mediaModalTab,
        setMediaModalTab,
        openMediaModal,
        closeMediaModal,
        updateAvatarPreset,
        updateAvatarUrl,
        resetAvatar,
        updateBannerTheme,
        pseudonymousMode,
        setPseudonymousMode,
        homeRadiusMasking,
        setHomeRadiusMasking,
        showContactOnRTI,
        setShowContactOnRTI,
        autoSyncWifi,
        setAutoSyncWifi,
        notificationsEnabled,
        setNotificationsEnabled,
        themeMode,
        setThemeMode,
        nightMode,
        setNightMode,
        isAppLockEnabled,
        setIsAppLockEnabled,
        language,
        setLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) || defaultAuthContext;
