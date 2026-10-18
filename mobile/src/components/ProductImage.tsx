import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveImageUrl } from '../api/config';
import { colors, radius, themed } from '../theme/theme';
import { categoryIconName } from './CategoryIcon';

interface Props {
  url?: string | null;
  categorySlug?: string | null;
  categoryIcon?: string | null;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  rounded?: number;
}

// Falls back to a tidy category glyph when a listing has no photo (or the
// photo fails to load), so grids never show broken-image boxes.
export function ProductImage({ url, categorySlug, categoryIcon, style, iconSize = 36, rounded = radius.sm }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = resolveImageUrl(url);
  return (
    <View style={[styles.box, { borderRadius: rounded }, style]}>
      {uri && !failed ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <MaterialCommunityIcons name={categoryIconName(categorySlug, categoryIcon)} size={iconSize} color={colors.textFaint} />
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  box: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
}));

export { colors };
