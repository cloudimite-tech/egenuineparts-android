import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { TextField } from '../components/TextField';
import { DistrictSelect } from '../components/DistrictSelect';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';
import { isValidSlPhone, localPart, normalizePhone } from '../utils/phone';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(localPart(profile?.phone));
  const [addressLine1, setAddressLine1] = useState(profile?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(profile?.addressLine2 ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 2) e.fullName = 'Enter your name.';
    if (!isValidSlPhone(phone)) e.phone = 'Enter a valid Sri Lankan mobile number.';
    if (addressLine1.trim().length < 3) e.addressLine1 = 'Enter your house number and street.';
    if (city.trim().length < 2) e.city = 'Enter your city.';
    if (!district) e.district = 'Choose your district.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await apiClient.patch('/users/me', {
        fullName: fullName.trim(),
        phone: normalizePhone(phone),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        district,
      });
      await refreshProfile();
      toast.success('Details saved');
      navigation.goBack();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="My details & address" subtitle="Used to pre-fill your deliveries." back />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TextField label="Full name" value={fullName} onChangeText={setFullName} error={errors.fullName} />
          <TextField label="Mobile number" prefix="+94" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={errors.phone} />
          <Text style={styles.email}>Email: {profile?.email}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Delivery address</Text>
          <TextField label="Address" placeholder="House no. and street" value={addressLine1} onChangeText={setAddressLine1} error={errors.addressLine1} />
          <TextField label="Apartment, lane or landmark" optional value={addressLine2} onChangeText={setAddressLine2} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="City" value={city} onChangeText={setCity} error={errors.city} />
            </View>
            <View style={{ flex: 1 }}>
              <DistrictSelect value={district} onChange={setDistrict} error={errors.district} />
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <Button title="Save" onPress={save} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 17, fontWeight: '800', marginBottom: spacing.md },
  email: { color: colors.textMuted, fontSize: 13 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
});
