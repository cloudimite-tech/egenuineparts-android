import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, themed } from '../theme/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'DeleteAccount'>;

export function DeleteAccountScreen({ navigation }: Props) {
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = () => {
    if (!password) return setError('Enter your password to confirm.');
    Alert.alert('Delete your account?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          setError(null);
          try {
            await deleteAccount(password);
            toast.success('Your account has been deleted');
            navigation.navigate('Main', { screen: 'Home' });
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Delete account" back />
      <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Ionicons name="warning-outline" size={28} color={colors.accent} />
          <Text style={styles.title}>This permanently deletes your account</Text>
          {[
            'Your profile, address, phone number, garage, cart and wishlist are erased.',
            'If you have a store, it’s closed and its listings are removed. Your verification documents are deleted.',
            'Order records are kept with your details removed, for the sellers’ accounting.',
            'Your past messages and reviews remain, shown as “Deleted user”.',
            'Unfinished orders must be delivered or cancelled first.',
          ].map((t) => (
            <View key={t} style={styles.row}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.text}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <TextField label="Your password" secureTextEntry value={password} onChangeText={setPassword} error={error} />
          <Button title="Delete my account" onPress={confirm} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: 6 },
  title: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  bullet: { color: colors.textMuted },
  text: { flex: 1, color: colors.text, lineHeight: 20 },
}));
