export type Role = 'BUYER' | 'SELLER' | 'ADMIN' | 'GUEST';
export type Condition = 'NEW' | 'USED' | 'REFURBISHED';
export type Currency = 'LKR' | 'USD';
export type FulfillmentStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// Seller accounts are locked until an admin approves their application.
export type SellerStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type StoreStatus = Exclude<SellerStatus, 'NOT_SUBMITTED'>;

export interface AuthUser {
  id: string;
  fullName?: string;
  email?: string;
  role: Role;
  sellerStatus?: SellerStatus | null;
}

export interface Address {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  district: string;
  postalCode?: string | null;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  district?: string | null;
  postalCode?: string | null;
  sellerStatus: SellerStatus | null;
  emailVerified?: boolean;
  termsAccepted?: boolean;
  createdAt: string;
  store: { id: string; name: string; slug: string; verified: boolean; status: StoreStatus; reviewNote?: string | null } | null;
  counts: { orders: number; wishlist: number; reviews: number };
}

export interface SellerApplication {
  storeName: string;
  bio?: string | null;
  returnsPolicy?: string | null;
  businessName: string | null;
  brNumber: string | null;
  addressLine1: string | null;
  addressLine2?: string | null;
  city: string | null;
  district: string | null;
  contactPhone: string | null;
  nicNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  document: AppDoc | null;
  nicFront?: AppDoc | null;
  nicBack?: AppDoc | null;
  selfie?: AppDoc | null;
}

export interface AppDoc {
  id: string;
  kind?: 'BR' | 'NIC_FRONT' | 'NIC_BACK' | 'SELFIE';
  fileName: string;
  mimeType: string;
  size: number;
}

export interface AdminDoc extends AppDoc {
  createdAt: string;
  url: string;
}

export interface MyApplication {
  status: SellerStatus;
  reviewNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  application: SellerApplication | null;
}

export interface AdminSellerRow {
  id: string;
  storeName: string;
  businessName: string | null;
  brNumber: string | null;
  city: string | null;
  district: string | null;
  status: StoreStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  ownerName: string;
  ownerEmail: string;
}

export interface AdminSellerDetail {
  id: string;
  status: StoreStatus;
  storeName: string;
  slug: string;
  bio?: string | null;
  returnsPolicy?: string | null;
  businessName: string | null;
  brNumber: string | null;
  addressLine1: string | null;
  addressLine2?: string | null;
  city: string | null;
  district: string | null;
  contactPhone: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  productCount: number;
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    district?: string | null;
    createdAt: string;
  } | null;
  nicNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  document: AdminDoc | null;
  nicFront: AdminDoc | null;
  nicBack: AdminDoc | null;
  selfie: (AdminDoc & { takenAt: string | null; latitude: number | null; longitude: number | null; distanceFromShopM: number | null }) | null;
}

export interface AdminStats {
  sellers: Record<StoreStatus, number>;
  users: { buyers: number; sellers: number; admins: number };
  products: number;
  orders: number;
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
  iBlocked?: boolean; // I blocked the other person
  canReply?: boolean; // false if either side blocked the other
  id: string;
  productId: string | null;
  serviceId?: string | null;
  buyerId: string;
  storeId: string;
  createdAt: string;
  // A chat is about a product or a service listing.
  product: { id: string; title: string; brand: string; price: string; currency?: Currency; partNumber?: string | null; isActive: boolean; images: ProductImage[] } | null;
  service?: { id: string; title: string; priceFrom: number | null; priceTo: number | null; isActive: boolean; images: ProductImage[]; type: { name: string; icon: string | null } } | null;
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
  postalCode?: string | null;
  contactPhone?: string | null;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

export interface SellerOrder {
  id: string;
  createdAt: string;
  buyerId: string;
  buyerName: string;
  shipping: { addressLine1: string; addressLine2?: string | null; city: string; district?: string | null; postalCode?: string | null; contactPhone?: string | null };
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

// ---- services ----
export interface ServiceType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description?: string | null;
  serviceCount?: number;
}

export interface ServiceListing {
  id: string;
  storeId: string;
  typeId: string;
  title: string;
  description: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  durationMinutes: number | null;
  images: string[];
  type: { id: string; name: string; slug: string; icon: string | null };
  store: { id: string; name: string; slug: string; verified: boolean; city: string | null; district: string | null; latitude: number | null; longitude: number | null; logoUrl?: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTypeRequest {
  id: string;
  name: string;
  note: string | null;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  serviceTypeId: string | null;
}

export type AppointmentStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  expired: boolean;
  scheduledAt: string;
  vehicle: string | null;
  note: string | null;
  sellerNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  conversationId: string | null;
  viewerIsSeller: boolean;
  service: { id: string; title: string; type: { name: string; icon: string | null }; image: string | null; priceFrom: number | null; priceTo: number | null; durationMinutes: number | null };
  store: { id: string; name: string; slug: string; city: string | null; district: string | null; latitude: number | null; longitude: number | null; address: string | null };
  buyer: { id: string; fullName: string };
}
