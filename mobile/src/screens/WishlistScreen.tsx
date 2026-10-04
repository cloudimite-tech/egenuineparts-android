import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Product } from '../types';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ProductGridCard } from '../components/ProductGridCard';
import { useWishlistStore } from '../store/wishlistStore';
import { toast } from '../store/toastStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

export function WishlistScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.md * 2 - 12) / 2;
  const toggle = useWishlistStore((s) => s.toggle);
  const [items, setItems] = useState<Product[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      apiClient.get<Product[]>('/wishlist').then((r) => setItems(r.data)).catch(() => setItems([]));
    }, []),
  );

  const remove = async (id: string) => {
    setItems((list) => list?.filter((p) => p.id !== id) ?? null);
    await toggle(id).catch(() => {});
    toast.info('Removed from wishlist');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Wishlist" subtitle={items ? `${items.length} saved part${items.length === 1 ? '' : 's'}` : undefined} back />
      {!items ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="Nothing saved yet"
              message="Tap the heart on any part to keep it here for later."
              actionLabel="Browse parts"
              onAction={() => navigation.navigate('Main', { screen: 'Home' })}
            />
          }
          renderItem={({ item }) => (
            <ProductGridCard
              product={item}
              width={cardWidth}
              saved
              onToggleSave={() => remove(item.id)}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, flexGrow: 1 },
});
