import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  uniqueIndex,
  primaryKey,
  customType,
  doublePrecision,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '../common/id';

const id = () => text('id').primaryKey().$defaultFn(() => createId());

export const userRoleEnum = pgEnum('user_role', ['BUYER', 'SELLER', 'ADMIN']);
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);
export const currencyEnum = pgEnum('currency', ['LKR', 'USD']);
// Seller applications are reviewed by an admin before the store can sell.
export const sellerStatusEnum = pgEnum('seller_status', ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']);
// Verification files a seller uploads with their application.
export const sellerDocKindEnum = pgEnum('seller_doc_kind', ['BR', 'NIC_FRONT', 'NIC_BACK', 'SELFIE']);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const productConditionEnum = pgEnum('product_condition', [
  'NEW',
  'USED',
  'REFURBISHED',
]);

export const users = pgTable('users', {
  id: id(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 32 }).unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('BUYER'),
  // Personal / delivery address (required at sign-up for buyers & sellers).
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  district: varchar('district', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const stores = pgTable('stores', {
  id: id(),
  ownerId: text('owner_id').notNull().unique().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  bio: text('bio'),
  logoUrl: text('logo_url'),
  verified: boolean('verified').notNull().default(false),
  shipsFrom: varchar('ships_from', { length: 255 }),
  returnsPolicy: text('returns_policy'),
  // ---- seller application (reviewed by an admin) ----
  status: sellerStatusEnum('status').notNull().default('PENDING'),
  businessName: varchar('business_name', { length: 255 }),
  brNumber: varchar('br_number', { length: 64 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  district: varchar('district', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 32 }),
  brDocumentId: text('br_document_id'),
  // Owner identity + where the shop actually is (verified by the admin).
  nicNumber: varchar('nic_number', { length: 20 }),
  nicFrontDocumentId: text('nic_front_document_id'),
  nicBackDocumentId: text('nic_back_document_id'),
  selfieDocumentId: text('selfie_document_id'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedById: text('reviewed_by_id'),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Business-registration documents. Kept in the database (not the public
// photo store) and only ever served to admins through short-lived links.
export const sellerDocuments = pgTable('seller_documents', {
  id: id(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  kind: sellerDocKindEnum('kind').notNull().default('BR'),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  data: bytea('data').notNull(),
  // For the shop selfie: where the phone was when it was taken.
  capturedLat: doublePrecision('captured_lat'),
  capturedLng: doublePrecision('captured_lng'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id),
  make: varchar('make', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  year: integer('year').notNull(),
  engine: varchar('engine', { length: 100 }),
  chassisCode: varchar('chassis_code', { length: 100 }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: id(),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  icon: varchar('icon', { length: 50 }),
  parentId: text('parent_id'),
});

export const products = pgTable('products', {
  id: id(),
  storeId: text('store_id').notNull().references(() => stores.id),
  categoryId: text('category_id').references(() => categories.id),
  brand: varchar('brand', { length: 150 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  partNumber: varchar('part_number', { length: 100 }),
  description: text('description'),
  // Seller's chosen currency for this listing. Cash-on-delivery totals are
  // always settled in LKR (see products/pricing.ts for the rate).
  currency: currencyEnum('currency').notNull().default('LKR'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
  stock: integer('stock').notNull().default(0),
  condition: productConditionEnum('condition').notNull().default('NEW'),
  warrantyMonths: integer('warranty_months'),
  // Timed sale ("flash sale"): while sale_ends_at is in the future the
  // effective price is sale_price; afterwards it reverts to price by itself.
  salePrice: numeric('sale_price', { precision: 12, scale: 2 }),
  saleEndsAt: timestamp('sale_ends_at'),
  // Soft delete: products stay referenced by past orders, carts and chats,
  // so "deleting" a listing just hides it from the catalog.
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const productImages = pgTable('product_images', {
  id: id(),
  productId: text('product_id').notNull().references(() => products.id),
  url: text('url').notNull(),
  position: integer('position').notNull().default(0),
});

export const productFitments = pgTable('product_fitments', {
  id: id(),
  productId: text('product_id').notNull().references(() => products.id),
  make: varchar('make', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  yearFrom: integer('year_from').notNull(),
  yearTo: integer('year_to').notNull(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id),
    productId: text('product_id').notNull().references(() => products.id),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userProductUnique: uniqueIndex('cart_user_product_unique').on(t.userId, t.productId),
  }),
);

export const orders = pgTable('orders', {
  id: id(),
  buyerId: text('buyer_id').notNull().references(() => users.id),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  deliveryFee: numeric('delivery_fee', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  addressLine1: varchar('address_line1', { length: 255 }).notNull(),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 32 }),
  paymentMethod: varchar('payment_method', { length: 32 }).notNull().default('COD'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: id(),
  orderId: text('order_id').notNull().references(() => orders.id),
  productId: text('product_id').notNull().references(() => products.id),
  storeId: text('store_id').notNull().references(() => stores.id),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  // Locked in at checkout so later rate changes never alter past orders.
  currency: currencyEnum('currency').notNull().default('LKR'),
  exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 }).notNull().default('1'),
  unitPriceLkr: numeric('unit_price_lkr', { precision: 12, scale: 2 }),
  // One order can span several stores; each store fulfils its own items.
  fulfillmentStatus: orderStatusEnum('fulfillment_status').notNull().default('PENDING'),
});

export const conversations = pgTable(
  'conversations',
  {
    id: id(),
    productId: text('product_id').notNull().references(() => products.id),
    buyerId: text('buyer_id').notNull().references(() => users.id),
    storeId: text('store_id').notNull().references(() => stores.id),
    buyerLastReadAt: timestamp('buyer_last_read_at'),
    sellerLastReadAt: timestamp('seller_last_read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    threadUnique: uniqueIndex('conversation_thread_unique').on(
      t.productId,
      t.buyerId,
      t.storeId,
    ),
  }),
);

export const messages = pgTable('messages', {
  id: id(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  senderId: text('sender_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  wasFiltered: boolean('was_filtered').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reviews = pgTable(
  'reviews',
  {
    id: id(),
    productId: text('product_id').notNull().references(() => products.id),
    userId: text('user_id').notNull().references(() => users.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    oneReviewPerBuyer: uniqueIndex('review_product_user_unique').on(t.productId, t.userId),
  }),
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => users.id),
    productId: text('product_id').notNull().references(() => products.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userProductUnique: uniqueIndex('wishlist_user_product_unique').on(t.userId, t.productId),
  }),
);

// ---- relations (for query-builder joins) ----
export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, { fields: [users.id], references: [stores.ownerId] }),
  vehicles: many(vehicles),
  cartItems: many(cartItems),
  orders: many(orders),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, { fields: [stores.ownerId], references: [users.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  fitments: many(productFitments),
  reviews: many(reviews),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  product: one(products, { fields: [conversations.productId], references: [products.id] }),
  buyer: one(users, { fields: [conversations.buyerId], references: [users.id] }),
  store: one(stores, { fields: [conversations.storeId], references: [stores.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  store: one(stores, { fields: [orderItems.storeId], references: [stores.id] }),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  user: one(users, { fields: [vehicles.userId], references: [users.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productFitmentsRelations = relations(productFitments, ({ one }) => ({
  product: one(products, { fields: [productFitments.productId], references: [products.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'CategoryToCategory',
  }),
  children: many(categories, { relationName: 'CategoryToCategory' }),
  products: many(products),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));
