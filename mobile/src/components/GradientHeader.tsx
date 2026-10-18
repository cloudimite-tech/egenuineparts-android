import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../theme/theme';

// Near-black fading to the logo charcoal — the AutoGuide header.

export function GradientHeader({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <LinearGradient colors={colors.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}
