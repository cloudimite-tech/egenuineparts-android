// Resets the database and loads demo data. DESTRUCTIVE — wipes real users
// and orders too. To only refresh categories on a live database, use
//   npm run db:categories
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { sql } from 'drizzle-orm';
import { db, queryClient } from './client';
import {
  categories,
  conversations,
  messages,
  orderItems,
  orders,
  sellerDocuments,
  productFitments,
  products,
  reviews,
  stores,
  users,
  vehicles,
  wishlistItems,
} from './schema';
import { CATEGORY_TREE } from './category-tree';

type Fit = [make: string, model: string, from: number, to: number];

async function main() {
  console.log('Resetting and seeding Genuine Parts.lk…');
  await db.execute(sql`TRUNCATE TABLE
    messages, conversations, reviews, wishlist_items, order_items, orders, cart_items,
    product_images, product_fitments, products, categories, vehicles, stores, seller_documents, users
    RESTART IDENTITY CASCADE`);

  const passwordHash = await bcrypt.hash('password123', 10);
  type Addr = [line1: string, city: string, district: string];
  const user = async (fullName: string, email: string, role: 'BUYER' | 'SELLER' | 'ADMIN', phone: string | null, addr?: Addr) =>
    (await db.insert(users).values({
      fullName, email, phone, passwordHash, role,
      addressLine1: addr?.[0], city: addr?.[1], district: addr?.[2],
    }).returning())[0];

  // ---- people ----
  const kasun = await user('Kasun Perera', 'buyer@genuineparts.lk', 'BUYER', '+94771234567', ['42/3 High Level Road', 'Nugegoda', 'Colombo']);
  const rwan = await user('Rwan Silva', 'rwan@example.lk', 'BUYER', '+94772000001', ['18 Temple Road', 'Maharagama', 'Colombo']);
  const dilani = await user('Dilani Peiris', 'dilani@example.lk', 'BUYER', '+94772000002', ['7 Lake Drive', 'Kandy', 'Kandy']);
  const cahOwner = await user('Colombo Auto Hub', 'seller@genuineparts.lk', 'SELLER', '+94711234567', ['221 Panchikawatta Road', 'Colombo 10', 'Colombo']);
  const kmsOwner = await user('Kandy Motor Spares', 'kandy@genuineparts.lk', 'SELLER', '+94711000002', ['55 Peradeniya Road', 'Kandy', 'Kandy']);
  const llcOwner = await user('Lanka Lube Centre', 'lubecentre@genuineparts.lk', 'SELLER', '+94711000003', ['12 Stanley Thilakaratne Mw', 'Nugegoda', 'Colombo']);
  const admin = await user('Genuine Parts Admin', 'admin@genuineparts.lk', 'ADMIN', null);
  const applicant = await user('Nimal Fernando', 'newseller@genuineparts.lk', 'SELLER', '+94711000004', ['88 Main Street', 'Galle', 'Galle']);

  await db.insert(vehicles).values([
    { userId: kasun.id, make: 'Toyota', model: 'Axio', year: 2016, engine: '1.5 L', chassisCode: 'NZE161', isDefault: true },
    { userId: kasun.id, make: 'Honda', model: 'Vezel', year: 2018, engine: '1.5 L Hybrid', chassisCode: 'RU3' },
  ]);

  // ---- stores ----
  // Sample BR certificate image so the admin review screen has something to show.
  const brImage = async (title: string, br: string) =>
    sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850"><rect width="100%" height="100%" fill="#fffdf5"/>` +
      `<rect x="30" y="30" width="1140" height="790" fill="none" stroke="#2E2D7C" stroke-width="6"/>` +
      `<text x="600" y="150" font-size="44" text-anchor="middle" font-family="serif" fill="#2E2D7C">CERTIFICATE OF REGISTRATION</text>` +
      `<text x="600" y="210" font-size="26" text-anchor="middle" font-family="serif">Business Names Ordinance (SAMPLE — demo data)</text>` +
      `<text x="600" y="380" font-size="40" text-anchor="middle" font-family="serif">${title}</text>` +
      `<text x="600" y="460" font-size="30" text-anchor="middle" font-family="monospace">Reg. No. ${br}</text></svg>`,
    )).jpeg({ quality: 80 }).toBuffer();
  const brDoc = async (ownerId: string, title: string, br: string) => {
    const data = await brImage(title, br);
    return (await db.insert(sellerDocuments).values({ ownerId, kind: 'BR', fileName: 'br-certificate.jpg', mimeType: 'image/jpeg', size: data.length, data }).returning({ id: sellerDocuments.id }))[0].id;
  };
  // Placeholder NIC / selfie images (clearly marked as demo data).
  const card = async (lines: string[], bg: string) =>
    sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="630"><rect width="100%" height="100%" rx="30" fill="${bg}"/>` +
      lines.map((l, i) => `<text x="60" y="${140 + i * 90}" font-size="${i === 0 ? 48 : 38}" font-family="sans-serif" fill="#1C1B54">${l}</text>`).join('') +
      `<text x="60" y="580" font-size="28" font-family="sans-serif" fill="#A81D21">SAMPLE — demo data</text></svg>`,
    )).jpeg({ quality: 80 }).toBuffer();
  const kycDocs = async (ownerId: string, name: string, nic: string, lat: number, lng: number) => {
    const put = async (kind: 'NIC_FRONT' | 'NIC_BACK' | 'SELFIE', data: Buffer, extra = {}) =>
      (await db.insert(sellerDocuments).values({ ownerId, kind, fileName: `${kind.toLowerCase()}.jpg`, mimeType: 'image/jpeg', size: data.length, data, ...extra }).returning({ id: sellerDocuments.id }))[0].id;
    return {
      nicNumber: nic,
      nicFrontDocumentId: await put('NIC_FRONT', await card(['NATIONAL IDENTITY CARD', name, `No. ${nic}`], '#E8F0E3')),
      nicBackDocumentId: await put('NIC_BACK', await card(['NIC — reverse side', 'Address on file'], '#E8F0E3')),
      selfieDocumentId: await put('SELFIE', await card(['Selfie at the shop', name], '#FDECEC'), { capturedLat: lat + 0.0004, capturedLng: lng + 0.0003 }),
      latitude: lat,
      longitude: lng,
    };
  };

  const store = async (ownerId: string, name: string, slug: string, bio: string, shipsFrom: string, returnsPolicy: string, br: string, district: string, nic: string, lat: number, lng: number) =>
    (await db.insert(stores).values({
      ownerId, name, slug, bio, shipsFrom, returnsPolicy, verified: true,
      ...(await kycDocs(ownerId, name, nic, lat, lng)),
      status: 'APPROVED', businessName: `${name} (Pvt) Ltd`, brNumber: br,
      addressLine1: 'Main showroom', city: shipsFrom, district, contactPhone: '+94112000000',
      brDocumentId: await brDoc(ownerId, `${name} (Pvt) Ltd`, br),
      submittedAt: new Date(Date.now() - 30 * 86400000), reviewedAt: new Date(Date.now() - 29 * 86400000), reviewedById: admin.id,
    }).returning())[0];
  const cah = await store(cahOwner.id, 'Colombo Auto Hub', 'colombo-auto-hub',
    'Genuine Toyota, Honda and Nissan parts since 2019.', 'Colombo 10', '7 days, unused parts', 'PV 00123456', 'Colombo', '198512345678', 6.9376, 79.8653);
  const kms = await store(kmsOwner.id, 'Kandy Motor Spares', 'kandy-motor-spares',
    'Brake, suspension, gearbox and engine specialists for Japanese cars.', 'Kandy', '7 days, unused parts', 'KY/BN/2018/4411', 'Kandy', '791234567V', 7.2906, 80.6337);
  const llc = await store(llcOwner.id, 'Lanka Lube Centre', 'lanka-lube-centre',
    'Lubricants, coolants, filters and accessories — Mobil, Castrol, Shell and more.', 'Nugegoda', '3 days, sealed only', 'WCP/2020/1187', 'Colombo', '199023456789', 6.8728, 79.8878);

  // A seller application waiting for the admin, to try the review flow.
  await db.insert(stores).values({
    ownerId: applicant.id, name: 'Galle Auto Parts', slug: 'galle-auto-parts', shipsFrom: 'Galle',
    bio: 'Used and reconditioned parts for Japanese vehicles.', status: 'PENDING',
    businessName: 'Galle Auto Parts', brNumber: 'GL/BN/2026/0091', addressLine1: '88 Main Street', city: 'Galle',
    district: 'Galle', contactPhone: '+94911000004', brDocumentId: await brDoc(applicant.id, 'Galle Auto Parts', 'GL/BN/2026/0091'),
    ...(await kycDocs(applicant.id, 'Nimal Fernando', '880345678V', 6.0329, 80.2168)),
    submittedAt: new Date(Date.now() - 2 * 3600000),
  });

  // ---- categories (shared definition with `npm run db:categories`) ----
  const sub: Record<string, string> = {};
  for (const parent of CATEGORY_TREE) {
    const [p] = await db.insert(categories).values({ name: parent.name, slug: parent.slug, icon: parent.icon }).returning();
    for (const child of parent.children) {
      const [c] = await db.insert(categories).values({ name: child.name, slug: child.slug, icon: parent.icon, parentId: p.id }).returning();
      sub[child.slug] = c.id;
    }
  }

  // ---- products ----
  const AXIO: Fit = ['Toyota', 'Axio', 2012, 2019];
  const FIELDER: Fit = ['Toyota', 'Fielder', 2012, 2019];
  const PREMIO: Fit = ['Toyota', 'Premio', 2007, 2020];
  const AQUA: Fit = ['Toyota', 'Aqua', 2012, 2021];
  const VEZEL: Fit = ['Honda', 'Vezel', 2014, 2021];
  const FIT: Fit = ['Honda', 'Fit', 2013, 2020];
  const WAGONR: Fit = ['Suzuki', 'Wagon R', 2014, 2022];

  const inDays = (d: number) => new Date(Date.now() + d * 86400000);

  const product = async (
    storeId: string, categorySlug: string, brand: string, title: string, price: number,
    opts: { currency?: 'LKR' | 'USD'; compareAt?: number; sale?: [price: number, days: number]; partNumber?: string; stock?: number; warranty?: number; condition?: 'NEW' | 'USED' | 'REFURBISHED'; description?: string; fits?: Fit[] } = {},
  ) => {
    if (!sub[categorySlug]) throw new Error(`Unknown category ${categorySlug}`);
    const [p] = await db.insert(products).values({
      storeId, categoryId: sub[categorySlug], brand, title, currency: opts.currency ?? 'LKR',
      price: String(price), compareAtPrice: opts.compareAt ? String(opts.compareAt) : null,
      salePrice: opts.sale ? String(opts.sale[0]) : null, saleEndsAt: opts.sale ? inDays(opts.sale[1]) : null,
      partNumber: opts.partNumber, stock: opts.stock ?? 12, warrantyMonths: opts.warranty,
      condition: opts.condition ?? 'NEW', description: opts.description,
    }).returning();
    if (opts.fits?.length) {
      await db.insert(productFitments).values(
        opts.fits.map(([make, model, yearFrom, yearTo]) => ({ productId: p.id, make, model, yearFrom, yearTo })),
      );
    }
    return p;
  };

  // Filters
  const airFilter = await product(cah.id, 'air-filters', 'Denso', 'Air Filter, Axio / Fielder', 2850, { partNumber: '17801-21050', stock: 25, fits: [AXIO, FIELDER], sale: [2290, 2.25] });
  await product(llc.id, 'fuel-filters', 'Toyota Genuine', 'Fuel Filter 23300-21010', 3900, { partNumber: '23300-21010', stock: 14, fits: [AXIO, PREMIO] });
  await product(llc.id, 'cabin-filters', 'Bosch', 'Cabin AC Filter, Activated Carbon', 3400, { stock: 18, fits: [AXIO, FIELDER, VEZEL, FIT] });
  const oilFilter = await product(cah.id, 'oil-filters', 'Toyota Genuine', 'Oil Filter 90915-10003', 2900, { partNumber: '90915-10003', stock: 60, fits: [AXIO, FIELDER, PREMIO, AQUA] });
  // Electric parts
  await product(kms.id, 'horn', 'Bosch', 'Twin Tone Disc Horn Set, 12 V', 5600, { compareAt: 6800, stock: 20, warranty: 6 });
  await product(kms.id, 'ignition-coil', 'Denso', 'Ignition Coil 90919-02252', 9800, { partNumber: '90919-02252', stock: 8, warranty: 6, fits: [AXIO, FIELDER, AQUA] });
  const plugs = await product(cah.id, 'spark-plug', 'NGK', 'Iridium Spark Plugs, set of 4', 11200, { partNumber: 'DILKAR6A11', stock: 16, fits: [AXIO, FIELDER, VEZEL], sale: [8990, 1.1] });
  await product(cah.id, 'bulb', 'Philips', 'LED Headlight Bulbs H4, pair', 8900, { compareAt: 10500, stock: 24, warranty: 12 });
  // Brake & suspension
  const pads = await product(cah.id, 'brake-pad', 'Brembo', 'Ceramic Front Brake Pads', 14500, {
    compareAt: 16900, partNumber: 'P 83 152', stock: 14, warranty: 6, fits: [AXIO, FIELDER],
    description: 'Low-dust ceramic compound, quiet operation and OEM-matched pedal feel. Set of 4 for the front axle, anti-squeal shims pre-fitted.',
  });
  await product(cah.id, 'brake-pad', 'Bosch', 'Semi-Metallic Brake Pads', 9800, { partNumber: '0 986 494 431', stock: 20, warranty: 6, fits: [AXIO, AQUA], sale: [7900, 2.25] });
  const dot4 = await product(llc.id, 'brake-fluid', 'Castrol', 'Brake Fluid DOT 4, 1 L', 3200, { stock: 40 });
  await product(kms.id, 'engine-mounts', 'Toyota Genuine', 'Engine Mount, Right Side', 15400, { partNumber: '12305-21260', stock: 4, warranty: 6, fits: [AXIO, FIELDER] });
  await product(kms.id, 'stabilizer-link', '555', 'Front Stabilizer Link, pair', 6400, { partNumber: 'SL-T290', stock: 11, fits: [AXIO, FIELDER, PREMIO] });
  await product(kms.id, 'bush', 'Toyota Genuine', 'Lower Arm Bush Kit', 4800, { stock: 9, fits: [AXIO, FIELDER] });
  await product(kms.id, 'caliper-piston', 'Aisin', 'Front Caliper Piston', 3900, { stock: 6, fits: [AXIO, FIELDER] });
  await product(kms.id, 'caliper-repair-kits', 'Seiken', 'Front Caliper Repair Kit', 2600, { stock: 15, fits: [AXIO, FIELDER, PREMIO] });
  await product(kms.id, 'shock-mount', 'KYB', 'Front Shock Mount with Bearing', 7200, { stock: 7, warranty: 6, fits: [AXIO, FIELDER] });
  const dampers = await product(kms.id, 'dampers', 'KYB', 'Excel-G Rear Dampers, pair', 24500, { compareAt: 27800, partNumber: '343459', stock: 6, warranty: 12, fits: [AXIO, FIELDER] });
  // Gear box
  await product(kms.id, 'clutch-repair-kits', 'Exedy', 'Clutch Master Cylinder Repair Kit', 3200, { stock: 10, fits: [WAGONR] });
  await product(kms.id, 'clutch-plate', 'Exedy', 'Clutch Disc Plate 200 mm', 12800, { stock: 5, warranty: 6, fits: [WAGONR] });
  await product(kms.id, 'pressure-plate', 'Exedy', 'Clutch Pressure Plate 200 mm', 14900, { stock: 3, warranty: 6, fits: [WAGONR] });
  // Accessories
  await product(llc.id, 'air-fresheners', 'Areon', 'Car Air Freshener Gel, Black Crystal', 1450, { stock: 50, sale: [990, 2.25] });
  await product(llc.id, 'wiper-blades', 'Bosch', 'Aerotwin Wiper Blades 26" + 14" (imported)', 23, { currency: 'USD', compareAt: 26.5, stock: 20, fits: [AXIO, FIELDER] });
  await product(cah.id, 'vip-lights', 'Osram', 'LED VIP Interior Lights Kit (imported)', 14, { currency: 'USD', stock: 12 });
  // Lubricants & coolants
  const atf = await product(llc.id, 'gear-box-oil', 'Toyota Genuine', 'ATF WS Gearbox Oil, 4 L', 11500, { stock: 9, fits: [AXIO, PREMIO, AQUA] });
  const mobil = await product(llc.id, 'engine-oil', 'Mobil 1', 'Engine Oil 5W-30 Fully Synthetic, 4 L', 12800, {
    compareAt: 13900, stock: 30, description: 'Fully synthetic 5W-30 for petrol and hybrid engines. API SP / ILSAC GF-6A.',
  });
  await product(llc.id, 'engine-oil', 'Shell', 'Helix HX7 10W-40 Semi-Synthetic, 4 L', 8900, { stock: 22 });
  await product(llc.id, 'coolant', 'Toyota Genuine', 'Super Long Life Coolant, 2 L', 4600, { stock: 15 });
  // Bearings
  await product(kms.id, 'hub-bearings', 'NSK', 'Front Wheel Hub Bearing', 8600, { stock: 8, warranty: 6, fits: [AXIO, FIELDER, AQUA] });
  await product(kms.id, 'clutch-bearings', 'Koyo', 'Clutch Release Bearing', 3400, { stock: 10, fits: [WAGONR] });
  // Engine parts
  await product(kms.id, 'tappet-cover', 'Toyota Genuine', 'Tappet Cover Gasket Set', 2900, { stock: 12, fits: [AXIO, FIELDER, PREMIO] });
  await product(kms.id, 'water-pump', 'Aisin', 'Water Pump with Gasket', 13500, { compareAt: 15200, stock: 5, warranty: 12, fits: [AXIO, FIELDER] });
  await product(kms.id, 'fuel-pump', 'Denso', 'In-Tank Fuel Pump', 16800, { stock: 4, warranty: 6, fits: [AXIO, PREMIO] });
  await product(cah.id, 'tensioner-pulley-adjusters', 'Gates', 'Belt Tensioner Pulley (imported)', 26, { currency: 'USD', stock: 6, fits: [AXIO, FIELDER] });
  // Engine belts
  await product(cah.id, 'alternator-belts', 'Gates', 'Alternator Belt 7PK1515', 3600, { partNumber: '7PK1515', stock: 18, fits: [AXIO, FIELDER] });
  await product(cah.id, 'fan-belts', 'Bando', 'Fan Belt 4PK890', 1900, { stock: 25 });
  await product(cah.id, 'ac-belt', 'Mitsuboshi', 'AC Belt 4PK845', 2200, { stock: 20, fits: [VEZEL, FIT] });

  // ---- orders: one delivered (reviewable), one pending (for seller flow) ----
  type P = typeof pads;
  const makeOrder = async (buyerId: string, lines: { p: P; qty: number; status: 'PENDING' | 'SHIPPED' | 'DELIVERED' }[], status: 'PENDING' | 'SHIPPED' | 'DELIVERED', daysAgo: number) => {
    const subtotal = lines.reduce((s, l) => s + Number(l.p.price) * l.qty, 0);
    const sellers = new Set(lines.map((l) => l.p.storeId)).size;
    const createdAt = new Date(Date.now() - daysAgo * 86400000);
    const [o] = await db.insert(orders).values({
      buyerId, status, subtotal: String(subtotal), deliveryFee: String(sellers * 450), total: String(subtotal + sellers * 450),
      addressLine1: '42 Temple Road', city: 'Nugegoda', district: 'Colombo', contactPhone: '+94771234567', createdAt,
    }).returning();
    await db.insert(orderItems).values(lines.map((l) => ({
      orderId: o.id, productId: l.p.id, storeId: l.p.storeId, quantity: l.qty, unitPrice: l.p.price, fulfillmentStatus: l.status,
    })));
  };
  await makeOrder(kasun.id, [{ p: pads, qty: 1, status: 'DELIVERED' }, { p: oilFilter, qty: 2, status: 'DELIVERED' }], 'DELIVERED', 14);
  await makeOrder(kasun.id, [{ p: airFilter, qty: 1, status: 'PENDING' }, { p: plugs, qty: 1, status: 'PENDING' }], 'PENDING', 1);
  await makeOrder(rwan.id, [{ p: pads, qty: 1, status: 'DELIVERED' }, { p: dampers, qty: 1, status: 'DELIVERED' }], 'DELIVERED', 20);
  await makeOrder(dilani.id, [{ p: mobil, qty: 2, status: 'DELIVERED' }, { p: pads, qty: 1, status: 'DELIVERED' }], 'DELIVERED', 30);

  // ---- reviews (Kasun's pads are left unreviewed so you can try it) ----
  await db.insert(reviews).values([
    { productId: pads.id, userId: rwan.id, rating: 5, comment: 'Perfect fit on my 2016 Axio. No squeal, much less dust than the pads it came with. Seller packed them well.' },
    { productId: pads.id, userId: dilani.id, rating: 4, comment: 'Good braking feel after bedding in. Took a star off because delivery took five days.' },
    { productId: dampers.id, userId: rwan.id, rating: 5, comment: 'Ride is back to factory smooth. Fitted in an hour.' },
    { productId: mobil.id, userId: dilani.id, rating: 5, comment: 'Genuine stock, sealed properly.' },
    { productId: oilFilter.id, userId: rwan.id, rating: 4, comment: 'Genuine part, fair price.' },
  ]);

  await db.insert(wishlistItems).values([
    { userId: kasun.id, productId: dampers.id },
    { userId: kasun.id, productId: atf.id },
    { userId: kasun.id, productId: dot4.id },
  ]);

  // ---- a sample chat about a specific part ----
  const t = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000);
  const [conv] = await db.insert(conversations).values({
    productId: pads.id, buyerId: kasun.id, storeId: cah.id, buyerLastReadAt: t(70), sellerLastReadAt: t(60),
  }).returning();
  await db.insert(messages).values([
    { conversationId: conv.id, senderId: kasun.id, body: 'Hi, will these fit a 2016 Axio hybrid (NKE165)?', createdAt: t(90) },
    { conversationId: conv.id, senderId: cahOwner.id, body: 'Yes, the NKE165 uses the same front caliper. Send your chassis number and we will double-check.', createdAt: t(80) },
    { conversationId: conv.id, senderId: kasun.id, body: 'Chassis is NKE165-7123456. Do they come with the anti-squeal shims?', createdAt: t(70) },
    { conversationId: conv.id, senderId: cahOwner.id, body: 'Confirmed, they fit. Shims are pre-fitted on each pad.', createdAt: t(60) },
  ]);

  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(products);
  console.log(`\nSeeded ${n} products across 3 stores (4 on flash sale, 3 priced in USD).\n`);
  console.log('Accounts (password for all: password123)');
  console.log('  Buyer   buyer@genuineparts.lk       Kasun — has orders, a chat, a garage');
  console.log('  Seller  seller@genuineparts.lk      Colombo Auto Hub — has a pending order to ship');
  console.log('  Seller  kandy@genuineparts.lk       Kandy Motor Spares');
  console.log('  Seller  lubecentre@genuineparts.lk  Lanka Lube Centre');
  console.log('  Seller  newseller@genuineparts.lk   Galle Auto Parts — application PENDING admin review');
  console.log('  Admin   admin@genuineparts.lk       approves / rejects seller applications');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await queryClient.end();
  });
