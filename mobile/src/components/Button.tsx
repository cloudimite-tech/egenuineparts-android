import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, themed } from '../theme/theme';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'soft' | 'onDark';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Read at render time so light/dark theme changes apply.
const bgOf = (v: Variant) =>
  ({ primary: colors.accent, dark: colors.black, outline: colors.surface, ghost: 'transparent', soft: colors.accentSoft, onDark: 'transparent' })[v];
const fgOf = (v: Variant) =>
  ({ primary: '#FFFFFF', dark: '#FFFFFF', outline: colors.text, ghost: colors.accent, soft: colors.accent, onDark: '#FFFFFF' })[v];

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, style }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: bgOf(variant) },
        variant === 'outline' && styles.outline,
        variant === 'onDark' && styles.onDark,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fgOf(variant)} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fgOf(variant)} /> : null}
          <Text style={[styles.text, size === 'sm' && styles.textSm, { color: fgOf(variant) }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  sm: { height: 38, borderRadius: radius.sm, paddingHorizontal: 12 },
  outline: { borderWidth: 1.5, borderColor: colors.link },
  onDark: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
  disabled: { opacity: 0.45 },
  text: { fontSize: 16, fontWeight: '700' },
  textSm: { fontSize: 14 },
}));
