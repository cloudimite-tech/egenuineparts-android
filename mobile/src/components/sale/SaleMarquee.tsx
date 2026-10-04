import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, spacing } from '../../theme/theme';
import { Highlights, Product } from '../../types';
import { ProductImage } from '../ProductImage';
import { Countdown } from '../Countdown';
import { Pulse } from './motion';
import { discountPercent, formatPrice } from '../../utils/format';

const CARD = 118;
const GAP = 10;
const SPEED = 38; // px per second

const TITLES: Record<Highlights['mode'], { title: string; icon: keyof typeof Ionicons.glyphMap; colors: readonly [string, string, ...string[]] }> = {
  flash: { title: 'Flash Deals', icon: 'flash', colors: ['#E0141C', '#FF6A1F'] },
  deals: { title: 'Hot Deals', icon: 'flame', colors: ['#F24E1E', '#FF9A2E'] },
  top: { title: 'Top Picks', icon: 'trophy-outline', colors: ['#1C1B54', '#3B3AA0'] },
  new: { title: 'New Arrivals', icon: 'sparkles', colors: ['#1C1B54', '#3B3AA0'] },
};

// A ticker of products that glides right → left forever (two copies of the
// row, looped seamlessly). Touch-and-hold pauses it; tap opens the product.
export function SaleMarquee({
  data,
  onOpenProduct,
  onViewAll,
  onExpired,
}: {
  data: Highlights;
  onOpenProduct: (p: Product) => void;
  onViewAll: () => void;
  onExpired: () => void;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const [paused, setPaused] = useState(false);
  const items = data.products.length < 4 ? [...data.products, ...data.products] : data.products;
  const rowWidth = items.length * (CARD + GAP);

  const run = (from: number) => {
    // Continue from the current offset so pausing doesn't jump.
    x.setValue(from);
    const remaining = rowWidth + from; // from is ≤ 0
    anim.current = Animated.sequence([
      Animated.timing(x, { toValue: -rowWidth, duration: (remaining / SPEED) * 1000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]);
    anim.current.start(({ finished }) => {
      if (finished) run(0);
    });
  };

  useEffect(() => {
    run(0);
    return () => anim.current?.stop();
  }, [rowWidth]);

  useEffect(() => {
    if (paused) {
      anim.current?.stop();
    } else {
      x.stopAnimation((v) => run(typeof v === 'number' ? v : 0));
    }
  }, [paused]);

  const meta = TITLES[data.mode];
  const row = (copy: number) =>
    items.map((p, i) => {
      const off = discountPercent(p.price, p.compareAtPrice);
      return (
        <TouchableOpacity key={`${copy}-${p.id}-${i}`} style={styles.card} activeOpacity={0.85} onPress={() => onOpenProduct(p)}>
          <View>
            <ProductImage url={p.images?.[0]?.url} categorySlug={p.category?.slug} style={styles.image} rounded={10} iconSize={34} />
            {off ? (
              <View style={[styles.off, p.onSale && { backgroundColor: '#FF5A1F' }]}>
                {p.onSale ? <Ionicons name="flash" size={10} color={colors.white} /> : null}
                <Text style={styles.offText}>-{off}%</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.price}>{formatPrice(p.price, p.currency)}</Text>
          {off ? <Text style={styles.was}>{formatPrice(p.compareAtPrice!, p.currency)}</Text> : <Text style={styles.name} numberOfLines={1}>{p.brand}</Text>}
          {p.onSale ? (
            <View style={styles.bar}>
              <View style={[styles.fill, { width: `${Math.max(18, Math.min(95, 100 - p.stock * 3))}%` }]} />
              <Text style={styles.barText}>{p.stock <= 5 ? `Only ${p.stock} left` : 'Selling fast'}</Text>
            </View>
          ) : !off && p.soldCount ? (
            <Text style={styles.name}>{p.soldCount} sold</Text>
          ) : null}
        </TouchableOpacity>
      );
    });

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={meta.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.head}>
        <Pulse scale={1.2}>
          <Ionicons name={meta.icon} size={18} color="#FFE14D" />
        </Pulse>
        <Text style={styles.title}>{meta.title}</Text>
        {data.mode === 'flash' && data.endsAt ? <Countdown endsAt={data.endsAt} onEnd={onExpired} /> : null}
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll} hitSlop={8}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* onTouch* fire even when a card handles the tap, so holding anywhere pauses */}
      <View
        style={styles.viewport}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onTouchCancel={() => setPaused(false)}
      >
        <Animated.View style={[styles.track, { transform: [{ translateX: x }] }]}>
          {row(0)}
          {row(1)}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.md, marginTop: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10 },
  title: { color: colors.white, fontSize: 17, fontWeight: '900', fontStyle: 'italic', marginRight: 4 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  viewAllText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  viewport: { overflow: 'hidden', paddingVertical: 12 },
  track: { flexDirection: 'row', paddingLeft: 12 },
  card: { width: CARD, marginRight: GAP },
  image: { width: CARD, height: CARD },
  off: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  offText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  price: { fontSize: 15, fontWeight: '900', color: colors.accent, marginTop: 6 },
  was: { fontSize: 11, color: colors.textFaint, textDecorationLine: 'line-through' },
  name: { fontSize: 11, color: colors.textMuted },
  bar: { height: 16, borderRadius: 8, backgroundColor: '#FFE4D6', marginTop: 6, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FFB08A', borderRadius: 8 },
  barText: { fontSize: 10, fontWeight: '800', color: '#9A3412', paddingHorizontal: 8 },
});
