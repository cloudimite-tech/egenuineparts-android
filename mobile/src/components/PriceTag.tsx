import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import { discountPercent, formatPrice } from '../utils/format';
import { toLkr, useConfigStore } from '../store/configStore';

// Shows the price in the seller's currency. For USD listings it adds the
// rupee equivalent buyers will actually pay on delivery.
export function PriceTag({
  price,
  compareAt,
  currency = 'LKR',
  priceLkr,
  size = 'md',
}: {
  price: string | number;
  compareAt?: string | number | null;
  currency?: string;
  priceLkr?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const rate = useConfigStore((s) => s.usdToLkr);
  const off = discountPercent(price, compareAt);
  const lkr = priceLkr ?? toLkr(price, currency, rate);
  return (
    <View>
      <View style={styles.row}>
        <Text style={[styles.price, size === 'sm' && styles.sm, size === 'lg' && styles.lg]}>{formatPrice(price, currency)}</Text>
        {off ? (
          <>
            <Text style={[styles.compare, size === 'lg' && { fontSize: 15 }]}>{formatPrice(compareAt!, currency)}</Text>
            {size === 'lg' ? (
              <View style={styles.offPill}>
                <Text style={styles.offText}>{off}% off</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
      {currency === 'USD' ? (
        <Text style={[styles.lkr, size === 'lg' && styles.lkrLg]}>≈ {formatPrice(lkr, 'LKR')}</Text>
      ) : null}
    </View>
  );
}

// Inline helper for compact places (cart lines, chat header, rails).
export function UsdHint({ amount, currency, style }: { amount: string | number; currency?: string; style?: any }) {
  const rate = useConfigStore((s) => s.usdToLkr);
  if (currency !== 'USD') return null;
  return <Text style={[styles.lkr, style]}>≈ {formatPrice(toLkr(amount, 'USD', rate), 'LKR')}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 },
  price: { fontSize: 17, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  sm: { fontSize: 15 },
  lg: { fontSize: 28, letterSpacing: -0.6 },
  compare: { fontSize: 12, color: colors.textFaint, textDecorationLine: 'line-through' },
  offPill: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'center' },
  offText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  lkr: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 1 },
  lkrLg: { fontSize: 14, marginTop: 2 },
});
