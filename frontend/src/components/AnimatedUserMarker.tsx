import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import UserLocationMarker from './UserLocationMarker';

interface Props {
  coordinate: [number, number];
}

/**
 * Wraps UserLocationMarker in a MapboxGL.MarkerView and smoothly
 * interpolates between GPS coordinate updates using Animated.ValueXY.
 * Only this small component re-renders at animation frame rate —
 * MapScreen is unaffected.
 */
export default function AnimatedUserMarker({ coordinate }: Props) {
  const animCoord = useRef(
    new Animated.ValueXY({ x: coordinate[0], y: coordinate[1] })
  ).current;

  // displayCoord drives the MarkerView — updated via animation listener
  const [displayCoord, setDisplayCoord] = useState<[number, number]>(coordinate);

  // Wire up the listener once so every frame of the animation updates displayCoord
  useEffect(() => {
    const listenerId = animCoord.addListener(({ x, y }) => {
      setDisplayCoord([x, y]);
    });
    return () => {
      animCoord.removeListener(listenerId);
    };
  }, [animCoord]);

  // Animate to the new coordinate whenever the prop changes.
  // Skip on the very first value (already set via useState initialiser).
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    // Duration slightly under the watcher interval (1 000 ms) so the
    // animation always finishes before the next fix arrives.
    Animated.timing(animCoord, {
      toValue: { x: coordinate[0], y: coordinate[1] },
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinate[0], coordinate[1]]);

  return (
    <MapboxGL.MarkerView
      coordinate={displayCoord}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
      allowOverlapWithPuck
    >
      <UserLocationMarker />
    </MapboxGL.MarkerView>
  );
}
