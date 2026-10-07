# e-Genuine Parts

A mobile marketplace for vehicle spare parts in Sri Lanka — like Daraz/AliExpress,
but only auto parts. Verified stores sell, buyers browse by vehicle fitment, and
every buyer ↔ seller conversation happens inside the app, tied to a specific part.

- `backend/` — NestJS + PostgreSQL (Drizzle ORM) + Socket.IO
- `mobile/` — Expo / React Native (TypeScript)

---

## Run it locally (Mac)

### 1. Backend

```bash
cd backend
npm install
docker compose down -v        # only if you ran an older version — wipes just this project's DB
docker compose up -d          # Postgres on localhost:5433 (won't clash with other projects on 5432)
npm run db:push               # create/upgrade tables
npm run db:seed               # demo data — WIPES everything incl. real users; demo/dev only
# on a database with real users, use this instead to refresh categories safely:
npm run db:categories
npm run dev                   # API on http://0.0.0.0:3000/api
```

### 2. Mobile app

```bash
cd mobile
npx expo install              # installs new native modules at versions matching Expo SDK 57
npx expo start -c             # -c clears the bundler cache after big changes
```

With the Android emulator running, Expo opens the app on it automatically (or press `a`).

The app finds the API on the same machine that serves the Expo bundle, so it works
on the emulator **and** on a real phone on the same Wi-Fi with no config. To point
it somewhere else (staging/production), set `EXPO_PUBLIC_API_URL=https://…`.

### Demo accounts

| Email | Role | What to try |
|---|---|---|
| `buyer@slautohub.lk` | Buyer (Kasun) | Has a garage, 2 orders (one delivered → write a review), a chat, a wishlist |
| `seller@slautohub.lk` | Seller — Colombo Auto Hub | Has an order to ship, unread chat, listings |
| `kandy@slautohub.lk` | Seller — Kandy Motor Spares | |
| `lubecentre@slautohub.lk` | Seller — Lanka Lube Centre | |

Or just open the app — it starts in guest mode, no sign-in needed to browse.

---

## Features

**Home highlights (sale rail)**
- Sellers can put any listing on a timed **Flash Sale** (sale price + 24h / 3 / 7 / 14 days)
  from the product form. While it runs, the sale price is used everywhere — listings, cart,
  checkout — and it reverts automatically when the timer ends.
- Home shows an AliExpress-style horizontal rail with a live countdown. If no flash sale is
  running it falls back to **Hot Deals** (discounted "was" prices), then **Top Picks**
  (best sellers), then **New Arrivals** — so the slot is never empty.

**Assistant (chatbot)**
- Robot button on Home (and Account → Ask the assistant). Rule-based — no API key, no cost.
- Finds parts from plain language or part numbers ("brake pads for Axio 2016", "90915-10003",
  "wipers"), using your selected vehicle for fitment; tracks your orders; answers delivery,
  payment, returns and selling questions; shows today's deals.

**Buyers**
- Opens straight into browsing as a guest (no login wall). Sign-in is asked for only when
  adding to cart, buying, chatting, saving to wishlist or selling.
- Home: search (title, brand or part number), category shortcuts, 2-column product grid
  with discount / "Fits" / out-of-stock badges, filter & sort sheet (price, brand, top rated…).
- **Vehicle fitment**: pick "shopping for" vehicle (garage, popular models, or any
  make/model/year — works for guests too). Parts known not to fit are hidden, exact fits
  float to the top, and product pages say "Fits your Toyota Axio 2016" or warn it may not.
- Categories: rail + sub-category tiles with part counts, and category search.
- Product page: photo gallery, rating breakdown, verified-purchase reviews, specs,
  compatible vehicles, stock/warranty/delivery info, store card, **Add to cart** and
  **Buy now** (checks out just that item).
- Cart grouped by store (delivery Rs. 450 per store), stock warnings, quantity steppers.
- Checkout: address + district picker + delivery phone, **Cash on delivery**, order summary.
- Orders: status per store (Placed → Shipped → Delivered), cancel before shipping,
  write a review once delivered, buy again.
- Wishlist, My garage (default vehicle, chassis code), account page.

**Sellers (Seller Centre)**
- Any account can open a store (Account → Start selling, or "Buy & sell" at sign-up).
- Dashboard: total sales, units sold, orders to ship, unread chats, active & low-stock listings.
- **List a part**: up to 6 photos (camera or library, uploaded to the server), title, brand,
  part number, category, condition, price + "was" price, stock, warranty, description,
  and a fitment list (make / model / year range).
- My listings: edit, remove (soft-delete — past orders/chats keep working), low-stock flags.
- Orders: To ship / Shipped / Delivered / Cancelled tabs, delivery address + phone,
  mark shipped → delivered, cancel (restocks automatically).

**Chat — the core rule**
- Every conversation is pinned to one product ("Chatting about: Ceramic Front Brake Pads").
- Live over Socket.IO, unread badges on the Messages tab, seller inbox with Buying/Selling filter.
- **No off-platform contact**: every message (socket or REST) goes through
  `backend/src/common/contact-filter.ts`, which blocks Sri Lankan mobile numbers
  (any formatting, even spelled out), `+94` landlines, emails (incl. "name at gmail dot com"),
  links/domains, WhatsApp/Viber/Telegram/social handles, and "call me / deal directly" phrasing.
  A blocked message is never stored or delivered — only the sender sees it struck out.
  Part numbers like `90915-10003` or `04465-12592` are deliberately allowed.
- Chat payloads never include email, phone or account IDs — sellers see buyers as
  "Kasun P.", buyers see the store name.
- Delivery phone numbers go to the seller **only** on an order, for the courier.

---

## Tests

The API was exercised end-to-end against Postgres: 39 REST checks (guest gating,
category tree, fitment filter, verified reviews, wishlist, chat privacy/unread/filter,
stock-checked checkout, cancel & restock, seller dashboard/orders/status transitions,
store opening, photo upload, product create/edit/soft-delete) and 8 live-socket checks.

## Not built yet

- Online card payments (PayHere / Stripe) — checkout is Cash on delivery only
- Push notifications (new message, order shipped)
- Admin panel for verifying sellers and moderating listings
- Photos are stored on the API server's disk (`backend/uploads/`) — move to S3 + CloudFront for production
- Mobile-number OTP login and "Continue with Google"
