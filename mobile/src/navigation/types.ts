import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  Messages: undefined;
  Cart: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Welcome: undefined;
  Signup: { sell?: boolean } | undefined;
  ProductDetail: { productId: string };
  StoreProfile: { storeIdOrSlug: string };
  Checkout: { cartItemIds?: string[] } | undefined;
  OrderSuccess: { orderId: string };
  Orders: undefined;
  OrderDetail: { orderId: string };
  WriteReview: { productId: string; title: string; imageUrl?: string | null };
  Wishlist: undefined;
  Garage: undefined;
  ChatConversation: { conversationId: string };
  Assistant: undefined;
  // seller center
  SellerDashboard: undefined;
  StoreSetup: { mode: 'create' | 'edit' } | undefined;
  SellerProducts: undefined;
  ProductForm: { productId?: string } | undefined;
  SellerOrders: undefined;
  // seller verification (locked until an admin approves)
  SellerGate: undefined;
  SellerApplication: undefined;
  // account
  EditProfile: undefined;
  // admin
  AdminDashboard: undefined;
  AdminSellerDetail: { id: string };
};
