import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

// Gentle up-and-down "hover" loop. `delay` offsets items so they don't bob in sync.
export function Floating({
  children,
  distance = 6,
  duration = 1600,
  delay = 0,
  rotate = 0,
  style,
}: {
  children: React.ReactNode;
  distance?: number;
  duration?: number;
  delay?: number;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, -distance] });
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: [`${-rotate}deg`, `${rotate}deg`] });
  return <Animated.View style={[style, { transform: [{ translateY }, { rotate: rot }] }]}>{children}</Animated.View>;
}

// Heartbeat pulse for badges and the ⚡ icon.
export function Pulse({ children, scale = 1.15, duration = 700, style }: { children: React.ReactNode; scale?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const s = v.interpolate({ inputRange: [0, 1], outputRange: [1, scale] });
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>;
}

// A diagonal band of light that sweeps across its parent every few seconds.
export function Shine({ width, height }: { width: number; height: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.2] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -height,
        width: 60,
        height: height * 3,
        backgroundColor: 'rgba(255,255,255,0.16)',
        transform: [{ translateX }, { rotate: '20deg' }],
      }}
    />
  );
}
