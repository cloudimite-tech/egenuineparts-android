import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme/theme';
import { Product } from '../types';
import { ProductImage } from './ProductImage';
import { PriceTag } from './PriceTag';
import { RatingInline } from './StarRating';
import { discountPercent } from '../utils/format';

interface Props {
  product: Product;
  onPress: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
  width: number;
}

export function ProductGridCard({ product, onPress, saved, onToggleSave, width }: Props) {
  const off = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.stock <= 0;
  return (
    <TouchableOpacity style={[styles.card, { width }]} onPress={onPress} activeOpacity={0.85}>
      <View>
        <ProductImage
          url={product.images?.[0]?.url}
          categorySlug={product.category?.slug}
          style={{ width: '100%', aspectRatio: 1 }}
          rounded={0}
          iconSize={44}
        />
        {off ? (
          <View style={[styles.offBadge, product.onSale && styles.saleBadge]}>
            {product.onSale ? <Ionicons name="flash" size={11} color={colors.white} /> : null}
            <Text style={styles.offText}>-{off}%</Text>
          </View>
        ) : null}
        {onToggleSave ? (
          <TouchableOpacity style={styles.heart} onPress={onToggleSave} hitSlop={8}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.accent : colors.text} />
          </TouchableOpacity>
        ) : null}
        {product.fitsVehicle ? (
          <View style={styles.fitsBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.white} />
            <Text style={styles.fitsText}>Fits</Text>
          </View>
        ) : null}
        {outOfStock ? (
          <View style={styles.soldOut}>
            <Text style={styles.soldOutText}>Out of stock</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand}
          {product.condition !== 'NEW' ? <Text style={styles.condition}>  · {product.condition.toLowerCase()}</Text> : null}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <RatingInline rating={product.avgRating} count={product.reviewCount} sold={product.soldCount} />
        <View style={{ marginTop: 6 }}>
          <PriceTag price={product.price} compareAt={product.compareAtPrice} currency={product.currency} priceLkr={product.priceLkr} size="sm" />
        </View>
        {product.store ? (
          <View style={styles.storeRow}>
            <Ionicons name="storefront-outline" size={11} color={colors.textMuted} />
            <Text style={styles.store} numberOfLines={1}>
              {product.store.name}
            </Text>
            {product.store.verified ? <Ionicons name="shield-checkmark" size={11} color={colors.info} /> : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm + 4,
    ...shadow,
  },
  body: { padding: 10, paddingTop: 8 },
  brand: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  condition: { color: colors.warning, textTransform: 'none', fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 2, marginBottom: 4, minHeight: 36, lineHeight: 18 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  store: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
  offBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  saleBadge: { backgroundColor: '#FF5A1F', flexDirection: 'row', alignItems: 'center', gap: 2 },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.success,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fitsText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  soldOut: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: { backgroundColor: colors.navy, color: colors.white, fontWeight: '800', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
});
