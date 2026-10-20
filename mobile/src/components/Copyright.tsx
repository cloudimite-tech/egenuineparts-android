import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './Themed';
import { colors, spacing, themed } from '../theme/theme';

// Shown at the bottom of the Account screen.
export function Copyright() {
  return (
    <Text style={styles.text}>
      © {new Date().getFullYear()} AutoGuide. All rights reserved.{'\n'}Developed by MonolythCode
    </Text>
  );
}

const styles = themed(() => StyleSheet.create({
  text: { textAlign: 'center', color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: spacing.lg, marginBottom: spacing.sm },
}));
