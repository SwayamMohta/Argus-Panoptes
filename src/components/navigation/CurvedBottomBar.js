import React from 'react';
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { TABS } from '../../constants/tabs';
import { COLORS } from '../../constants/colors';

const BAR_HEIGHT = 64;
const RADIUS = 20;
const CIRCLE_SIZE = 46;
const CIRCLE_TOP = -22;
const CRATER_HALF_WIDTH = 36;
const CRATER_DEPTH = 32;

export const CurvedBottomBar = ({
  barWidth,
  activeTab,
  onTabPress,
  circleTranslateX,
  circleScale,
  currentNotchCx,
  getTabCx,
}) => {
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const currentTabObj = TABS[activeIndex >= 0 ? activeIndex : 0];

  const getPath = (cx) => {
    const leftStart = cx - CRATER_HALF_WIDTH;
    const rightEnd = cx + CRATER_HALF_WIDTH;

    return `
      M 0 ${RADIUS}
      A ${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} 0
      L ${Math.max(RADIUS, leftStart)} 0
      C ${cx - 22} 0, ${cx - 18} ${CRATER_DEPTH}, ${cx} ${CRATER_DEPTH}
      C ${cx + 22} ${CRATER_DEPTH}, ${cx + 26} 0, ${Math.min(barWidth - RADIUS, rightEnd)} 0
      L ${barWidth - RADIUS} 0
      A ${RADIUS} ${RADIUS} 0 0 1 ${barWidth} ${RADIUS}
      L ${barWidth} ${BAR_HEIGHT - RADIUS}
      A ${RADIUS} ${RADIUS} 0 0 1 ${barWidth - RADIUS} ${BAR_HEIGHT}
      L ${RADIUS} ${BAR_HEIGHT}
      A ${RADIUS} ${RADIUS} 0 0 1 0 ${BAR_HEIGHT - RADIUS}
      Z
    `;
  };

  return (
    <View style={styles.bottomNavWrapper}>
      <View style={[styles.navContainer, { width: barWidth, height: BAR_HEIGHT }]}>
        {/* SVG Background with Concentric Crater Cutout */}
        <Svg width={barWidth} height={BAR_HEIGHT} style={styles.svgBackground}>
          <Path
            d={getPath(currentNotchCx)}
            fill={COLORS.white}
            stroke={COLORS.border}
            strokeWidth={1}
          />
        </Svg>

        {/* Active Indicator Dot in the crater dip */}
        <View
          style={[
            styles.activeDot,
            { left: currentNotchCx - 3.5, top: CRATER_DEPTH + 12 },
          ]}
        />

        {/* Inactive Tabs Row */}
        <View style={styles.tabsRow}>
          {TABS.map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            const cx = getTabCx(idx);
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  {
                    left: cx - 25,
                    width: 50,
                  },
                ]}
                onPress={() => onTabPress(tab.id, idx)}
                activeOpacity={0.7}
              >
                {!isSelected ? (
                  <Ionicons name={tab.icon} size={24} color={COLORS.subtext} />
                ) : (
                  <View style={styles.emptyPlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Floating Active Button */}
        <Animated.View
          style={[
            styles.floatingCircleWrapper,
            {
              top: CIRCLE_TOP,
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              transform: [
                { translateX: circleTranslateX },
                { scale: circleScale },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.floatingCircle}
            onPress={() => onTabPress(currentTabObj.id, activeIndex)}
            activeOpacity={0.9}
          >
            <Ionicons name={currentTabObj.activeIcon} size={22} color={COLORS.white} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navContainer: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tabsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabButton: {
    position: 'absolute',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlaceholder: {
    width: 24,
    height: 24,
  },
  activeDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.charcoal,
    zIndex: 2,
  },
  floatingCircleWrapper: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
  },
  floatingCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: COLORS.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
