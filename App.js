import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { COLORS } from './src/constants/colors';
import { TABS } from './src/constants/tabs';
import { AuthProvider } from './src/context/AuthContext';
import { CurvedBottomBar } from './src/components/navigation/CurvedBottomBar';
import { MediaModal } from './src/components/modals/MediaModal';
import { AuthModal } from './src/components/modals/AuthModal';

import { HomeScreen } from './src/screens/HomeScreen';
import { SectorsScreen } from './src/screens/SectorsScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { GeoMapScreen } from './src/screens/GeoMapScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = Math.min(SCREEN_WIDTH - 24, 420);
const CIRCLE_SIZE = 46;
const EDGE_PAD = 52;
const TAB_SPACING = (BAR_WIDTH - 2 * EDGE_PAD) / (TABS.length - 1);

const getTabCx = (index) => EDGE_PAD + index * TAB_SPACING;

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const initialCx = getTabCx(activeIndex >= 0 ? activeIndex : 2);

  // Animated values for floating circle glide & tab page transition
  const circleTranslateX = useRef(new Animated.Value(initialCx - CIRCLE_SIZE / 2)).current;
  const circleScale = useRef(new Animated.Value(1)).current;
  const pageOpacity = useRef(new Animated.Value(1)).current;
  const pageTranslateY = useRef(new Animated.Value(0)).current;

  const [currentNotchCx, setCurrentNotchCx] = useState(initialCx);

  const handleTabPress = (tabId, index) => {
    if (tabId === activeTab) return;

    const tabIndex = typeof index === 'number' ? index : TABS.findIndex((t) => t.id === tabId);
    const targetCx = getTabCx(tabIndex);
    setCurrentNotchCx(targetCx);
    setActiveTab(tabId);

    pageOpacity.setValue(0);
    pageTranslateY.setValue(8);

    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(circleTranslateX, {
        toValue: targetCx - CIRCLE_SIZE / 2,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(circleScale, {
          toValue: 0.88,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(circleScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'sectors':
        return <SectorsScreen />;
      case 'ledger':
        return <LedgerScreen />;
      case 'home':
        return <HomeScreen />;
      case 'map':
        return <GeoMapScreen />;
      case 'profile':
      default:
        return <ProfileScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Main Page Animated Content */}
      <View style={styles.mainContent}>
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: pageOpacity,
            },
          ]}
        >
          {renderActiveScreen()}
        </Animated.View>
      </View>

      {/* Global Floating Curved Bottom Navigation */}
      <CurvedBottomBar
        barWidth={BAR_WIDTH}
        activeTab={activeTab}
        onTabPress={handleTabPress}
        circleTranslateX={circleTranslateX}
        circleScale={circleScale}
        currentNotchCx={currentNotchCx}
        getTabCx={getTabCx}
      />

      {/* Global Modals */}
      <MediaModal />
      <AuthModal />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  mainContent: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
});
