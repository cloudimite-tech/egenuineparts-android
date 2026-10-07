import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../../theme/theme';
import { Highlights, Product } from '../../types';
import { ProductImage } from '../ProductImage';
import { Countdown } from '../Countdown';
import { Floating, Pulse, Shine } from './motion';
import { discountPercent, formatPrice } from '../../utils/format';

type Grad = readonly [string, string, ...string[]];
type Slide =
  | { key: string; kind: 'intro'; colors: Grad; icon: keyof typeof Ionicons.glyphMap; overline: string; title: string; subtitle: string; endsAt?: string | null; products: Product[] }
  | { key: string; kind: 'product'; colors: Grad; product: Product; tag: string }
  | { key: string; kind: 'promo'; colors: Grad; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle: string; cta: string; target: 'sell' | 'categories' | 'deals' };

const FLASH: Grad = ['#C8101A', '#F0341F', '#FF7A1F'];
const ORANGE: Grad = ['#F24E1E', '#FF8A1F', '#FFB23F'];
const DARK: Grad = ['#1C1B54', '#2E2D7C', '#4846B8'];
const PURPLE: Grad = ['#2E2D7C', '#7A2363', '#D2262B'];

// Tag each product by why it's in the rail, not by the rail's mode —
// a flash rail can be topped up with hot deals and best sellers.
const tagFor = (p: Product) => (p.onSale ? 'FLASH DEAL' : discountPercent(p.price, p.compareAtPrice) ? 'HOT DEAL' : 'BEST SELLER');

const MODE_META: Record<Highlights['mode'], { overline: string; icon: keyof typeof Ionicons.glyphMap; colors: Grad; tag: string }> = {
  flash: { overline: 'LIMITED TIME', icon: 'flash', colors: FLASH, tag: 'FLASH DEAL' },
  deals: { overline: 'TODAY ONLY', icon: 'flame', colors: ORANGE, tag: 'HOT DEAL' },
  top: { overline: 'MOST LOVED', icon: 'trophy-outline', colors: DARK, tag: 'BEST SELLER' },
  new: { overline: 'JUST IN', icon: 'sparkles', colors: DARK, tag: 'NEW' },
};

// Always-on promo slides so the hero is never empty (and adds variety).
const PROMOS: Slide[] = [
  { key: 'promo-cod', kind: 'promo', colors: PURPLE, icon: 'cash-fast', title: 'Cash on delivery, island-wide', subtitle: 'Order today — pay when your parts arrive.', cta: 'Shop deals', target: 'deals' },
  { key: 'promo-sell', kind: 'promo', colors: DARK, icon: 'storefront-outline', title: 'Sell your parts on Genuine Parts.lk', subtitle: 'Verified stores reach buyers island-wide.', cta: 'Become a seller', target: 'sell' },
];

