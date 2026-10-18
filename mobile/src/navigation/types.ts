import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Products: undefined;
  Services: { type?: string } | undefined;
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
  Messages: undefined;
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
  // services
  ServiceList: { type?: string; typeName?: string; q?: string; store?: string; storeName?: string } | undefined;
  ServiceDetail: { serviceId: string };
  BookAppointment: { serviceId: string };
  Appointments: { as?: 'buyer' | 'seller' } | undefined;
  SellerServices: undefined;
  ServiceForm: { serviceId?: string } | undefined;
  // account
  EditProfile: undefined;
  // account security
  VerifyEmail: { email: string; sent?: boolean };
  ForgotPassword: { email?: string } | undefined;
  DeleteAccount: undefined;
  BlockedUsers: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  ChangeEmail: undefined;
};
