import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Text } from '../components/Themed';
import { DarkTheme, DefaultTheme, LinkingOptions, NavigationContainer, NavigationState, useNavigationContainerRef } from '@react-navigation/native';
import { Appearance } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { SERVER_ORIGIN } from '../api/config';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { colors } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useChatStore } from '../store/chatStore';
import { useVehicleStore } from '../store/vehicleStore';
import { useConfigStore } from '../store/configStore';
import { connectChatSocket, disconnectChatSocket } from '../api/socket';
import { ToastHost } from '../components/Toast';
import { MainTabs } from './MainTabs';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { StoreProfileScreen } from '../screens/StoreProfileScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderSuccessScreen } from '../screens/OrderSuccessScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { WriteReviewScreen } from '../screens/WriteReviewScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { GarageScreen } from '../screens/GarageScreen';
import { ChatConversationScreen } from '../screens/ChatConversationScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { AssistantScreen } from '../screens/AssistantScreen';
import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { StoreSetupScreen } from '../screens/seller/StoreSetupScreen';
import { SellerProductsScreen } from '../screens/seller/SellerProductsScreen';
import { ProductFormScreen } from '../screens/seller/ProductFormScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { SellerGateScreen } from '../screens/seller/SellerGateScreen';
import { SellerApplicationScreen } from '../screens/seller/SellerApplicationScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { VerifyEmailScreen } from '../screens/VerifyEmailScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import { BlockedUsersScreen } from '../screens/BlockedUsersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { ChangeEmailScreen } from '../screens/ChangeEmailScreen';
import { ServiceListScreen } from '../screens/services/ServiceListScreen';
import { ServiceDetailScreen } from '../screens/services/ServiceDetailScreen';
import { BookAppointmentScreen } from '../screens/services/BookAppointmentScreen';
import { AppointmentsScreen } from '../screens/services/AppointmentsScreen';
import { SellerServicesScreen } from '../screens/services/SellerServicesScreen';
import { ServiceFormScreen } from '../screens/services/ServiceFormScreen';
import { TermsGate } from '../components/TermsGate';
import { toast } from '../store/toastStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Shared links open straight in the app: autoguide://p/<id> (from the
// share page's "Open in the app" button) and https://…/p/<id> (App Links).
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['autoguide://', SERVER_ORIGIN],
  config: {
    // Links open on top of the main tabs, so "back" always has somewhere to go.
    initialRouteName: 'Main',
    screens: {
      ProductDetail: 'p/:productId',
      StoreProfile: 's/:storeIdOrSlug',
    },
  },
};

// Built at render time so it follows the light/dark switch.
const navThemeFor = (mode: 'light' | 'dark') => {
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  return { ...base, colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accent } };
};

// Keeps per-account state (cart, wishlist, unread chats, live socket) in
// step with whoever is signed in - and wipes it on sign-out.
function SessionSync() {
  const { token, isGuest } = useAuthStore();
  const realtime = useConfigStore((s) => s.realtime);
  useEffect(() => {
    if (!token || isGuest) {
      disconnectChatSocket();
      useCartStore.getState().clear();
      useWishlistStore.getState().clear();
      useChatStore.getState().clear();
      return;
    }
    useCartStore.getState().refresh().catch(() => {});
    useWishlistStore.getState().refresh().catch(() => {});
    useChatStore.getState().refreshUnread().catch(() => {});

    if (!realtime) {
      // No live socket (Vercel): check the unread count once a minute while the
      // app is open, and refresh open inboxes when it changes. Paused in background.
      disconnectChatSocket();
      const tick = () => {
        if (AppState.currentState !== 'active') return;
        const before = useChatStore.getState().unread;
        useChatStore.getState().refreshUnread().then(() => {
          if (useChatStore.getState().unread !== before) useChatStore.getState().bumpInbox();
        }).catch(() => {});
      };
      const timer = setInterval(tick, 60000);
      const sub = AppState.addEventListener('change', (st) => { if (st === 'active') tick(); });
      return () => { clearInterval(timer); sub.remove(); };
    }

    const socket = connectChatSocket(token);
    const onInbox = () => {
      useChatStore.getState().refreshUnread().catch(() => {});
      useChatStore.getState().bumpInbox();
    };
    socket.on('inbox_updated', onInbox);
    return () => {
      socket.off('inbox_updated', onInbox);
    };
  }, [token, isGuest, realtime]);
  return null;
}