export function SaleHero({
  data,
  onOpenProduct,
  onViewAll,
  onPromo,
  onExpired,
}: {
  data: Highlights | null;
  onOpenProduct: (p: Product) => void;
  onViewAll: () => void;
  onPromo: (target: 'sell' | 'categories' | 'deals') => void;
  onExpired: () => void;
}) {
  const { width: screen } = useWindowDimensions();
  const W = screen - spacing.md * 2;
  const H = 176;
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const pausedUntil = useRef(0);

  const slides = useMemo<Slide[]>(() => {
    if (!data || !data.products.length) return PROMOS;
    const meta = MODE_META[data.mode];
    const out: Slide[] = [
      { key: 'intro', kind: 'intro', colors: meta.colors, icon: meta.icon, overline: meta.overline, title: data.title, subtitle: data.subtitle, endsAt: data.endsAt, products: data.products.slice(0, 3) },
      ...data.products.slice(0, 3).map((p, i): Slide => ({ key: p.id, kind: 'product', colors: p.onSale ? FLASH : i % 2 ? ORANGE : meta.colors, product: p, tag: tagFor(p) })),
    ];
    out.splice(2, 0, PROMOS[0]);
    out.push(PROMOS[1]);
    return out;
  }, [data]);

  // Auto-advance every 3.5 s; a swipe pauses it for a few seconds.
  useEffect(() => {
    setIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setIndex((i) => {
        const next = (i + 1) % slides.length;
        listRef.current?.scrollToOffset({ offset: next * W, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [slides, W]);

  const renderSlide = ({ item }: { item: Slide }) => (
    <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.slide, { width: W, height: H }]}>
      {/* decorative rings */}
      <View style={[styles.ring, { width: H * 1.3, height: H * 1.3, right: -H * 0.35, top: -H * 0.35 }]} />
      <View style={[styles.ring, { width: H * 0.7, height: H * 0.7, right: W * 0.28, bottom: -H * 0.4 }]} />
      <Shine width={W} height={H} />

      {item.kind === 'intro' ? (
        <TouchableOpacity activeOpacity={0.9} style={styles.slideInner} onPress={onViewAll}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>{item.overline}</Text>
            <View style={styles.titleRow}>
              <Pulse>
                <Ionicons name={item.icon} size={26} color="#FFE14D" />
              </Pulse>
              <Text style={styles.bigTitle}>{item.title.toUpperCase()}</Text>
            </View>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            {item.endsAt ? (
              <View style={styles.countRow}>
                <Text style={styles.endsIn}>Ends in</Text>
                <Countdown endsAt={item.endsAt} onEnd={onExpired} />
              </View>
            ) : (
              <View style={styles.cta}>
                <Text style={styles.ctaText}>Shop now</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.black} />
              </View>
            )}
          </View>
          <View style={styles.stack}>
            {item.products.map((p, i) => (
              <Floating
                key={p.id}
                delay={i * 350}
                rotate={i === 1 ? 3 : -3}
                distance={5 + i}
                style={[styles.stackItem, { right: i * 30, top: i === 1 ? 4 : 28 + i * 8, zIndex: 3 - i }]}
              >
                <View style={styles.thumbCard}>
                  <ProductImage url={p.images?.[0]?.url} categorySlug={p.category?.slug} style={{ width: 64, height: 64 }} rounded={10} iconSize={28} />
                  {discountPercent(p.price, p.compareAtPrice) ? (
                    <View style={styles.thumbOff}>
                      <Text style={styles.thumbOffText}>-{discountPercent(p.price, p.compareAtPrice)}%</Text>
                    </View>
                  ) : null}
                </View>
              </Floating>
            ))}
          </View>
        </TouchableOpacity>
      ) : item.kind === 'product' ? (
        <TouchableOpacity activeOpacity={0.9} style={styles.slideInner} onPress={() => onOpenProduct(item.product)}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.tag}>
              <Ionicons name="flash" size={11} color={colors.accent} />
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.product.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.bigPrice}>{formatPrice(item.product.price, item.product.currency)}</Text>
              {discountPercent(item.product.price, item.product.compareAtPrice) ? (
                <Text style={styles.was}>{formatPrice(item.product.compareAtPrice!, item.product.currency)}</Text>
              ) : null}
            </View>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>Grab it</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.black} />
            </View>
          </View>
          <Floating distance={7} rotate={2}>
            <View style={styles.heroImageCard}>
              <ProductImage url={item.product.images?.[0]?.url} categorySlug={item.product.category?.slug} style={{ width: 118, height: 118 }} rounded={14} iconSize={52} />
            </View>
            {discountPercent(item.product.price, item.product.compareAtPrice) ? (
              <Pulse style={styles.burst} scale={1.1}>
                <Text style={styles.burstPct}>-{discountPercent(item.product.price, item.product.compareAtPrice)}%</Text>
                <Text style={styles.burstOff}>OFF</Text>
              </Pulse>
            ) : null}
          </Floating>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity activeOpacity={0.9} style={styles.slideInner} onPress={() => onPromo(item.target)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{item.cta}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.black} />
            </View>
          </View>
          <Floating distance={6}>
            <View style={styles.promoIcon}>
              <MaterialCommunityIcons name={item.icon} size={54} color={colors.white} />
            </View>
          </Floating>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );

  return (
    <View style={{ marginHorizontal: spacing.md, marginTop: spacing.sm }}>
      <View style={[styles.frame, { width: W, height: H }]}>
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderSlide}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          onScrollBeginDrag={() => (pausedUntil.current = Date.now() + 6000)}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        />
      </View>
      <View style={styles.dots}>
        {slides.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg, overflow: 'hidden' },
  slide: { overflow: 'hidden' },
  slideInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.md + 2 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 18, borderColor: 'rgba(255,255,255,0.07)' },
  overline: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bigTitle: { color: colors.white, fontSize: 26, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  endsIn: { color: colors.white, fontSize: 12, fontWeight: '800' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFE14D',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 12,
  },
  ctaText: { color: colors.black, fontWeight: '900', fontSize: 13 },
  stack: { width: 128, height: 130 },
  stackItem: { position: 'absolute' },
  thumbCard: { backgroundColor: colors.white, borderRadius: 14, padding: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  thumbOff: { position: 'absolute', bottom: -6, left: -6, backgroundColor: '#FFE14D', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  thumbOffText: { fontSize: 10, fontWeight: '900', color: colors.black },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  productTitle: { color: colors.white, fontSize: 17, fontWeight: '900', marginTop: 6, lineHeight: 21 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  bigPrice: { color: '#FFE14D', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  was: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textDecorationLine: 'line-through', fontWeight: '600' },
  heroImageCard: { backgroundColor: colors.white, borderRadius: 18, padding: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  burst: {
    position: 'absolute',
    top: -12,
    right: -10,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFE14D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  burstPct: { fontSize: 15, fontWeight: '900', color: colors.accent, lineHeight: 17 },
  burstOff: { fontSize: 9, fontWeight: '900', color: colors.black },
  promoTitle: { color: colors.white, fontSize: 20, fontWeight: '900', lineHeight: 24 },
  promoIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4D4D8' },
  dotActive: { width: 18, backgroundColor: colors.accent },
});

