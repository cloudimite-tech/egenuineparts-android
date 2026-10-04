import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { colors } from '../theme/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { CartScreen } from '../screens/CartScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { selectCartCount, useCartStore } from '../store/cartStore';
import { useChatStore } from '../store/chatStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Categories: ['grid', 'grid-outline'],
  Messages: ['chatbubbles', 'chatbubbles-outline'],
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
        tabBarInactiveTintColor: '#8E8E96',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white },
        tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10, fontWeight: '800' },
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? on : off} size={size - 1} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarBadge: cartCount > 0 ? cartCount : undefined }} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
