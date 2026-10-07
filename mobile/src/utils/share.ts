import { Share } from 'react-native';
import { SERVER_ORIGIN } from '../api/config';
import { formatPrice } from './format';

// Public share links. They open a preview page (WhatsApp/Facebook show the
// product card) with an "Open in the app" button, and are the only links
// allowed inside buyer–seller chat.
export const productLink = (id: string) => `${SERVER_ORIGIN}/p/${id}`;
export const storeLink = (slug: string) => `${SERVER_ORIGIN}/s/${slug}`;

export async function shareProduct(p: { id: string; title: string; price: string | number; currency?: string }) {
  const url = productLink(p.id);
  await Share.share({ message: `${p.title} – ${formatPrice(p.price, p.currency)} on Genuine Parts.lk\n${url}`, url, title: p.title }).catch(() => {});
}

export async function shareStore(s: { slug: string; name: string }) {
  const url = storeLink(s.slug);
  await Share.share({ message: `${s.name} on Genuine Parts.lk\n${url}`, url, title: s.name }).catch(() => {});
}

/** Genuine Parts.lk product/store links found in a chat message. */
export function findShareLinks(text: string): { kind: 'product' | 'store'; key: string }[] {
  const host = SERVER_ORIGIN.replace(/^https?:\/\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:https?://(?:${host}|(?:www\\.)?genuineparts\\.lk)|genuineparts:/)/(p|s)/([A-Za-z0-9-]{2,80})`, 'gi');
  const out: { kind: 'product' | 'store'; key: string }[] = [];
  for (const m of text.matchAll(re)) out.push({ kind: m[1].toLowerCase() === 'p' ? 'product' : 'store', key: m[2] });
  return out.slice(0, 3);
}
