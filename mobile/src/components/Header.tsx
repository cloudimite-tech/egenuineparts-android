import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, HEADER_TOP, spacing } from '../theme/theme';
import { GradientHeader } from './GradientHeader';

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  children?: React.ReactNode;
  large?: boolean;
}

// The dark, red-underlined header used across the app (matches the mockups).
export function Header({ title, subtitle, back, right, children, large }: Props) {
  const navigation = useNavigation();
  return (
    <GradientHeader style={styles.wrap}>
      <View style={styles.row}>
        {back ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          {title ? (
            <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </GradientHeader>
  );
}

export function HeaderIconButton({
  icon,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.iconBtn} hitSlop={8}>
      <Ionicons name={icon} size={24} color={colors.white} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.headerBg,
    paddingTop: HEADER_TOP,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  backBtn: { marginLeft: -6, marginRight: 2 },
  title: { color: colors.white, fontSize: 19, fontWeight: '800' },
  titleLarge: { fontSize: 28, letterSpacing: -0.4 },
  subtitle: { color: '#A1A1AA', fontSize: 13, marginTop: 2 },
  iconBtn: { padding: 4 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.headerBg,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
