import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthModal = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authMode,
    setAuthMode,
    isSupabaseConfigured,
    signIn,
    signUp,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isRegister = authMode === 'register';

  const reset = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    closeAuthModal();
  };

  const handleSubmit = async () => {
    if (!EMAIL.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (isRegister) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      reset();
      closeAuthModal();
    } catch (requestError) {
      setError(requestError.message || 'Could not sign in. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={isAuthModalOpen} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.authModalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeading}>
              {isRegister ? 'Create Account' : 'Citizen Sign In'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={COLORS.charcoal} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, !isRegister && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('login');
                setError('');
              }}
            >
              <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, isRegister && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('register');
                setError('');
              }}
            >
              <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>
            {isRegister
              ? 'Use your email and a password. New accounts are created immediately.'
              : 'Sign in with the email and password you registered.'}
          </Text>

          {!isSupabaseConfigured && (
            <Text style={styles.errorText}>
              Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and
              EXPO_PUBLIC_SUPABASE_ANON_KEY.
            </Text>
          )}

          <TextInput
            style={styles.authInput}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.muted}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.authInput}
            placeholder="Password (6+ characters)"
            placeholderTextColor={COLORS.muted}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
            }}
            secureTextEntry
            autoCapitalize="none"
          />
          {isRegister && (
            <TextInput
              style={styles.authInput}
              placeholder="Confirm password"
              placeholderTextColor={COLORS.muted}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setError('');
              }}
              secureTextEntry
              autoCapitalize="none"
            />
          )}

          <TouchableOpacity
            style={[styles.authSubmitBtn, busy && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={busy || !isSupabaseConfigured}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.authSubmitBtnText}>
                {isRegister ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  tabTextActive: {
    color: COLORS.charcoal,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 14,
    lineHeight: 18,
  },
  authInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.charcoal,
    marginBottom: 12,
  },
  authSubmitBtn: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  authSubmitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    color: '#B42318',
    lineHeight: 17,
  },
});
