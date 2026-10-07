import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS } from '../constants/colors';

export const LedgerScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit Ledger</Text>
      <Text style={styles.subtitle}>Cryptographically verified citizen inspection records</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 110,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.charcoal,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
});
