import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/theme';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.btn} onPress={() => onChange(value - 1)} disabled={value <= min} hitSlop={6}>
        <Ionicons name="remove" size={16} color={value <= min ? colors.textFaint : colors.text} />
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => onChange(value + 1)} disabled={value >= max} hitSlop={6}>
        <Ionicons name="add" size={16} color={value >= max ? colors.textFaint : colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  btn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 24, textAlign: 'center', fontWeight: '800', fontSize: 14 },
});
