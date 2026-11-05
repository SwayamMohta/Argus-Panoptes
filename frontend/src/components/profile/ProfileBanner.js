import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CivicSaluteBannerSvg } from './CivicSaluteBannerSvg';

export const ProfileBanner = ({ bannerThemeId, isGuest = false }) => {
  return (
    <View style={styles.bannerContainer}>
      <CivicSaluteBannerSvg width="100%" height="100%" />
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#D9EEF2',
  },
});
