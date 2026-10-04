import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Deep navy fading to the logo's brighter navy — the Genuine Parts.lk header.
export const HEADER_GRADIENT = ['#1C1B54', '#2E2D7C', '#3B3AA0'] as const;

export function GradientHeader({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}
