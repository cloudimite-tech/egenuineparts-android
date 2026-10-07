import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { products, stores } from '../db/schema';

// Hosts whose /p/<productId> and /s/<storeSlug> links may be shared in chat.
export function shareHosts() {
  const hosts = new Set(['genuineparts.lk', 'www.genuineparts.lk']);
  for (const h of [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, ...(process.env.SHARE_HOSTS ?? '').split(',')]) {
    if (h?.trim()) hosts.add(h.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase());
  }
  return hosts;
}

function isLocalDevHost(host: string) {
  // While developing on the Mac the app shares http://192.168.x.x:3000/p/… links.
  return !process.env.VERCEL && /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(host);
}

const LINK = /(?:https?:\/\/([a-z0-9.-]+(?::\d+)?)|genuineparts:\/\/)\/?(p|s)\/([A-Za-z0-9-]{2,80})\/?(?=[\s.,!?)]|$)/gi;

/**
 * Finds Genuine Parts.lk share links in a message and checks each one points
 * to a real, live product or store. Returns the text with valid links removed
 * (so the contact filter only judges the rest) — invalid look-alikes are left
 * in place and get blocked as ordinary links.
 */
export async function stripValidShareLinks(text: string) {
  const hosts = shareHosts();
  const found: { match: string; kind: 'p' | 's'; key: string }[] = [];
  for (const m of text.matchAll(LINK)) {
    const host = m[1]?.toLowerCase();
    if (host !== undefined && !hosts.has(host) && !isLocalDevHost(host)) continue;
    found.push({ match: m[0], kind: m[2].toLowerCase() as 'p' | 's', key: m[3] });
  }
  if (!found.length) return { text, links: 0 };

  const productIds = found.filter((f) => f.kind === 'p').map((f) => f.key);
  const slugs = found.filter((f) => f.kind === 's').map((f) => f.key.toLowerCase());
  const [liveProducts, liveStores] = await Promise.all([
    productIds.length
      ? db
          .select({ id: products.id })
          .from(products)
          .innerJoin(stores, eq(products.storeId, stores.id))
          .where(and(inArray(products.id, productIds), eq(products.isActive, true), eq(stores.status, 'APPROVED')))
      : [],
    slugs.length ? db.select({ slug: stores.slug }).from(stores).where(and(inArray(stores.slug, slugs), eq(stores.status, 'APPROVED'))) : [],
  ]);
  const okP = new Set(liveProducts.map((p) => p.id));
  const okS = new Set(liveStores.map((s) => s.slug));

  let out = text;
  let links = 0;
  for (const f of found) {
    if ((f.kind === 'p' && okP.has(f.key)) || (f.kind === 's' && okS.has(f.key.toLowerCase()))) {
      out = out.replace(f.match, ' ');
      links++;
    }
  }
  return { text: out, links };
}
