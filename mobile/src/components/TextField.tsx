import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/theme';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  optional?: boolean;
}

export function TextField({ label, hint, error, icon, prefix, optional, secureTextEntry, multiline, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {optional ? <Text style={styles.optional}>  optional</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          focused && styles.focused,
          !!error && styles.errorBox,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.textFaint} style={{ marginRight: 8 }} /> : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  optional: { fontWeight: '400', color: colors.textFaint },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 50,
    backgroundColor: colors.white,
  },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: 10 },
  focused: { borderColor: colors.navy },
  errorBox: { borderColor: colors.accent },
  prefix: { fontWeight: '700', color: colors.textMuted, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top', paddingVertical: 0 },
  error: { color: colors.accent, fontSize: 12, marginTop: 6 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
});
