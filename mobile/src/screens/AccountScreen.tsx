import React, { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../theme/theme';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { GradientHeader } from '../components/GradientHeader';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useVehicleStore, vehicleLabel } from '../store/vehicleStore';
import { initials } from '../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Account'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function AccountScreen({ navigation }: Props) {
  const { isGuest, profile, user, logout, refreshProfile } = useAuthStore();
  const unread = useChatStore((s) => s.unread);
  const vehicle = useVehicleStore((s) => s.vehicle);

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) refreshProfile().catch(() => {});
    }, [isGuest]),
  );

  if (isGuest) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <GradientHeader style={styles.guestHero}>
          <Logo height={34} onDark />
          <Text style={styles.guestTitle}>Your garage, orders and chats in one place</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button title="Sign in" onPress={() => navigation.navigate('Welcome')} />
            <Button title="Create an account" variant="outline" onPress={() => navigation.navigate('Signup')} style={{ backgroundColor: 'transparent', borderColor: '#3F3F46' }} />
          </View>
        </GradientHeader>
        <View style={styles.perks}>
          <Perk icon="car-sport-outline" title="Save your vehicles" text="See instantly which parts fit." />
          <Perk icon="chatbubbles-outline" title="Chat with sellers" text="Ask about any part, privately in the app." />
          <Perk icon="cash-outline" title="Cash on delivery" text="Order island-wide and pay on arrival." />
        </View>
        <TouchableOpacity style={styles.sellCard} onPress={() => navigation.navigate('Signup', { sell: true })} activeOpacity={0.85}>
          <Ionicons name="storefront" size={28} color={colors.white} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sellTitle}>Sell on Genuine Parts.lk</Text>
            <Text style={styles.sellSub}>Open your store free and reach buyers island-wide.</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const confirmLogout = () =>
    Alert.alert('Sign out?', 'You can keep browsing as a guest.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);

  const name = profile?.fullName ?? user?.fullName ?? '';
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <GradientHeader style={styles.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.sub}>{memberSince ? `Member since ${memberSince}` : profile?.email}</Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={profile?.counts.orders ?? 0} label="Orders" onPress={() => navigation.navigate('Orders')} />
          <Stat value={profile?.counts.wishlist ?? 0} label="Wishlist" onPress={() => navigation.navigate('Wishlist')} />
          <Stat value={profile?.counts.reviews ?? 0} label="Reviews" onPress={() => navigation.navigate('Orders')} />
        </View>
      </GradientHeader>

      {profile?.store ? (
        <TouchableOpacity style={[styles.sellCard, { backgroundColor: colors.navy }]} onPress={() => navigation.navigate('SellerDashboard')} activeOpacity={0.85}>
          <View style={styles.storeIcon}>
            <Ionicons name="storefront" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellOverline}>SELLER CENTER</Text>
            <Text style={styles.sellTitle}>{profile.store.name}</Text>
            <Text style={styles.sellSub}>Listings, orders and store settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.sellCard} onPress={() => navigation.navigate('StoreSetup', { mode: 'create' })} activeOpacity={0.85}>
          <Ionicons name="storefront" size={28} color={colors.white} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sellTitle}>Start selling</Text>
            <Text style={styles.sellSub}>Open a free store and list your parts in minutes.</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      )}

      <View style={styles.menu}>
        <MenuItem icon="car-sport-outline" label="My garage" detail={vehicle ? vehicleLabel(vehicle) : undefined} onPress={() => navigation.navigate('Garage')} />
        <MenuItem icon="cube-outline" label="My orders" onPress={() => navigation.navigate('Orders')} />
        <MenuItem icon="heart-outline" label="Wishlist" onPress={() => navigation.navigate('Wishlist')} />
        <MenuItem
          icon="chatbubbles-outline"
          label="Messages"
          badge={unread}
          onPress={() => navigation.navigate('Main', { screen: 'Messages' })}
          last
        />
      </View>

      <View style={styles.menu}>
        <MenuItem icon="help-buoy-outline" label="Ask the assistant" detail="Find parts, track orders" onPress={() => navigation.navigate('Assistant')} />
        <MenuItem icon="shield-checkmark-outline" label="Buyer protection" detail="Chats & payments stay in-app" onPress={() => Alert.alert('Buyer protection', 'Keep conversations and payments inside Genuine Parts.lk. Sellers are verified, and contact details are blocked in chat so every order stays traceable.')} />
        <MenuItem icon="help-circle-outline" label="Help & support" onPress={() => Alert.alert('Help & support', 'Email support@genuineparts.lk and we’ll get back to you within a day.')} last />
      </View>

      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.accent} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
      <Text style={styles.email}>{profile?.email}</Text>
    </ScrollView>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.stat} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuItem({
  icon,
  label,
  detail,
  badge,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  badge?: number;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuItem, !last && styles.menuBorder]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.text} />
      <Text style={styles.menuLabel}>{label}</Text>
      {detail ? <Text style={styles.menuDetail} numberOfLines={1}>{detail}</Text> : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

function Perk({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkIcon}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.perkTitle}>{title}</Text>
        <Text style={styles.perkText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guestHero: {
    backgroundColor: colors.headerBg,
    paddingTop: HEADER_TOP + 8,
    padding: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  logo: { fontSize: 22, fontWeight: '900', fontStyle: 'italic' },
  guestTitle: { color: colors.white, fontSize: 26, fontWeight: '800', marginTop: spacing.md, lineHeight: 32, letterSpacing: -0.3 },
  perks: { backgroundColor: colors.white, margin: spacing.md, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  perk: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  perkIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  perkTitle: { fontWeight: '800', fontSize: 15 },
  perkText: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  hero: {
    backgroundColor: colors.headerBg,
    paddingTop: HEADER_TOP + 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 22 },
  name: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  sub: { color: '#A1A1AA', marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.headerElevated, borderRadius: radius.md, padding: 14 },
  statValue: { color: colors.white, fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#A1A1AA', fontSize: 13, marginTop: 2 },
  sellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  storeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sellOverline: { color: '#A1A1AA', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  sellTitle: { color: colors.white, fontWeight: '900', fontSize: 16 },
  sellSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  menu: { backgroundColor: colors.white, borderRadius: radius.md, marginHorizontal: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  menuDetail: { flex: 1, textAlign: 'right', color: colors.textMuted, fontSize: 13 },
  badge: { marginLeft: 'auto', backgroundColor: colors.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg, padding: spacing.md },
  logoutText: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  email: { textAlign: 'center', color: colors.textFaint, fontSize: 12 },
});
