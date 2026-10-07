import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { DEMO_ACCOUNTS } from '../../constants/presets';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

export const AuthModal = () => {
  const auth = useAuth() || {};
  const {
    isAuthModalOpen = false,
    closeAuthModal = () => {},
    authMode = 'login',
    setAuthMode = () => {},
    loginWithDemo = () => {},
    registerUser = () => {},
    setIsLoggedIn = () => {},
  } = auth;

  const [authStep, setAuthStep] = useState('input'); // 'input' | 'otp'
  const [authInput, setAuthInput] = useState('');
  const [regName, setRegName] = useState('');
  const [regWard, setRegWard] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const handleSendOtp = () => {
    if (authMode === 'login' && !authInput.trim()) {
      alert('Please enter your mobile number or email address.');
      return;
    }
    if (authMode === 'register') {
      if (!regName.trim() || !authInput.trim()) {
        alert('Please enter your full name and contact info.');
        return;
      }
    }
    setAuthStep('otp');
  };

  const handleVerifyOtp = () => {
    if (otpCode.length < 4) {
      alert('Please enter a valid 4-digit code (e.g. 1234).');
      return;
    }

    if (authMode === 'register') {
      registerUser(regName, regWard, authInput);
    } else {
      setIsLoggedIn(true);
      closeAuthModal();
    }
    setAuthStep('input');
    setOtpCode('');
  };

  const handleClose = () => {
    setAuthStep('input');
    setOtpCode('');
    closeAuthModal();
  };

  return (
    <Modal
      visible={isAuthModalOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.authModalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeading}>
              {authStep === 'otp'
                ? 'Verify Security Code'
                : authMode === 'login'
                ? 'Auditor Sign In'
                : 'Register Auditor'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={COLORS.charcoal} />
            </TouchableOpacity>
          </View>

          {authStep !== 'otp' && (
            <View style={styles.modalTabBar}>
              <TouchableOpacity
                style={[styles.modalTabBtn, authMode === 'login' && styles.modalTabBtnActive]}
                onPress={() => setAuthMode('login')}
              >
                <Text
                  style={[
                    styles.modalTabBtnText,
                    authMode === 'login' && styles.modalTabBtnTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, authMode === 'register' && styles.modalTabBtnActive]}
                onPress={() => setAuthMode('register')}
              >
                <Text
                  style={[
                    styles.modalTabBtnText,
                    authMode === 'register' && styles.modalTabBtnTextActive,
                  ]}
                >
                  Register New
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.modalSub}>
            {authStep === 'otp'
              ? `Enter the 4-digit code sent to ${authInput}`
              : authMode === 'login'
              ? 'Enter your registered phone number or email to access your citizen ledger.'
              : 'Create your decentralized auditor ID linked to your municipal ward.'}
          </Text>

          {authStep === 'input' ? (
            <>
              {authMode === 'register' && (
                <>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Full Name (e.g. Ramesh V)"
                    placeholderTextColor={COLORS.muted}
                    value={regName}
                    onChangeText={setRegName}
                  />
                  <TextInput
                    style={styles.authInput}
                    placeholder="Ward & Zone (e.g. Ward 112 Indiranagar)"
                    placeholderTextColor={COLORS.muted}
                    value={regWard}
                    onChangeText={setRegWard}
                  />
                </>
              )}

              <TextInput
                style={styles.authInput}
                placeholder="Mobile (+91 98765 43210) or Email"
                placeholderTextColor={COLORS.muted}
                value={authInput}
                onChangeText={setAuthInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.authSubmitBtn} onPress={handleSendOtp} activeOpacity={0.85}>
                <Text style={styles.authSubmitBtnText}>
                  {authMode === 'login' ? 'Send OTP Code →' : 'Continue to Verification →'}
                </Text>
              </TouchableOpacity>

              {/* Instant Demo Switch within Modal */}
              <View style={styles.modalQuickDemoBlock}>
                <Text style={styles.modalDemoHeading}>Or sign in instantly with test account:</Text>
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
                      <Text style={styles.demoPillText}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <TextInput
                style={[
                  styles.authInput,
                  { letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: '700' },
                ]}
                placeholder="1234"
                placeholderTextColor={COLORS.muted}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity style={styles.authSubmitBtn} onPress={handleVerifyOtp} activeOpacity={0.85}>
                <Text style={styles.authSubmitBtnText}>Confirm & Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAuthStep('input')} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: COLORS.subtext, fontWeight: '600' }}>← Change credentials</Text>
              </TouchableOpacity>
            </>
          )}
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
  modalTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  modalTabBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modalTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  modalTabBtnTextActive: {
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
  authSubmitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  modalQuickDemoBlock: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F2',
  },
  modalDemoHeading: {
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
});
