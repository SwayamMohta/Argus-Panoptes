import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { api } from '../lib/api';
import { adaptProfile } from '../lib/format';
import { uploadAvatar } from '../lib/media';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const LANGUAGE_LABELS = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
};
const LANGUAGE_CODES = Object.fromEntries(
  Object.entries(LANGUAGE_LABELS).map(([code, label]) => [label, code])
);

const DEFAULT_CHANNELS = {
  statusChanges: true,
  upvotesAndComments: true,
  wardAlerts: true,
  emergencyBroadcasts: true,
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const loadProfile = useCallback(async () => {
    // Sequential: the first request lazily creates the profile and preferences.
    const profile = await api.me();
    const prefs = await api.preferences();
    const adapted = adaptProfile(profile);
    setUser(adapted);
    setPreferences(prefs);
    return adapted;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        try {
          await loadProfile();
        } catch {
          if (active) setUser(null);
        }
      }
      if (active) setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_OUT' || !nextSession) {
        setUser(null);
        setPreferences(null);
        return;
      }
      loadProfile().catch(() => {});
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setSession(data.session);
      if (data.session) await loadProfile();
      return data;
    },
    [loadProfile]
  );

  const signUp = useCallback(
    async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // Supabase returns an empty identities list for an already-registered email.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Sign in instead.');
      }
      if (data.session) {
        setSession(data.session);
        await loadProfile();
        return data;
      }
      throw new Error(
        'Account created, but Supabase still requires email confirmation. Disable "Confirm email" in Authentication → Providers → Email, then sign in.'
      );
    },
    [loadProfile]
  );

  const doSignOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPreferences(null);
  }, []);

  const signOut = useCallback(() => {
    const confirm = () => {
      doSignOut().catch(() => {});
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Sign out of Argus Panoptes?')) confirm();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: confirm },
    ]);
  }, [doSignOut]);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    await doSignOut();
  }, [doSignOut]);

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const requireAuth = useCallback(() => {
    if (session) return true;
    openAuthModal('login');
    return false;
  }, [openAuthModal, session]);

  const refreshProfile = useCallback(async () => {
    const adapted = await loadProfile();
    return adapted;
  }, [loadProfile]);

  const updateUserProfile = useCallback(async (fields) => {
    const payload = {
      displayName: fields.name,
      address: fields.address,
      area: fields.area,
      city: fields.city,
      state: fields.state,
      pincode: fields.pincode,
      bannerTheme: fields.bannerTheme,
    };
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    const updated = await api.updateMe(payload);
    const adapted = adaptProfile(updated);
    setUser(adapted);
    return adapted;
  }, []);

  const updateAvatar = useCallback(async (uri) => {
    if (!uri) throw new Error('No photo selected.');
    await uploadAvatar(uri);
    return refreshProfile();
  }, [refreshProfile]);

  const updateAvatarPreset = useCallback(async (preset) => {
    const updated = await api.updateMe({
      avatarType: 'preset',
      avatarIcon: preset.icon,
      avatarIconColor: preset.iconColor,
      avatarBg: preset.bg,
    });
    setUser(adaptProfile(updated));
  }, []);

  const resetAvatar = useCallback(async () => {
    const updated = await api.updateMe({
      avatarType: 'preset',
      avatarIcon: 'user',
      avatarIconColor: '#2A3036',
      avatarBg: '#EDEFF0',
    });
    setUser(adaptProfile(updated));
  }, []);

  const updateBannerTheme = useCallback(async (theme) => {
    const updated = await api.updateMe({ bannerTheme: theme });
    setUser(adaptProfile(updated));
  }, []);

  const savePreferences = useCallback(
    async (fields) => {
      setPreferences((previous) => ({ ...(previous || {}), ...fields }));
      try {
        const updated = await api.updatePreferences(fields);
        setPreferences(updated);
        return updated;
      } catch (error) {
        await refreshProfile().catch(() => {});
        throw error;
      }
    },
    [refreshProfile]
  );

  const value = useMemo(
    () => ({
      session,
      user,
      preferences,
      initializing,
      isLoggedIn: Boolean(session),
      isSupabaseConfigured,
      isAuthModalOpen,
      authMode,
      setAuthMode,
      openAuthModal,
      closeAuthModal,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      requireAuth,
      refreshProfile,
      updateUserProfile,
      updateAvatar,
      updateAvatarPreset,
      resetAvatar,
      updateBannerTheme,
      savePreferences,
      pseudonymousMode: preferences?.pseudonymousMode ?? true,
      setPseudonymousMode: (value) => savePreferences({ pseudonymousMode: value }),
      homeRadiusMasking: preferences?.homeRadiusMasking ?? true,
      setHomeRadiusMasking: (value) => savePreferences({ homeRadiusMasking: value }),
      gpsMaskingRadiusM: preferences?.gpsMaskingRadiusM ?? 500,
      setGpsMaskingRadius: (value) => savePreferences({ gpsMaskingRadiusM: value }),
      showContactOnRTI: preferences?.showContactOnRTI ?? false,
      setShowContactOnRTI: (value) => savePreferences({ showContactOnRTI: value }),
      autoSyncWifi: preferences?.autoSyncWifi ?? true,
      setAutoSyncWifi: (value) => savePreferences({ autoSyncWifi: value }),
      notificationsEnabled: preferences?.notificationsEnabled ?? true,
      setNotificationsEnabled: (value) => savePreferences({ notificationsEnabled: value }),
      notificationChannels: preferences?.notificationChannels ?? DEFAULT_CHANNELS,
      setNotificationChannels: (value) => savePreferences({ notificationChannels: value }),
      themeMode: preferences?.themeMode ?? 'system',
      setThemeMode: (value) => savePreferences({ themeMode: value }),
      isAppLockEnabled: preferences?.isAppLockEnabled ?? false,
      setIsAppLockEnabled: (value) => savePreferences({ isAppLockEnabled: value }),
      lockTimeout: preferences?.lockTimeout ?? '5m',
      setLockTimeout: (value) => savePreferences({ lockTimeout: value }),
      language: LANGUAGE_LABELS[preferences?.language || 'en'] || 'English',
      setLanguage: (label) => savePreferences({ language: LANGUAGE_CODES[label] || 'en' }),
      autoClearCache: preferences?.autoClearCache ?? true,
      setAutoClearCache: (value) => savePreferences({ autoClearCache: value }),
    }),
    [
      session,
      user,
      preferences,
      initializing,
      isAuthModalOpen,
      authMode,
      openAuthModal,
      closeAuthModal,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      requireAuth,
      refreshProfile,
      updateUserProfile,
      updateAvatar,
      updateAvatarPreset,
      resetAvatar,
      updateBannerTheme,
      savePreferences,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
