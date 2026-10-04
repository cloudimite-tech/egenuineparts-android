// One place that decides what a product costs right now.
type Priced = {
  price: string;
  currency?: string | null;
  compareAtPrice?: string | null;
  salePrice?: string | null;
  saleEndsAt?: Date | string | null;
};

export function isSaleActive(p: Priced, now = new Date()) {
  return (
    p.salePrice != null &&
    p.saleEndsAt != null &&
    new Date(p.saleEndsAt) > now &&
    Number(p.salePrice) > 0 &&
    Number(p.salePrice) < Number(p.price)
  );
}

export function effectivePrice(p: Priced) {
  return isSaleActive(p) ? String(p.salePrice) : String(p.price);
}

export function discountPct(p: { price: string; compareAtPrice?: string | null }) {
  const c = Number(p.compareAtPrice ?? 0);
  const n = Number(p.price);
  return c > n && c > 0 ? Math.round(((c - n) / c) * 100) : 0;
}

// Shape sent to the app:
//   price / compareAtPrice → what to display (sale-aware)
//   regularPrice / regularCompareAtPrice / salePrice / saleEndsAt → raw values
//   (the seller's edit form needs these)
export function presentPrice<T extends Priced>(p: T) {
  const active = isSaleActive(p);
  const regular = Number(p.price);
  const compare = p.compareAtPrice != null ? Number(p.compareAtPrice) : null;
  return {
    ...p,
    price: active ? String(p.salePrice) : String(p.price),
    compareAtPrice: active ? Math.max(regular, compare ?? 0).toFixed(2) : p.compareAtPrice ?? null,
    regularPrice: String(p.price),
    regularCompareAtPrice: p.compareAtPrice ?? null,
    salePrice: p.salePrice ?? null,
    saleEndsAt: active ? p.saleEndsAt : null,
    rawSaleEndsAt: p.saleEndsAt ?? null,
    onSale: active,
    currency: (p.currency ?? 'LKR') as Currency,
    // What this costs in rupees right now — used for totals, filters, sorting.
    priceLkr: toLkr(active ? String(p.salePrice) : String(p.price), p.currency),
  };
}

// ---- currency ----
export type Currency = 'LKR' | 'USD';

// LKR per 1 USD. Set USD_TO_LKR in the server environment and update it as
// the rate moves; checkout locks the current rate into each order line.
// ---------------------------------------------------------------------------
// USD → LKR exchange rate
// The live rate is fetched from free public APIs and cached for RATE_TTL.
// Set USD_TO_LKR in the environment only if you want to FORCE a fixed rate.
// ---------------------------------------------------------------------------
const RATE_TTL_MS = 6 * 60 * 60 * 1000; // refresh every 6 hours
const RETRY_AFTER_FAIL_MS = 10 * 60 * 1000; // don't hammer the APIs if they're down
const FALLBACK_RATE = 330; // used only if no live rate has ever been fetched

type RateSource = 'fixed' | 'live' | 'fallback';
const live: { rate: number | null; fetchedAt: number; lastAttempt: number } = {
  rate: null,
  fetchedAt: 0,
  lastAttempt: 0,
};
let inFlight: Promise<void> | null = null;

function fixedRate(): number | null {
  const r = Number(process.env.USD_TO_LKR);
  return process.env.USD_TO_LKR && Number.isFinite(r) && r > 0 ? r : null;
}

const SOURCES: { url: string; pick: (j: any) => unknown }[] = [
  { url: 'https://open.er-api.com/v6/latest/USD', pick: (j) => j?.rates?.LKR },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
    pick: (j) => j?.usd?.lkr,
  },
];

async function fetchLiveRate(): Promise<number | null> {
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const rate = Number(src.pick(await res.json()));
      // sanity check so a broken API can never set a silly price
      if (Number.isFinite(rate) && rate > 50 && rate < 5000) return Math.round(rate * 100) / 100;
    } catch {
      /* try the next source */
    }
  }
  return null;
}

/** Make sure we have a reasonably fresh rate. Cheap when cached. */
export function ensureFreshRate(): Promise<void> {
  if (fixedRate()) return Promise.resolve();
  const now = Date.now();
  const fresh = live.rate !== null && now - live.fetchedAt < RATE_TTL_MS;
  const coolingDown = now - live.lastAttempt < RETRY_AFTER_FAIL_MS;
  if (fresh || coolingDown) return Promise.resolve();
  if (!inFlight) {
    live.lastAttempt = now;
    inFlight = fetchLiveRate()
      .then((rate) => {
        if (rate) {
          live.rate = rate;
          live.fetchedAt = Date.now();
        } else {
          // eslint-disable-next-line no-console
          console.warn('[fx] could not fetch USD→LKR, using', live.rate ?? FALLBACK_RATE);
        }
      })
      .finally(() => (inFlight = null));
  }
  return inFlight;
}

export function rateInfo(): { rate: number; source: RateSource; updatedAt: string | null } {
  const fixed = fixedRate();
  if (fixed) return { rate: fixed, source: 'fixed', updatedAt: null };
  if (live.rate !== null) return { rate: live.rate, source: 'live', updatedAt: new Date(live.fetchedAt).toISOString() };
  return { rate: FALLBACK_RATE, source: 'fallback', updatedAt: null };
}

export function usdToLkr() {
  return rateInfo().rate;
}

export function rateFor(currency?: string | null) {
  return currency === 'USD' ? usdToLkr() : 1;
}

export function toLkr(amount: string | number, currency?: string | null) {
  return Math.round(Number(amount) * rateFor(currency) * 100) / 100;
}
