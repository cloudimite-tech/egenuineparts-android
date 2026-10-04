import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.star}
        />
      ))}
    </View>
  );
}

export function RatingInline({ rating, count, sold }: { rating?: string | null; count?: number; sold?: number }) {
  if (!rating && !sold) return null;
  return (
    <View style={styles.inline}>
      {rating ? (
        <>
          <Ionicons name="star" size={12} color={colors.star} />
          <Text style={styles.inlineText}>
            {rating}
            {count ? <Text style={styles.muted}> ({count})</Text> : null}
          </Text>
        </>
      ) : null}
      {rating && sold ? <Text style={styles.muted}> · </Text> : null}
      {sold ? <Text style={styles.muted}>{sold} sold</Text> : null}
    </View>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} hitSlop={6}>
          <Ionicons name={value >= i ? 'star' : 'star-outline'} size={36} color={colors.star} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  inlineText: { fontSize: 12, fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
});
