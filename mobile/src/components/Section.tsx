import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

export function Section({
  title,
  action,
  onAction,
  children,
  style,
  flush,
}: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  flush?: boolean;
}) {
  return (
    <View style={[styles.card, flush && { padding: 0 }, style]}>
      {title ? (
        <View style={[styles.head, flush && { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
          <Text style={styles.title}>{title}</Text>
          {action && onAction ? (
            <TouchableOpacity onPress={onAction} hitSlop={8}>
              <Text style={styles.action}>{action}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm + 2 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  action: { color: colors.accent, fontWeight: '700', fontSize: 14 },
});
