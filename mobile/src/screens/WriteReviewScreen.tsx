import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { ProductImage } from '../components/ProductImage';
import { StarPicker } from '../components/StarRating';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'WriteReview'>;
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function WriteReviewScreen({ route, navigation }: Props) {
  const { productId, title, imageUrl } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!rating) {
      setError('Tap a star to rate this part.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/products/${productId}/reviews`, { rating, comment: comment.trim() || undefined });
      toast.success('Thanks for your review!');
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Write a review" back />
      <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.product}>
            <ProductImage url={imageUrl} style={{ width: 64, height: 64 }} iconSize={24} />
            <Text style={styles.productTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>
          <Text style={styles.q}>How would you rate it?</Text>
          <StarPicker value={rating} onChange={setRating} />
          <Text style={styles.label}>{LABELS[rating] || ' '}</Text>
          <TextField
            label="Your review"
            optional
            multiline
            placeholder="Did it fit? How’s the quality? Would you buy from this seller again?"
            value={comment}
            onChangeText={setComment}
            maxLength={1000}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Submit review" onPress={submit} loading={saving} />
        </View>
        <Text style={styles.note}>Reviews show your first name and last initial, with a “Verified purchase” badge.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md },
  product: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  productTitle: { flex: 1, fontWeight: '700', fontSize: 15 },
  q: { fontSize: 17, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.md },
  label: { color: colors.star, fontWeight: '800', marginTop: 8, marginBottom: spacing.md, minHeight: 20 },
  error: { color: colors.accent, marginBottom: spacing.sm, fontWeight: '600' },
  note: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
});
