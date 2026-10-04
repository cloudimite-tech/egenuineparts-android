export type Role = 'BUYER' | 'SELLER' | 'ADMIN' | 'GUEST';
export type Condition = 'NEW' | 'USED' | 'REFURBISHED';
export type Currency = 'LKR' | 'USD';
export type FulfillmentStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface AuthUser {
  id: string;
  fullName?: string;
  email?: string;
  role: Role;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  createdAt: string;
  store: { id: string; name: string; slug: string; verified: boolean } | null;
  counts: { orders: number; wishlist: number; reviews: number };
}

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

export interface Fitment {
  id?: string;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
}

export interface Store extends StoreSummary {
  bio?: string | null;
  logoUrl?: string | null;
  shipsFrom?: string | null;
  returnsPolicy?: string | null;
  createdAt?: string;
  stats?: { productCount?: number; totalSold?: number; avgRating: string | null; reviewCount: number };
  products?: Product[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  parentId: string | null;
  productCount: number;
  children: Category[];
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  author: string;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId?: string | null;
  brand: string;
  title: string;
  partNumber?: string | null;
  description?: string | null;
  currency?: Currency;
  // Effective price converted to rupees (totals, filters, sorting).
  priceLkr?: number;
  price: string;
  compareAtPrice?: string | null;
  stock: number;
  condition: Condition;
  warrantyMonths?: number | null;
  isActive?: boolean;
  createdAt?: string;
  images: ProductImage[];
  fitments?: Fitment[];
  store?: Store;
  category?: Category | null;
  avgRating?: string | null;
  reviewCount?: number;
  soldCount?: number;
  fitsVehicle?: boolean | null;
  // Sale-aware pricing: `price`/`compareAtPrice` are what to display;
  // the raw fields below are what a seller edits.
  onSale?: boolean;
  saleEndsAt?: string | null;
  regularPrice?: string;
  regularCompareAtPrice?: string | null;
  salePrice?: string | null;
  rawSaleEndsAt?: string | null;
  ratingBreakdown?: Record<number, number>;
  reviews?: Review[];
}

export interface CartItem {
  id: string;
  quantity: number;
  productId: string;
  product: Product;
}

export interface CartResponse {
  items: CartItem[];
  sellerGroups: { store: Store; items: CartItem[]; deliveryFee: number }[];
  subtotal: number;
  deliveryTotal: number;
  total: number;
  usdToLkr?: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  engine?: string | null;
  chassisCode?: string | null;
  isDefault: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  clientId?: string;
  // client-only
  pending?: boolean;
  blockedReason?: string;
}

export interface Conversation {
  id: string;
  productId: string;
  buyerId: string;
  storeId: string;
  createdAt: string;
  product: { id: string; title: string; brand: string; price: string; currency?: Currency; partNumber?: string | null; isActive: boolean; images: ProductImage[] };
  store: StoreSummary;
  buyer: { id: string; fullName: string };
  viewerIsSeller: boolean;
  otherPartyName: string;
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  currency?: Currency;
  exchangeRate?: string;
  unitPriceLkr?: string | null;
  fulfillmentStatus: FulfillmentStatus;
  product: Product;
  store: StoreSummary;
}

export interface Order {
  id: string;
  status: FulfillmentStatus;
  subtotal: string;
  deliveryFee: string;
  total: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  district?: string | null;
  contactPhone?: string | null;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

export interface SellerOrder {
  id: string;
  createdAt: string;
  buyerName: string;
  shipping: { addressLine1: string; addressLine2?: string | null; city: string; district?: string | null; contactPhone?: string | null };
  paymentMethod: string;
  status: FulfillmentStatus;
  subtotal: number;
  items: { id: string; quantity: number; unitPrice: string; currency?: Currency; unitPriceLkr?: string | null; fulfillmentStatus: FulfillmentStatus; product: Product }[];
}

export interface SellerDashboard {
  store: Store;
  stats: { activeProducts: number; lowStock: number; pendingOrders: number; revenue: number; unitsSold: number };
}

export interface Highlights {
  mode: 'flash' | 'deals' | 'top' | 'new';
  title: string;
  subtitle: string;
  endsAt: string | null;
  flashCount?: number;
  products: Product[];
}

export type AssistantActionType = 'open_orders' | 'open_sell' | 'sign_in' | 'open_deals' | 'set_vehicle';
export interface AssistantReply {
  reply: string;
  products?: Product[];
  quickReplies?: string[];
  action?: { type: AssistantActionType; label: string };
}
