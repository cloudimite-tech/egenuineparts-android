import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/theme';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'soft';

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

const bg: Record<Variant, string> = {
  primary: colors.accent,
  dark: colors.black,
  outline: colors.white,
  ghost: 'transparent',
  soft: colors.accentSoft,
};
const fg: Record<Variant, string> = {
  primary: colors.white,
  dark: colors.white,
  outline: colors.text,
  ghost: colors.accent,
  soft: colors.accent,
};

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, style }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: bg[variant] },
        variant === 'outline' && styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg[variant]} /> : null}
          <Text style={[styles.text, size === 'sm' && styles.textSm, { color: fg[variant] }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  outline: { borderWidth: 1.5, borderColor: colors.navy },
  disabled: { opacity: 0.45 },
  text: { fontSize: 16, fontWeight: '700' },
  textSm: { fontSize: 14 },
});
