import React, { useCallback, useEffect, useState } from 'react';
import { shareProduct } from '../utils/share';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, shadow, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Product } from '../types';
import { ProductImage } from '../components/ProductImage';
import { PriceTag } from '../components/PriceTag';
import { Stars } from '../components/StarRating';
import { EmptyState } from '../components/EmptyState';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useVehicleStore, vehicleLabel } from '../store/vehicleStore';
import { toast } from '../store/toastStore';
import { useConfigStore } from '../store/configStore';
import { errorMessage, useRequireAccount } from '../utils/useRequireAccount';
import { discountPercent, initials, timeAgo } from '../utils/format';
import { LinearGradient } from 'expo-linear-gradient';
import { Countdown } from '../components/Countdown';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const requireAccount = useRequireAccount();
  const profile = useAuthStore((s) => s.profile);
  const addItem = useCartStore((s) => s.addItem);
  const { ids: savedIds, toggle } = useWishlistStore();
  const vehicle = useVehicleStore((s) => s.vehicle);
  const usdToLkr = useConfigStore((s) => s.usdToLkr);

  const [product, setProduct] = useState<Product | null>(null);
  const [failed, setFailed] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [busy, setBusy] = useState<null | 'cart' | 'buy' | 'chat'>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    apiClient
      .get<Product>(`/products/${productId}`)
      .then((r) => setProduct(r.data))
      .catch(() => setFailed(true));
  }, [productId]);
  useEffect(load, [load]);

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <BackFab onPress={() => navigation.goBack()} />
        <EmptyState icon="alert-circle-outline" title="Couldn’t load this part" actionLabel="Try again" onAction={load} />
      </View>
    );
  }
  if (!product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isOwnListing = !!profile?.store && profile.store.id === product.storeId;
  const unavailable = product.isActive === false;
  const outOfStock = product.stock <= 0 || unavailable;
  const saved = savedIds.includes(product.id);
  const images = product.images.length ? product.images : [null];
  const fitments = product.fitments ?? [];
  const fit = vehicle && fitments.length
    ? fitments.some(
        (f) =>
          f.make.toLowerCase() === vehicle.make.toLowerCase() &&
          f.model.toLowerCase() === vehicle.model.toLowerCase() &&
          vehicle.year >= f.yearFrom &&
          vehicle.year <= f.yearTo,
      )
    : null;

  const addToCart = (thenBuy: boolean) =>
    requireAccount(async () => {
      setBusy(thenBuy ? 'buy' : 'cart');
      try {
        const cart = await addItem(product.id, 1);
        if (thenBuy) {
          const line = cart.items.find((i) => i.productId === product.id);
          navigation.navigate('Checkout', { cartItemIds: line ? [line.id] : undefined });
        } else {
          toast.success('Added to cart');
        }
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(null);
      }
    }, thenBuy ? 'Sign in to buy this part.' : 'Sign in to add parts to your cart.');

  const openChat = () =>
    requireAccount(async () => {
      setBusy('chat');
      try {
        const { data } = await apiClient.post('/chat/conversations', { productId: product.id });
        navigation.navigate('ChatConversation', { conversationId: data.id });
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(null);
      }
    }, 'Sign in to chat with the seller about this part.');

  const toggleSave = () =>
    requireAccount(async () => {
      try {
        const now = await toggle(product.id);
        toast.success(now ? 'Saved to wishlist' : 'Removed from wishlist');
      } catch (e) {
        toast.error(errorMessage(e));
      }
    }, 'Sign in to save parts to your wishlist.');

  const reviews = product.reviews ?? [];
  const totalReviews = product.reviewCount ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        {/* Gallery */}
        <View>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <ProductImage
                url={item?.url}
                categorySlug={product.category?.slug}
                style={{ width, height: width * 0.86 }}
                rounded={0}
                iconSize={90}
              />
            )}
          />
          <BackFab onPress={() => navigation.goBack()} />
          <TouchableOpacity style={[styles.fab, { right: spacing.md + 52 }]} onPress={() => shareProduct(product)} accessibilityLabel="Share">
            <Ionicons name="share-social-outline" size={21} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fab, { right: spacing.md }]} onPress={toggleSave}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.accent : colors.text} />
          </TouchableOpacity>
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>

        {product.onSale && product.saleEndsAt ? (
          <LinearGradient colors={['#E0141C', '#FF5A1F', '#FF9A2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.flashStrip}>
            <Ionicons name="flash" size={18} color={colors.white} />
            <View style={{ flex: 1 }}>
              <Text style={styles.flashTitle}>Flash Sale · {discountPercent(product.price, product.compareAtPrice)}% off</Text>
              <Text style={styles.flashSub}>Sale price ends soon</Text>
            </View>
            <Countdown endsAt={product.saleEndsAt} onEnd={load} />
          </LinearGradient>
        ) : null}

        {/* Title block */}
        <View style={styles.block}>
          <Text style={styles.brand}>
            {product.brand}
            {product.partNumber ? <Text style={styles.partNo}>  ·  PART NO. {product.partNumber}</Text> : null}
          </Text>
          <Text style={styles.title}>{product.title}</Text>
          <View style={styles.ratingRow}>
            {product.avgRating ? (
              <>
                <Stars value={Number(product.avgRating)} />
                <Text style={styles.ratingText}>
                  {product.avgRating} · {totalReviews} review{totalReviews === 1 ? '' : 's'}
                </Text>
              </>
            ) : (
              <Text style={styles.ratingText}>No reviews yet</Text>
            )}
            {product.soldCount ? <Text style={styles.ratingText}> · {product.soldCount} sold</Text> : null}
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <PriceTag price={product.price} compareAt={product.compareAtPrice} currency={product.currency} priceLkr={product.priceLkr} size="lg" />
          </View>

          {/* Fitment */}
          {vehicle && fit === true ? (
            <View style={[styles.fitBox, { backgroundColor: colors.navy }]}>
              <Ionicons name="checkmark-circle" size={22} color="#4ADE80" />
              <View style={{ flex: 1 }}>
                <Text style={styles.fitTitle}>Fits your {vehicleLabel(vehicle)}</Text>
                <Text style={styles.fitSub}>Confirmed by the seller’s fitment list</Text>
              </View>
            </View>
          ) : vehicle && fit === false ? (
            <View style={[styles.fitBox, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="warning-outline" size={22} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fitTitle, { color: colors.warning }]}>May not fit your {vehicleLabel(vehicle)}</Text>
                <Text style={[styles.fitSub, { color: colors.warning }]}>Chat with the seller to double-check</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Meta
              icon="cube-outline"
              text={
                unavailable
                  ? 'No longer listed'
                  : outOfStock
                    ? 'Out of stock'
                    : product.stock <= 3
                      ? `Only ${product.stock} left`
                      : `In stock · ${product.stock} available`
              }
              tone={outOfStock ? 'bad' : product.stock <= 3 ? 'warn' : 'good'}
            />
            <Meta icon="bicycle" text="Island-wide delivery · Rs. 450 per seller" />
            <Meta
              icon="cash-outline"
              text={
                product.currency === 'USD'
                  ? `Cash on delivery — paid in rupees at 1 USD = Rs. ${usdToLkr}`
                  : 'Cash on delivery available'
              }
            />
          </View>
        </View>

        {/* Store */}
        <TouchableOpacity
          style={styles.storeCard}
          activeOpacity={0.85}
          onPress={() => product.store && navigation.navigate('StoreProfile', { storeIdOrSlug: product.store.slug })}
        >
          <View style={styles.storeAvatar}>
            <Text style={styles.storeAvatarText}>{initials(product.store?.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.storeName}>{product.store?.name}</Text>
              {product.store?.verified ? <Ionicons name="shield-checkmark" size={15} color={colors.info} /> : null}
            </View>
            <Text style={styles.storeMeta}>
              {product.store?.stats?.avgRating ? `★ ${product.store.stats.avgRating} store rating · ` : ''}
              Ships from {product.store?.shipsFrom ?? 'Sri Lanka'}
            </Text>
          </View>
          <Text style={styles.visit}>Visit store</Text>
        </TouchableOpacity>

        {!isOwnListing && !unavailable && (
          <TouchableOpacity style={styles.askCard} onPress={openChat} activeOpacity={0.85}>
            <View style={styles.askIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.askTitle}>Ask about this part</Text>
              <Text style={styles.askSub}>Fitment, stock, warranty — chat privately with the seller in the app.</Text>
            </View>
            {busy === 'chat' ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />}
          </TouchableOpacity>
        )}

        {/* Specs */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <Spec label="Brand" value={product.brand} />
          {product.partNumber ? <Spec label="Part number" value={product.partNumber} /> : null}
          <Spec label="Condition" value={product.condition === 'NEW' ? 'New' : product.condition === 'USED' ? 'Used' : 'Refurbished'} />
          <Spec label="Warranty" value={product.warrantyMonths ? `${product.warrantyMonths} months` : 'No warranty'} />
          {product.category ? <Spec label="Category" value={product.category.name} /> : null}
          {product.store?.returnsPolicy ? <Spec label="Returns" value={product.store.returnsPolicy} /> : null}
        </View>

        {fitments.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Compatible vehicles</Text>
            {fitments.map((f, i) => (
              <View key={f.id ?? i} style={styles.fitRow}>
                <Ionicons name="car-sport-outline" size={18} color={colors.textMuted} />
                <Text style={styles.fitRowText}>
                  {f.make} {f.model}
                </Text>
                <Text style={styles.fitYears}>
                  {f.yearFrom}–{f.yearTo}
                </Text>
              </View>
            ))}
          </View>
        )}

        {product.description ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        ) : null}

        {/* Reviews */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Ratings & reviews</Text>
          {totalReviews === 0 ? (
            <Text style={styles.muted}>No reviews yet. Buyers can review after their order is delivered.</Text>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={{ alignItems: 'center', width: 96 }}>
                  <Text style={styles.bigRating}>{product.avgRating}</Text>
                  <Stars value={Number(product.avgRating)} />
                  <Text style={[styles.muted, { marginTop: 4 }]}>{totalReviews} ratings</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const n = product.ratingBreakdown?.[star] ?? 0;
                    return (
                      <View key={star} style={styles.barRow}>
                        <Text style={styles.barLabel}>{star}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${totalReviews ? (n / totalReviews) * 100 : 0}%` }]} />
                        </View>
                        <Text style={styles.barCount}>{n}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r) => (
                <View key={r.id} style={styles.review}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.reviewAuthor}>{r.author}</Text>
                    <Text style={styles.muted}>{timeAgo(r.createdAt)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Stars value={r.rating} size={13} />
                    <View style={styles.verified}>
                      <Text style={styles.verifiedText}>Verified purchase</Text>
                    </View>
                  </View>
                  {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
                </View>
              ))}
              {reviews.length > 3 && !showAllReviews ? (
                <TouchableOpacity onPress={() => setShowAllReviews(true)} style={{ paddingTop: spacing.sm }}>
                  <Text style={styles.link}>See all {reviews.length} reviews</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actionBar, { paddingBottom: spacing.sm + insets.bottom }]}>
        {isOwnListing ? (
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: colors.navy }]}
            onPress={() => navigation.navigate('ProductForm', { productId: product.id })}
          >
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.primaryText}>Edit your listing</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.iconAction} onPress={openChat} disabled={unavailable}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
              <Text style={styles.iconActionText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, outOfStock && { opacity: 0.4 }]}
              onPress={() => addToCart(false)}
              disabled={outOfStock || !!busy}
            >
              {busy === 'cart' ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryText}>Add to cart</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryAction, outOfStock && { opacity: 0.4 }]}
              onPress={() => addToCart(true)}
              disabled={outOfStock || !!busy}
            >
              {busy === 'buy' ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryText}>{outOfStock ? 'Out of stock' : 'Buy now'}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function BackFab({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.fab, { left: spacing.md }]} onPress={onPress}>
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </TouchableOpacity>
  );
}

function Meta({ icon, text, tone }: { icon: keyof typeof Ionicons.glyphMap; text: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? colors.success : tone === 'warn' ? colors.warning : tone === 'bad' ? colors.accent : colors.textMuted;
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.metaText, tone && { color, fontWeight: '700' }]}>{text}</Text>
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  fab: {
    position: 'absolute',
    top: HEADER_TOP - 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  dotActive: { backgroundColor: colors.accent, width: 18 },
  block: { backgroundColor: colors.white, padding: spacing.md, marginBottom: spacing.sm },
  flashStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 10 },
  flashTitle: { color: colors.white, fontWeight: '900', fontSize: 15, fontStyle: 'italic' },
  flashSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  brand: { color: colors.accent, fontWeight: '800', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  partNo: { color: colors.textMuted, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4, lineHeight: 28 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  ratingText: { color: colors.textMuted, fontSize: 13 },
  fitBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, padding: 14, marginTop: spacing.md },
  fitTitle: { color: colors.white, fontWeight: '800', fontSize: 15 },
  fitSub: { color: '#A1A1AA', fontSize: 12, marginTop: 2 },
  metaRow: { marginTop: spacing.md, gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { color: colors.textMuted, fontSize: 14 },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: 1,
  },
  storeAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  storeAvatarText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  storeName: { fontWeight: '800', fontSize: 16, color: colors.text },
  storeMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  visit: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  askCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  askIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  askTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
  askSub: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  spec: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 16 },
  specLabel: { color: colors.textMuted, fontSize: 14 },
  specValue: { fontWeight: '700', fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.divider },
  fitRowText: { flex: 1, fontWeight: '600', fontSize: 14 },
  fitYears: { color: colors.textMuted, fontWeight: '700' },
  description: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  bigRating: { fontSize: 44, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 10, fontSize: 12, color: colors.textMuted },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.divider, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4, backgroundColor: colors.navy },
  barCount: { width: 22, fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  review: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  reviewAuthor: { fontWeight: '800', fontSize: 14 },
  verified: { backgroundColor: colors.bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  reviewBody: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.text },
  link: { color: colors.accent, fontWeight: '800' },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconAction: { width: 52, alignItems: 'center', justifyContent: 'center' },
  iconActionText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  secondaryAction: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '800', fontSize: 15, color: colors.text },
  primaryAction: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: { fontWeight: '800', fontSize: 15, color: colors.white },
});
