import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const WORDMARK = require('../../assets/brand/logo-wordmark.png');
const RATIO = 1400 / 324; // wordmark width / height

// The Genuine Parts.lk logo. On dark backgrounds pass `onDark` to sit it on
// a white pill so the navy lettering stays readable.
export function Logo({ height = 34, onDark, tagline }: { height?: number; onDark?: boolean; tagline?: string }) {
  const img = <Image source={WORDMARK} style={{ height, width: height * RATIO }} resizeMode="contain" accessibilityLabel="Genuine Parts.lk" />;
  return (
    <View>
      {onDark ? <View style={styles.pill}>{img}</View> : img}
      {tagline ? <Text style={[styles.tagline, onDark && { color: '#C7C7E8' }]}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  tagline: { color: '#6B6B73', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 6 },
});
