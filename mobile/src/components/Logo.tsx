import React from 'react';
import { colors, themed, themeMode } from '../theme/theme';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Themed';

const WORDMARK = require('../../assets/brand/logo-wordmark.png');
const WORDMARK_LIGHT = require('../../assets/brand/logo-wordmark-light.png');
const RATIO = 2249 / 341; // wordmark width / height

// The AutoGuide logo (mark + wordmark). On dark backgrounds pass `onDark`
// for the white-lettered version.
export function Logo({ height = 34, onDark, tagline }: { height?: number; onDark?: boolean; tagline?: string }) {
  // On a light surface use the dark lettering — unless the whole app is dark.
  const light = onDark ?? themeMode === 'dark';
  return (
    <View>
      <Image
        source={light ? WORDMARK_LIGHT : WORDMARK}
        style={{ height, width: height * RATIO }}
        resizeMode="contain"
        accessibilityLabel="AutoGuide"
      />
      {tagline ? <Text style={[styles.tagline, light && { color: '#D6D3D3' }]}>{tagline}</Text> : null}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  tagline: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 6 },
}));
