import React, { createContext, forwardRef, useContext } from 'react';
import { Text as RNText, TextInput as RNTextInput, TextInputProps, TextProps } from 'react-native';
import { colors, themeMode } from '../theme/theme';

// React Native draws un-styled text black, which disappears in dark mode.
// These drop-in replacements give text the theme colour by default. Nested
// <Text> still inherits from its parent (e.g. white text inside a red banner).
const InsideText = createContext(false);

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  const nested = useContext(InsideText);
  if (nested) return <RNText ref={ref} {...props} />;
  return (
    <InsideText.Provider value={true}>
      <RNText ref={ref} {...props} style={[{ color: colors.text }, props.style]} />
    </InsideText.Provider>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={colors.textFaint}
      selectionColor={colors.accent}
      keyboardAppearance={themeMode === 'dark' ? 'dark' : 'light'}
      {...props}
      style={[{ color: colors.text }, props.style]}
    />
  );
});
