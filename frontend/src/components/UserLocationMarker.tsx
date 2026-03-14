import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const DOT_SIZE = 14;
const RING_SIZE = 28;

export default function UserLocationMarker() {
  const { colors } = useTheme();

  // Inner pulse ring
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.35);

  // Outer area ring — starts mid-cycle so it staggers naturally
  const areaScale = useSharedValue(1.2);
  const areaOpacity = useSharedValue(0.2);

  useEffect(() => {
    // Inner pulse — fast, tight
    ringScale.value = withRepeat(
      withTiming(1.7, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );

    // Outer area ring — slower, wider, more transparent
    areaScale.value = withRepeat(
      withTiming(2.8, { duration: 2600, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    areaOpacity.value = withRepeat(
      withTiming(0, { duration: 2600, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const areaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: areaScale.value }],
    opacity: areaOpacity.value,
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: RING_SIZE,
          height: RING_SIZE,
          justifyContent: 'center',
          alignItems: 'center',
        },
        areaRing: {
          position: 'absolute',
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: colors.accent,
        },
        ring: {
          position: 'absolute',
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: colors.accent,
        },
        dot: {
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: colors.accent,
          borderWidth: 2.5,
          borderColor: colors.white,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.areaRing, areaStyle]} />
      <Animated.View style={[styles.ring, ringStyle]} />
      <View style={styles.dot} />
    </View>
  );
}
