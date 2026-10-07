import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS } from '../constants/colors';

export const SectorsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Civic Sectors</Text>
      <Text style={styles.subtitle}>Health Centers • PDS Ration Shops • Roads • Public Transit</Text>
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