// Seller accounts only get the app once an admin approves their store.
// 'unknown' = a seller session saved before approval status existed; we
// fetch the profile before deciding, so approved sellers never see the lock.
function useSellerGate(): 'open' | 'locked' | 'unknown' {
  const { isGuest, user, profile } = useAuthStore();
  const role = profile?.role ?? user?.role;
  const status = profile?.sellerStatus ?? user?.sellerStatus;
  const gate = isGuest || role !== 'SELLER' ? 'open' : status == null ? 'unknown' : status === 'APPROVED' ? 'open' : 'locked';

  // Celebrate the moment an admin approves the store.
  const prev = React.useRef(status);
  useEffect(() => {
    if (prev.current && prev.current !== 'APPROVED' && status === 'APPROVED') toast.success('Your store is approved - welcome aboard!');
    prev.current = status;
  }, [status]);
  return gate;
}

function CheckingAccount() {
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [failed, setFailed] = React.useState(false);
  const check = () => {
    setFailed(false);
    refreshProfile().then((p) => !p && setFailed(true));
  };
  useEffect(check, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.headerBg, gap: 16 }}>
      {failed ? (
        <Text style={{ color: colors.white, fontWeight: '700' }} onPress={check}>
          Couldn’t reach the server. Tap to retry.
        </Text>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </View>
  );
}

export function RootNavigator() {
  const { hydrate, hydrated } = useAuthStore();
  const sellerGate = useSellerGate();
  const { mode, version, hydrated: themeReady } = useThemeStore();
  // Keep the user on the same screen when the theme switches (the tree remounts).
  const navState = React.useRef<NavigationState | undefined>(undefined);
  const navRef = useNavigationContainerRef<RootStackParamList>();

  // An unapproved seller gets a different set of screens (Seller Centre). When
  // that switches - signing in, signing out, getting approved - start the new
  // set from its first screen. Otherwise a screen that exists in both sets
  // (Seller Centre) stays open with nothing behind it.
  const group = sellerGate === 'locked' ? 'gate' : 'app';
  const prevGroup = React.useRef(group);
  useEffect(() => {
    if (prevGroup.current === group) return;
    prevGroup.current = group;
    navState.current = undefined;
    if (navRef.isReady()) navRef.reset({ index: 0, routes: [{ name: group === 'gate' ? 'SellerGate' : 'Main' }] });
  }, [group, navRef]);

  useEffect(() => {
    useThemeStore.getState().hydrate();
    const sub = Appearance.addChangeListener(() => useThemeStore.getState().systemChanged());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    hydrate();
    useVehicleStore.getState().hydrate();
    useConfigStore.getState().load();
  }, []);

  if (hydrated && sellerGate === 'unknown') return <CheckingAccount />;

  if (!hydrated || !themeReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.headerBg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navRef}
      key={`theme-${version}`}
      theme={navThemeFor(mode)}
      linking={navState.current ? { ...linking, getInitialURL: () => null } : linking}
      initialState={navState.current}
      onStateChange={(st) => (navState.current = st)}
    >
      <SessionSync />
      {/* Opens straight into browsing - sign-in is only asked for when needed. */}
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {sellerGate === 'locked' ? (
          <>
            <Stack.Screen name="SellerGate" component={SellerGateScreen} />
            <Stack.Screen name="SellerApplication" component={SellerApplicationScreen} />
          </>
        ) : (
          <>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="StoreProfile" component={StoreProfileScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="Garage" component={GarageScreen} />
        <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
        <Stack.Screen name="StoreSetup" component={StoreSetupScreen} />
        <Stack.Screen name="SellerProducts" component={SellerProductsScreen} />
        <Stack.Screen name="ProductForm" component={ProductFormScreen} />
        <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="SellerGate" component={SellerGateScreen} />
        <Stack.Screen name="SellerApplication" component={SellerApplicationScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
        <Stack.Screen name="ServiceList" component={ServiceListScreen} />
        <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
        <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Appointments" component={AppointmentsScreen} />
        <Stack.Screen name="SellerServices" component={SellerServicesScreen} />
        <Stack.Screen name="ServiceForm" component={ServiceFormScreen} />
          </>
        )}
      </Stack.Navigator>
      <TermsGate />
      <ToastHost />
    </NavigationContainer>
  );
}
