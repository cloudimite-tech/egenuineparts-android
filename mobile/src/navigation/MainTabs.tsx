import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { colors } from '../theme/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { ServicesScreen } from '../screens/services/ServicesScreen';
import { CartScreen } from '../screens/CartScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { selectCartCount, useCartStore } from '../store/cartStore';
import { useChatStore } from '../store/chatStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Products: ['grid', 'grid-outline'],
  Services: ['construct', 'construct-outline'],
  Cart: ['cart', 'cart-outline'],
  Account: ['person', 'person-outline'],
};

export function MainTabs() {
  const cartCount = useCartStore(selectCartCount);
  const unread = useChatStore((s) => s.unread);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10, fontWeight: '800' },
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? on : off} size={size - 1} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={CategoriesScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarBadge: cartCount > 0 ? cartCount : undefined }} />
      {/* Messages live under Account — the unread count shows on its tab. */}
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarBadge: unread > 0 ? unread : undefined }} />
    </Tab.Navigator>
  );
}
