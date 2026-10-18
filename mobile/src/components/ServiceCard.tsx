import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, themed } from '../theme/theme';
import { ServiceListing } from '../types';
import { ProductImage } from './ProductImage';
import { durationLabel, priceRange, serviceIcon } from '../utils/services';

export function ServiceCard({ service, onPress, right, compact }: { service: ServiceListing; onPress: () => void; right?: React.ReactNode; compact?: boolean }) {
  const place = [service.store.city, service.store.district].filter(Boolean).join(', ');
  const dur = durationLabel(service.durationMinutes);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {service.images[0] ? (
        <ProductImage url={service.images[0]} style={compact ? styles.imgSm : styles.img} rounded={radius.sm} />
      ) : (
        <View style={[compact ? styles.imgSm : styles.img, styles.noImg]}>
          <Ionicons name={serviceIcon(service.type.icon)} size={30} color={colors.accent} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.typePill}>
          <Ionicons name={serviceIcon(service.type.icon)} size={11} color={colors.accent} />
          <Text style={styles.typeText} numberOfLines={1}>{service.type.name}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{service.title}</Text>
        <View style={styles.storeRow}>
          <Text style={styles.store} numberOfLines={1}>{service.store.name}</Text>
          {service.store.verified ? <Ionicons name="checkmark-circle" size={13} color={colors.success} /> : null}
        </View>
        {place ? (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{place}{dur ? ` · ${dur}` : ''}</Text>
          </View>
        ) : null}
        <Text style={styles.price}>{priceRange(service.priceFrom, service.priceTo)}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, ...shadow },
  img: { width: 96, height: 96 },
  imgSm: { width: 70, height: 70 },
  noImg: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, maxWidth: '100%' },
  typeText: { color: colors.accent, fontSize: 10.5, fontWeight: '800' },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 5, lineHeight: 19 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  store: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600', flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { fontSize: 11.5, color: colors.textMuted, flexShrink: 1 },
  price: { fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 6 },
}));
